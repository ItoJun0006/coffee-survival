// 遊んだ記録（ポイントカード）と、解放したキャラ。遊んでいるブラウザに保存する
//   unlocked：解放したキャラの id、launches：起動した回数、plays：プレイ回数、playSec：累計プレイ時間（秒）、
//   distance：累計移動距離（ピクセル）、kills：累計撃破数。distance と kills は画面には出さず、解放条件に使う
const STORAGE_KEY = 'coffee-survival.unlocks';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.unlocked)) {
      const n = (v) => Number(v) || 0;
      return { unlocked: d.unlocked, launches: n(d.launches), plays: n(d.plays), playSec: n(d.playSec), distance: n(d.distance), kills: n(d.kills) };
    }
  } catch {
    // 保存領域が使えない・壊れているときは、何もない状態から始める
  }
  return { unlocked: [], launches: 0, plays: 0, playSec: 0, distance: 0, kills: 0 };
}

const data = load();

export function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても、このページを開いている間は記録したまま遊べる
  }
}

// ページを閉じるときにも、まだ保存していないプレイ時間を残す
window.addEventListener('pagehide', saveProgress);

export const isUnlocked = (id) => data.unlocked.includes(id);

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

// 動いた距離（ピクセル）と倒した敵の数を足す。保存はまとめて saveProgress() で行う
export function addDistance(px) {
  data.distance += px;
}

export function addKills(n) {
  data.kills += n;
}

export const pointCard = () => ({ plays: data.plays, playSec: data.playSec, distance: data.distance, kills: data.kills });
