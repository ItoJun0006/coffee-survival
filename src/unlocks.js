// 解放したキャラと、ゲームを起動した回数。遊んでいるブラウザに保存する
const STORAGE_KEY = 'coffee-survival.unlocks';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.unlocked)) return { unlocked: d.unlocked, launches: Number(d.launches) || 0 };
  } catch {
    // 保存領域が使えない・壊れているときは、何も解放していない状態から始める
  }
  return { unlocked: [], launches: 0 };
}

const data = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても、このページを開いている間は解放したまま遊べる
  }
}

export const isUnlocked = (id) => data.unlocked.includes(id);

// 新しく解放したときだけ true を返す
export function unlock(id) {
  if (isUnlocked(id)) return false;
  data.unlocked.push(id);
  save();
  return true;
}

// 起動するたびに 1 回呼び、今回が何回目かを返す
export function recordLaunch() {
  data.launches += 1;
  save();
  return data.launches;
}
