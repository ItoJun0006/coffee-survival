import { CONFIG } from './config.js';
import { isUnlocked } from './progress.js';

const STORAGE_KEY = 'coffee-survival.character';

const cfg = CONFIG.characters;

// 選択画面に並べる全キャラ。品種 × 焙煎度（浅煎り → 中煎り → 深煎り）、条件付きのキャラ、
// まだ中身のない「？？？」のマスの順に、plannedTotal 個まで並べる
const varietyCharacters = cfg.varieties.flatMap((variety) =>
  cfg.roasts.map((roast) => ({
    id: `${variety.id}-${roast.id}`,
    name: `${variety.name} ${roast.name}`,
    variety,
    roast,
    unlock: variety.unlocked ? null : { text: cfg.placeholderUnlockText },
  })),
);
const specialCharacters = cfg.specials.map((s) => ({ ...s }));
const named = [...varietyCharacters, ...specialCharacters];
const placeholders = Array.from({ length: Math.max(0, cfg.plannedTotal - named.length) }, (_, i) => ({
  id: `placeholder-${i + 1}`,
  name: '？？？',
  placeholder: true,
  unlock: { text: cfg.placeholderUnlockText },
}));
export const CHARACTERS = [...named, ...placeholders];

// 選んで遊べるか（中身があり、条件がないか、条件を満たして解放済み）
export const isAvailable = (c) => !c.placeholder && (!c.unlock || isUnlocked(c.id));

export const findCharacter = (id) => CHARACTERS.find((c) => c.id === id && isAvailable(c));

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

// スキン「椿」（仕様 010）。実績「椿三輪」を解除したあと、アラビカだけに付けられる。付けているかどうかを保存する
const SKIN_KEY = 'coffee-survival.skin';
let skinOn = false;
try {
  skinOn = localStorage.getItem(SKIN_KEY) === 'camellia';
} catch {
  // 保存領域が使えなくても遊べるようにする
}

export const canWearSkin = (c) => !!c && c.variety?.id === CONFIG.camellia.skin.variety && isUnlocked(CONFIG.camellia.achievement.id);

export const wearsSkin = (c) => skinOn && canWearSkin(c);

export function toggleSkin() {
  skinOn = !skinOn;
  try {
    localStorage.setItem(SKIN_KEY, skinOn ? 'camellia' : '');
  } catch {
    // 同上
  }
}

// 選択画面に出す性能のバー。value は 0〜1 で、min〜max の範囲に対する位置
const STAT_BARS = [
  { label: 'スピード', get: (r) => r.speedRate, min: 0.6, max: 1.5 },
  { label: '体力', get: (r) => r.maxCaffeine, min: 50, max: 200 },
  { label: 'パワー', get: (r) => r.damageRate, min: 0.5, max: 1.75 },
  { label: '連射', get: (r) => 1 / r.attackIntervalRate, min: 0.5, max: 1.5 },
];

// 成長するキャラは、Lv 1 の値（value）と、育ちきった値（grownValue）の両方を返す
export function statBars(character) {
  const r = character.roast;
  const scaled = (m) => ({ speedRate: r.speedRate * m, maxCaffeine: r.maxCaffeine * m, damageRate: r.damageRate * m, attackIntervalRate: r.attackIntervalRate / m });
  const g = character.growth;
  const pos = (v, min, max) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  return STAT_BARS.map(({ label, get, min, max }) => ({
    label,
    value: pos(get(scaled(g ? g.from : 1)), min, max),
    grownValue: g ? pos(get(scaled(g.to)), min, max) : null,
  }));
}

// 性能の説明（選択画面用）。1 行ずつの配列で返す
export function describeStats(character) {
  const r = character.roast;
  const g = character.growth;
  if (g) {
    return [`Lv 1 は中煎りの ${g.from} 倍の性能。`, 'レベルが上がるほど強くなり、', `Lv ${g.maxLevel} で ${g.to} 倍になる`];
  }
  const lines = [`移動 ×${r.speedRate}　カフェイン上限 ${r.maxCaffeine}`, `攻撃力 ×${r.damageRate}　攻撃間隔 ×${r.attackIntervalRate}`];
  if (character.startWeapon) lines.push(`最初の武器：${CONFIG.weapons[character.startWeapon].name}`);
  return lines;
}
