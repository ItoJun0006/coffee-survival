import { CONFIG } from './config.js';
import { isUnlocked } from './progress.js';

const STORAGE_KEY = 'coffee-survival.character';

const cfg = CONFIG.characters;

// 品種 × 焙煎度のキャラ。性能は焙煎度の性能に品種の倍率を掛けたもの（仕様 016）。
// アラビカ（値段 0）は最初から使え、ほかの品種は豆コインで買って解放する
const round2 = (v) => Math.round(v * 100) / 100;
const varietyCharacter = (variety, roast) => ({
  id: `${variety.id}-${roast.id}`,
  name: `${variety.name} ${roast.name}`,
  variety,
  roast: {
    ...roast,
    speedRate: round2(roast.speedRate * variety.rates.speed),
    maxCaffeine: Math.round(roast.maxCaffeine * variety.rates.caffeine),
    damageRate: round2(roast.damageRate * variety.rates.damage),
    attackIntervalRate: round2(roast.attackIntervalRate * variety.rates.interval),
  },
  power: variety.power ? { id: variety.power, ...cfg.powers[variety.power] } : null,
  unlock: variety.price ? { group: variety.id, name: variety.name, price: variety.price, require: variety.require ?? null } : null,
});
const varietyGroups = cfg.varieties.map((variety) => cfg.roasts.map((roast) => varietyCharacter(variety, roast)));

// 選択画面に並べる全キャラ。1 段目に最初の品種（アラビカ）の 3 体と条件付きのキャラ、2 段目からほかの品種
// （浅煎り → 中煎り → 深煎り）を並べる。plannedTotal に足りない分は、まだ中身のない「？？？」のマスにする
const specialCharacters = cfg.specials.map((s) => ({
  ...s,
  power: null,
  unlock: { group: s.id, name: s.name, price: s.price, require: s.require },
}));
// 4 体目からの特別なキャラ（ピーベリーなど）は、品種のあと（最後の段）に並べる。新しいキャラは、品種を 1 つ外して空けたマスに入れる（仕様 016 FR-022）
const named = [...varietyGroups[0], ...specialCharacters.slice(0, 3), ...varietyGroups.slice(1).flat(), ...specialCharacters.slice(3)];
const placeholders = Array.from({ length: Math.max(0, cfg.plannedTotal - named.length) }, (_, i) => ({
  id: `placeholder-${i + 1}`,
  name: '？？？',
  placeholder: true,
  unlock: { text: cfg.placeholderUnlockText },
}));
export const CHARACTERS = [...named, ...placeholders];

// 品種のキャラ 3 体（浅煎り・中煎り・深煎り）
export const varietyMembers = (variety) => CHARACTERS.filter((c) => c.variety === variety);

// 選んで遊べるか（中身があり、最初から使えるか、買って解放済み）
export const isAvailable = (c) => !c.placeholder && (!c.unlock || isUnlocked(c.id));

// ---- 豆コインで買う（仕様 016 FR-014・FR-018） ----
// 品種は 3 体まとめて、特別なキャラは 1 体ずつ買う。条件（require）のある豆は、条件を満たして
// 「仕入れられる」ようになってから買える。仕入れられるかどうかは readyId の名前で保存する

export const readyId = (group) => `ready-${group}`;

// 一緒に買うキャラ（品種なら浅煎り・中煎り・深煎り、特別なキャラなら 1 体）
export const groupMembers = (c) => (c.variety ? varietyMembers(c.variety) : [c]);

export const canBuy = (c) => !!c.unlock?.price && (!c.unlock.require || isUnlocked(readyId(c.unlock.group)));

// 条件のある豆の一覧 { group, name, price, require }
export const CONDITIONS = [...cfg.varieties, ...cfg.specials].filter((x) => x.require).map((x) => ({
  group: x.id, name: x.name, price: x.price, require: x.require,
}));

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

// 選択画面に出す性能のバー。value は 0〜1 で、範囲（CONFIG.characters.statBars）に対する位置
const STAT_BARS = [
  { label: 'スピード', get: (r) => r.speedRate, range: cfg.statBars.speed },
  { label: '体力', get: (r) => r.maxCaffeine, range: cfg.statBars.caffeine },
  { label: 'パワー', get: (r) => r.damageRate, range: cfg.statBars.power },
  { label: '連射', get: (r) => 1 / r.attackIntervalRate, range: cfg.statBars.rapid },
];

// 成長するキャラは、Lv 1 の値（value）と、育ちきった値（grownValue）の両方を返す
export function statBars(character) {
  const r = character.roast;
  const scaled = (m) => ({ speedRate: r.speedRate * m, maxCaffeine: r.maxCaffeine * m, damageRate: r.damageRate * m, attackIntervalRate: r.attackIntervalRate / m });
  const g = character.growth;
  const pos = (v, min, max) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  return STAT_BARS.map(({ label, get, range: [min, max] }) => ({
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
