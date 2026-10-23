// 動作確認のテスト（バックログ B012）。ゲームをヘッドレスのブラウザで開き、いつもの流れを順に試す。
// ゲームは ?test を付けて開き、window.game（src/main.js）から今の画面（state）などを見る。
// 使い方：tests フォルダで npm install → npm run setup（初回だけ。ブラウザを入れる）→ npm test
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

// ---- ゲームのファイルを配る小さなサーバー（python がなくても動くように Node だけで作る） ----

function startServer() {
  const server = http.createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    try {
      const body = await readFile(join(ROOT, path || 'index.html'));
      res.writeHead(200, { 'Content-Type': TYPES[extname(path || 'index.html')] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---- テストの道具 ----

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 条件がそろうまで待つ。そろわなければ、何を待っていたかを書いて失敗にする
async function waitFor(page, fn, what, arg, timeout = 5000) {
  try {
    await page.waitForFunction(fn, arg, { timeout });
  } catch {
    const state = await page.evaluate(() => window.game?.state).catch(() => '?');
    throw new Error(`${what}にならなかった（今の画面：${state}）`);
  }
}
const waitState = (page, state) => waitFor(page, (s) => window.game?.state === s, `画面が「${state}」`, state);
const state = (page) => page.evaluate(() => window.game.state);
const press = async (page, key) => {
  await page.keyboard.press(key);
  await wait(80);
};

// 新しいページでゲームを開く。コンソールのエラーとページのエラーを集めておく
async function open(browser, base, query = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') page.errors.push(m.text());
  });
  await page.goto(`${base}/index.html?test${query}`);
  await waitState(page, 'title');
  return page;
}

// タイトル → キャラ選択 → 最初の攻撃選び → プレイ中 まで進める
async function startPlay(page) {
  await press(page, 'Space');
  await waitState(page, 'select');
  await press(page, 'Space');
  await waitState(page, 'start');
  // 最初の攻撃選びは、開いてすぐは押しても受け付けない（仕様 032 の startGuardMs）
  await wait(500);
  await press(page, 'Digit1');
  await waitState(page, 'playing');
}

// ---- テストの中身 ----

const TESTS = [
  ['起動するとタイトル画面が出る', async (page) => {
    if ((await state(page)) !== 'title') throw new Error('タイトル画面ではない');
  }],

  ['タイトル → キャラ選択 → 最初の攻撃選び → プレイ', async (page) => {
    await startPlay(page);
    const w = await page.evaluate(() => window.game.weapons.length);
    if (w !== 1) throw new Error(`最初の攻撃の数が 1 ではない（${w}）`);
    await waitFor(page, () => window.game.time > 1, '時間が 1 秒以上進んだ状態');
  }],

  ['ポーズすると時間が止まり、もう一度押すと再開する', async (page) => {
    await startPlay(page);
    await press(page, 'Escape');
    await waitState(page, 'paused');
    const t1 = await page.evaluate(() => window.game.time);
    await wait(500);
    const t2 = await page.evaluate(() => window.game.time);
    if (t1 !== t2) throw new Error('ポーズ中に時間が進んだ');
    await press(page, 'Escape');
    await waitState(page, 'playing');
  }],

  ['ポーズメニューの「タイトルへ戻る」でタイトルに戻る', async (page) => {
    await startPlay(page);
    await press(page, 'Escape');
    await waitState(page, 'paused');
    await press(page, 'ArrowDown');
    await press(page, 'ArrowDown');
    await press(page, 'Space');
    await waitState(page, 'title');
  }],

  ['ゲームオーバーからやり直せる', async (page) => {
    await startPlay(page);
    await page.evaluate(() => { window.game.player.caffeine = 0; });
    await waitState(page, 'gameover');
    // 豆コインの数え上げを飛ばしてから、やり直す
    await press(page, 'Space');
    await press(page, 'Space');
    await waitState(page, 'start');
    const t = await page.evaluate(() => window.game.time);
    if (t > 1) throw new Error(`やり直したのに時間が 0 に戻っていない（${t}）`);
  }],

  ['豆コインでキャラ（品種）を買える', async (page) => {
    await press(page, 'Space');
    await waitState(page, 'select');
    // 条件なしで買えて、まだ解放していないキャラを探して選ぶ
    const found = await page.evaluate(async () => {
      const ch = await import('./src/characters.js');
      const prog = await import('./src/progress.js');
      const i = ch.CHARACTERS.findIndex((c) => ch.canBuy(c) && !ch.isAvailable(c) && c.unlock.price <= prog.coins());
      if (i < 0) return null;
      window.game.characterSelect.index = i;
      return { name: ch.CHARACTERS[i].unlock.name, before: prog.coins() };
    });
    if (!found) throw new Error('買えるキャラが見つからない');
    await press(page, 'Space'); // 買うメニューを開く
    await press(page, 'Space'); // 最初から選ばれている「注文する」を押す
    const after = await page.evaluate(async () => {
      const ch = await import('./src/characters.js');
      const prog = await import('./src/progress.js');
      return { coins: prog.coins(), available: ch.isAvailable(window.game.characterSelect.selected) };
    });
    if (!(after.coins < found.before)) throw new Error(`豆コインが減っていない（${found.before} → ${after.coins}）`);
    if (!after.available) throw new Error(`${found.name} が使えるようになっていない`);
  }, '&coins=500'],

  ['1 面をクリアして、E キーでエクストラステージに進める', async (page) => {
    await startPlay(page);
    await waitFor(page, () => !!window.game.boss, 'ボスが出た状態', undefined, 8000);
    await page.evaluate(() => { window.game.boss.hp = 0; });
    await waitState(page, 'clear');
    await press(page, 'KeyE');
    await waitState(page, 'carry');
    await wait(500);
    await press(page, 'Digit1');
    await waitState(page, 'playing');
    const id = await page.evaluate(async () => (await import('./src/stage.js')).stage.id);
    if (id !== 'extra') throw new Error(`エクストラステージになっていない（${id}）`);
  }, '&boss'],
];

// ---- 実行 ----

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failed = 0;
for (const [name, run, query] of TESTS) {
  const page = await open(browser, base, query).catch((e) => ({ openError: e }));
  try {
    if (page.openError) throw page.openError;
    await run(page);
    if (page.errors.length) throw new Error(`コンソールにエラー：${page.errors.join(' / ')}`);
    console.log(`○ ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`× ${name}\n    ${e.message}`);
  } finally {
    if (!page.openError) await page.close();
  }
}
await browser.close();
server.close();
console.log(failed ? `\n${failed} 個 失敗（全部で ${TESTS.length} 個）` : `\n全部 OK（${TESTS.length} 個）`);
process.exit(failed ? 1 : 0);
