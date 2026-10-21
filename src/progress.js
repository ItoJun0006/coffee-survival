// 遊んだ記録（ポイントカード）と、解放したキャラ。遊んでいるブラウザに保存する
//   unlocked：解放したキャラの id、launches：起動した回数、plays：プレイ回数、playSec：累計プレイ時間（秒）、
//   distance：累計移動距離（ピクセル）、kills：累計撃破数、beans：累計の拾った豆（偽物は除く）。
//   distance・kills・beans は画面には出さず、解放条件に使う。coins：今持っている豆コイン（仕様 016）
const STORAGE_KEY = 'coffee-survival.unlocks';

// 動作確認用（仕様 016）：?unlockAll を付けて開くと、すべてのキャラを解放済みとして扱う。
// ?coins=N を付けて開くと、豆コインを N 枚持った状態で始まる。どちらのときも、記録は保存しない
const params = new URLSearchParams(location.search);
const debugUnlockAll = params.has('unlockAll');
const debugCoins = params.has('coins') ? Math.max(0, Math.floor(Number(params.get('coins')) || 0)) : null;
const noSave = debugUnlockAll || debugCoins !== null;

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.unlocked)) {
      const n = (v) => Number(v) || 0;
      return { unlocked: d.unlocked, launches: n(d.launches), plays: n(d.plays), playSec: n(d.playSec), distance: n(d.distance), kills: n(d.kills), beans: n(d.beans), coins: n(d.coins) };
    }
  } catch {
    // 保存領域が使えない・壊れているときは、何もない状態から始める
  }
  return { unlocked: [], launches: 0, plays: 0, playSec: 0, distance: 0, kills: 0, beans: 0, coins: 0 };
}

const data = load();
if (debugCoins !== null) data.coins = debugCoins;

export function saveProgress() {
  if (noSave) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても、このページを開いている間は記録したまま遊べる
  }
}

// ページを閉じるときにも、まだ保存していないプレイ時間を残す
window.addEventListener('pagehide', saveProgress);

export const isUnlocked = (id) => debugUnlockAll || data.unlocked.includes(id);

// 新しく解放したときだけ true を返す
export function unlock(id) {
  if (isUnlocked(id)) return false;
  data.unlocked.push(id);
  saveProgress();
  return true;
}

// 起動するたびに 1 回呼び、今回が何回目かを返す
export function recordLaunch() {
  data.launches += 1;
  saveProgress();
  return data.launches;
}

// ゲームを始めるたびに 1 回呼び、今回が何回目のプレイかを返す
export function recordPlay() {
  data.plays += 1;
  saveProgress();
  return data.plays;
}

// 遊んだ時間を足し、累計（秒）を返す。保存はまとめて saveProgress() で行う
export function addPlayTime(sec) {
  data.playSec += sec;
  return data.playSec;
}

// 動いた距離（ピクセル）・倒した敵の数・拾った豆の数を足す。保存はまとめて saveProgress() で行う
export function addDistance(px) {
  data.distance += px;
}

export function addKills(n) {
  data.kills += n;
}

export function addBeans(n) {
  data.beans += n;
}

export const pointCard = () => ({ plays: data.plays, playSec: data.playSec, distance: data.distance, kills: data.kills, beans: data.beans });

// ---- 豆コイン（仕様 016） ----

export const coins = () => data.coins;

// 1 回のプレイが終わったときに足す
export function addCoins(n) {
  data.coins += n;
  saveProgress();
}

// 品種を買う：値段が足りていれば、その品種のキャラ（ids）をまとめて解放し、true を返す
export function buyVariety(ids, price) {
  if (data.coins < price) return false;
  data.coins -= price;
  for (const id of ids) if (!data.unlocked.includes(id)) data.unlocked.push(id);
  saveProgress();
  return true;
}
