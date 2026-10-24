// 自分の記録（自己ベスト。仕様 001 の User Story 7・FR-062）。遊んでいるブラウザに保存する
//   time：最長生存時間（秒）、kills：1 回で倒した敵の最多数、level：最高到達レベル、clears：クリア回数
// 記録はキャラに関係なく 1 つにまとめる
const STORAGE_KEY = 'coffee-survival.records';

// 確認用の URL パラメータ（?weapons・?level・?boss・?unlockAll・?coins）を付けて開いたプレイは、記録に数えない
const params = new URLSearchParams(location.search);
const debugPlay = ['weapons', 'level', 'boss', 'unlockAll', 'coins'].some((k) => params.has(k));

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d) {
      const n = (v) => Math.max(0, Number(v) || 0);
      return { time: n(d.time), kills: n(d.kills), level: n(d.level), clears: n(d.clears) };
    }
  } catch {
    // 保存領域が使えない・壊れているときは、記録なしから始める
  }
  return { time: 0, kills: 0, level: 0, clears: 0 };
}

const data = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても（プライベートモードなど）、このページを開いている間は記録を覚えている
  }
}

// 今の記録。まだ 1 回も終えていなければ null（「記録なし」と出す）
export const records = () => (data.time > 0 || data.clears > 0 ? { ...data } : null);

// 1 回のプレイが終わったときに呼ぶ。比べる前の自己ベストと、項目ごとに更新したかを返す
export function recordResult({ time, kills, level, cleared }) {
  const before = { ...data };
  const updated = { time: time > data.time, kills: kills > data.kills, level: level > data.level };
  if (debugPlay) return { before, updated: { time: false, kills: false, level: false } };
  if (updated.time) data.time = time;
  if (updated.kills) data.kills = kills;
  if (updated.level) data.level = level;
  if (cleared) data.clears += 1;
  save();
  return { before, updated };
}
