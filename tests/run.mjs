// 珈琲サバイバルの動作確認（バックログ B012）。ゲームを画面なしのブラウザ（ヘッドレス Chromium）で開き、
// いつもの操作と主な機能が動くこと、コンソールにエラーが出ないことを確かめる。
//   使い方：npm --prefix tests install（初回だけ）→ npm --prefix tests test
//   ブラウザが入っていないときは：npx --prefix tests playwright install chromium
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

// リポジトリをそのまま配る簡単なサーバー（python3 -m http.server の代わり）
function serve() {
  const server = createServer(async (req, res) => {
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
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const server = await serve();
const BASE = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const results = [];

// 1 つの確認ごとに、記録の残っていない新しいブラウザで開く。テストのときだけ、ゲームを window.__g から触れるようにする
async function open(query = '') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/src/main.js', async (route) => {
    const r = await route.fetch();
    const body = (await r.text()).replace('new Game(canvas).start();', 'window.__g = new Game(canvas); window.__g.start();');
    route.fulfill({ response: r, body });
  });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__g);
  await page.waitForTimeout(500);
  const g = (fn, arg) => page.evaluate(fn, arg);
  const state = () => g(() => window.__g.state);
  const press = async (key, wait = 250) => { await page.keyboard.press(key); await page.waitForTimeout(wait); };
  return { context, page, errors, g, state, press };
}

// タイトル → キャラ選択 → 最初の攻撃（3 枚から 1 枚）→ プレイ
async function startPlay(t) {
  await t.page.mouse.click(640, 400);
  await t.page.waitForTimeout(300);
  await t.press('Space', 1500);
  if ((await t.state()) === 'start') await t.press('Space', 500);
}

async function check(name, fn) {
  let t;
  try {
    const detail = await fn((q) => open(q).then((x) => (t = x)));
    if (t?.errors.length) throw new Error(`コンソールのエラー：${t.errors[0]}`);
    results.push({ name, ok: true, detail });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  } finally {
    await t?.context.close();
  }
}

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

await check('起動するとタイトル画面が出る', async (open) => {
  const t = await open();
  expect((await t.state()) === 'title', `タイトルではなく ${await t.state()}`);
});

await check('キャラ選択 → 最初の攻撃を選ぶ → プレイが始まる', async (open) => {
  const t = await open();
  await t.page.mouse.click(640, 400);
  await t.page.waitForTimeout(300);
  expect((await t.state()) === 'select', 'キャラ選択に進まない');
  await t.press('Space', 1500);
  expect((await t.state()) === 'start', '最初の攻撃を選ぶ画面が出ない');
  await t.press('Space', 500);
  expect((await t.state()) === 'playing', 'プレイが始まらない');
  const weapons = await t.g(() => window.__g.weapons.map((w) => w.name));
  expect(weapons.length === 1, `最初の攻撃が 1 つではない（${weapons.join('・')}）`);
  return weapons[0];
});

await check('WASD と矢印キーで動く', async (open) => {
  const t = await open();
  await startPlay(t);
  const x = () => t.g(() => window.__g.player.x);
  const y = () => t.g(() => window.__g.player.y);
  const x0 = await x();
  await t.page.keyboard.down('KeyD'); await t.page.waitForTimeout(500); await t.page.keyboard.up('KeyD');
  const x1 = await x();
  const y0 = await y();
  await t.page.keyboard.down('ArrowUp'); await t.page.waitForTimeout(500); await t.page.keyboard.up('ArrowUp');
  const y1 = await y();
  expect(x1 > x0 + 20, 'D で右に動かない');
  expect(y1 < y0 - 20, '↑ で上に動かない');
});

await check('Esc と P でポーズ・再開できる', async (open) => {
  const t = await open();
  await startPlay(t);
  await t.press('Escape');
  expect((await t.state()) === 'paused', 'Esc でポーズにならない');
  await t.press('Escape');
  expect((await t.state()) === 'playing', 'Esc で再開しない');
  await t.press('KeyP');
  expect((await t.state()) === 'paused', 'P でポーズにならない');
  await t.press('KeyP');
  expect((await t.state()) === 'playing', 'P で再開しない');
});

