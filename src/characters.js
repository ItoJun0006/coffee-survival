import { CONFIG } from './config.js';

const STORAGE_KEY = 'coffee-survival.character';

// 品種 × 焙煎度の全キャラ。並び順は品種ごとに 浅煎り → 中煎り → 深煎り
export const CHARACTERS = CONFIG.characters.varieties.flatMap((variety) =>
  CONFIG.characters.roasts.map((roast) => ({
    id: `${variety.id}-${roast.id}`,
    name: `${variety.name} ${roast.name}`,
    variety,
    roast,
    unlocked: variety.unlocked,
  })),
);

export const findCharacter = (id) => CHARACTERS.find((c) => c.id === id && c.unlocked);

// 前回選んだキャラ。保存できないブラウザや、使えないキャラだったときは既定のキャラ
export function loadLastCharacter() {
  let id = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    // 保存領域が使えなくても遊べるようにする
  }
  return findCharacter(id) ?? findCharacter(CONFIG.characters.defaultId);
}

export function saveLastCharacter(character) {
  try {
    localStorage.setItem(STORAGE_KEY, character.id);
  } catch {
    // 同上
  }
}

// 選択画面に出す性能のバー。value は 0〜1 で、min〜max の範囲に対する位置
const STAT_BARS = [
  { label: 'スピード', get: (r) => r.speedRate, min: 0.6, max: 1.5 },
  { label: '体力', get: (r) => r.maxCaffeine, min: 50, max: 150 },
  { label: 'パワー', get: (r) => r.damageRate, min: 0.5, max: 1.75 },
  { label: '連射', get: (r) => 1 / r.attackIntervalRate, min: 0.5, max: 1.5 },
];

export function statBars(character) {
  return STAT_BARS.map(({ label, get, min, max }) => ({
    label,
    value: Math.min(1, Math.max(0, (get(character.roast) - min) / (max - min))),
  }));
}

// 性能の数値（選択画面の説明用）
export function describeStats(character) {
  const r = character.roast;
  return `移動 ×${r.speedRate}・カフェイン上限 ${r.maxCaffeine}・攻撃力 ×${r.damageRate}・攻撃間隔 ×${r.attackIntervalRate}`;
}
