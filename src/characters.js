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

// 性能の説明文（選択画面用）
export function describeStats(character) {
  const r = character.roast;
  const lines = [];
  if (r.speedRate > 1) lines.push('移動が速い');
  if (r.speedRate < 1) lines.push('移動が少し遅い');
  if (r.maxCaffeine < CONFIG.player.maxCaffeine) lines.push('カフェイン上限が少し低い');
  if (r.damageRate > 1) lines.push('攻撃力が高い');
  return lines.length ? lines : ['クセのない標準性能'];
}