await check('やられたあと、結果画面からやり直せる', async (open) => {
  const t = await open();
  await startPlay(t);
  await t.g(() => { window.__g.player.caffeine = 0; });
  await t.page.waitForTimeout(500);
  expect((await t.state()) === 'gameover', 'やられても結果画面にならない');
  // 1 回目のクリックは豆コインの数え上げを飛ばし、2 回目でやり直す
  await t.page.mouse.click(640, 400); await t.page.waitForTimeout(300);
  await t.page.mouse.click(640, 400); await t.page.waitForTimeout(800);
  if ((await t.state()) === 'start') await t.press('Space', 500);
  expect((await t.state()) === 'playing', `やり直せない（${await t.state()}）`);
});

await check('自分の記録が保存され、開き直すとタイトルに出る', async (open) => {
  const t = await open();
  await startPlay(t);
  await t.g(() => { const g = window.__g; g.time = 200; g.runKills = 50; g.level = 7; g.player.caffeine = 0; });
  await t.page.waitForTimeout(500);
  const saved = await t.g(() => JSON.parse(localStorage.getItem('coffee-survival.records')));
  expect(saved && saved.kills === 50 && saved.level === 7, `記録が保存されない（${JSON.stringify(saved)}）`);
  await t.page.reload();
  await t.page.waitForFunction(() => window.__g);
  const shown = await t.g(async () => (await import('/src/records.js')).records());
  expect(shown?.kills === 50, '開き直すと記録が消えている');
});

await check('豆コインでキャラを買える（?coins=500）', async (open) => {
  const t = await open('?coins=500');
  const target = await t.g(async () => {
    const { CHARACTERS, canBuy, isAvailable } = await import('/src/characters.js');
    const i = CHARACTERS.findIndex((c) => !isAvailable(c) && canBuy(c) && c.unlock.price <= 500);
    return i < 0 ? null : { i, id: CHARACTERS[i].id, price: CHARACTERS[i].unlock.price };
  });
  expect(target, '500 枚で買えるキャラが見つからない');
  await t.page.mouse.click(640, 400); await t.page.waitForTimeout(300);
  await t.g((i) => { window.__g.characterSelect.index = i; }, target.i);
  await t.press('Space');
  await t.press('Space');
  const after = await t.g(async (id) => {
    const { isUnlocked, coins } = await import('/src/progress.js');
    return { unlocked: isUnlocked(id), coins: coins() };
  }, target.id);
  expect(after.unlocked, '買ったキャラが解放されない');
  expect(after.coins === 500 - target.price, `豆コインの減り方がおかしい（残り ${after.coins}）`);
  return `${target.id}（${target.price} 枚）`;
});

await check('ボスを倒すとクリアになり、E でエクストラステージに進める', async (open) => {
  const t = await open();
  await startPlay(t);
  await t.g(async () => {
    const g = window.__g;
    const { Boss } = await import('/src/entities/boss.js');
    g.boss = new Boss(g.player.x + 300, g.player.y);
    g.boss.hp = 0;
  });
  await t.page.waitForTimeout(500);
  expect((await t.state()) === 'clear', 'ボスを倒してもクリアにならない');
  await t.press('KeyE', 500);
  expect((await t.state()) === 'carry', '持っていく攻撃を選ぶ画面が出ない');
  await t.press('Space', 800);
  const stage = await t.g(async () => (await import('/src/stage.js')).stage.id);
  expect(stage === 'extra' && (await t.state()) === 'playing', `エクストラステージが始まらない（${stage}・${await t.state()}）`);
});

await check('MAX の武器 2 つずつで 5 秒遊んでもエラーが出ない', async (open) => {
  for (const set of ['mill:8,mug:8', 'shockwave:8,drip:8', 'steam:8,puddle:8', 'espresso:8,ice:8']) {
    const t = await open(`?weapons=${set}`);
    await startPlay(t);
    await t.page.waitForTimeout(5000);
    const s = await t.state();
    expect(['playing', 'levelup'].includes(s), `${set}：プレイが続かない（${s}）`);
    if (t.errors.length) throw new Error(`${set}：${t.errors[0]}`);
    await t.context.close();
  }
});

await browser.close();
server.close();

for (const r of results) console.log(`${r.ok ? '〇' : '✕'} ${r.name}${r.detail ? `：${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} 件うまくいかなかった` : `\nすべて通った（${results.length} 件）`);
process.exit(failed ? 1 : 0);
