import { CONFIG } from '../config.js';
import { circle } from './max-fx.js';

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);

// 点 p と線分 (x1, y1)-(x2, y2) の距離
export function distToSegment(p, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / len2));
  return Math.hypot(p.x - (x1 + dx * t), p.y - (y1 + dy * t));
}

// 範囲アップで大きくなる設定の値。areaKeys を持つ攻撃は、その値も大きくなる
const AREA_KEYS = ['radius', 'bladeRadius', 'orbitRadius', 'width', 'maxRadius', 'thickness'];

// 攻撃の基底クラス。game は Game のインスタンス
export class Weapon {
  #baseConfig;
  #config = null;
  #configRate = null;
  #stats = null;
  #statsLevel = 0;
  #statsConfig = null;

  constructor(game, config) {
    this.game = game;
    this.#baseConfig = config;
    this.timer = 0;
    this.level = 1;
  }

  // 範囲アップの倍率をかけた設定。倍率が変わったときだけ作り直す
  get config() {
    const rate = this.game.areaRate;
    if (this.#configRate !== rate) {
      const c = { ...this.#baseConfig };
      for (const k of [...AREA_KEYS, ...(c.areaKeys ?? [])]) {
        if (typeof c[k] === 'number') c[k] *= rate;
      }
      this.#config = c;
      this.#configRate = rate;
    }
    return this.#config;
  }

  get name() {
    return this.config.name;
  }

  get desc() {
    return this.config.desc;
  }

  get isMax() {
    return this.level >= CONFIG.weaponLevels.max;
  }

  // MAX の見た目の案（A・B・C）。?maxVariant= があればそれを使う
  get maxVariant() {
    return this.game.debugMaxVariant ?? this.config.maxVisual?.variant ?? 'A';
  }

  // 強化の初期値。武器ごとに上書きする
  baseStats() {
    return {};
  }

  // 今の Lv までに受けた特別な強化をまとめたもの。upgrades を Lv の小さい順に重ねる。
  // キー名が Rate で終わる値はかけ算、それ以外は上書き。desc はカードの説明なので重ねない
  get stats() {
    const c = this.config;
    if (this.#stats && this.#statsLevel === this.level && this.#statsConfig === c) return this.#stats;
    const s = this.baseStats();
    const levels = Object.keys(c.upgrades ?? {}).map(Number).sort((a, b) => a - b);
    for (const lv of levels) {
      if (this.level < lv) continue;
      for (const [k, v] of Object.entries(c.upgrades[lv])) {
        if (k === 'desc') continue;
        if (k.endsWith('Rate')) s[k] = (s[k] ?? 1) * v;
        else s[k] = v;
      }
    }
    this.#applyCountRule(s);
    this.#stats = s;
    this.#statsLevel = this.level;
    this.#statsConfig = c;
    return s;
  }

  // 攻撃の数を変えるキャラ。ピーベリー（仕様 017）は数を 1 にし、本来の数 N を focusCount に残す（威力と間隔の上乗せに使う）。
  // こーひー3兄弟（仕様 018）は数を 3 倍にし、1 発の威力を multiDamage 倍にする。数のない武器は変えない
  #applyCountRule(s) {
    this.focusCount = 1;
    this.multiDamage = 1;
    const ch = this.game.character;
    if (!ch?.focus && !ch?.multi) return;
    const m = CONFIG.characters.multi;
    for (const k of CONFIG.characters.focus.countKeys) {
      const v = s[k];
      const n = Array.isArray(v) ? v.length : v;
      if (typeof n !== 'number' || n < 1) continue;
      if (ch.focus) {
        if (n <= 1) continue;
        this.focusCount = n;
        s[k] = Array.isArray(v) ? v.slice(0, 1) : 1;
      } else {
        s[k] = Array.isArray(v) ? v.flatMap((d) => [d - m.sideDeg, d, d + m.sideDeg]) : v * m.countRate;
        if ('spreadDeg' in s) s.spreadDeg = Math.max(s.spreadDeg, m.spreadDeg);
        this.multiDamage = m.damageRate;
      }
    }
  }

  // 共通の強化（ダメージ・間隔）を受けた回数。commonLevels がなければ Lv が 1 上がるごとに 1 回。
  // commonLevels がある武器も、限界突破した Lv 9 から先は Lv が上がるたびに受ける
  get commonUpgrades() {
    const { commonLevels } = this.config;
    if (!commonLevels) return this.level - 1;
    return commonLevels.filter((lv) => this.level >= lv).length + Math.max(0, this.level - CONFIG.weaponLevels.max);
  }

  // 次の Lv で変わることの説明。null なら攻撃の説明をそのまま使う
  upgradeDesc(nextLevel) {
    return this.config.upgrades?.[nextLevel]?.desc ?? this.config.commonDesc ?? null;
  }

  // 強化によるダメージの倍率（Lv 1 で 1 倍）
  get damageRate() {
    // ピーベリーは 1 つにした数の分だけ威力を上乗せし（仕様 017）、こーひー3兄弟は 1 発を弱くする（仕様 018）
    const focus = this.stats && this.focusCount > 1 ? this.focusCount ** CONFIG.characters.focus.damageExp : 1;
    return (1 + CONFIG.weaponLevels.damagePerLevel * this.commonUpgrades) * focus * (this.multiDamage ?? 1);
  }

  // 攻撃の間隔の倍率。キャラの倍率・強化の段階・発生頻度アップで縮む。ただし下限がある
  get intervalRate() {
    return Math.max(CONFIG.weaponLevels.minIntervalRate, this.rawIntervalRate());
  }

  // 下限をかける前の、攻撃の間隔の倍率。限界突破で Lv の強化が 1 以上になっても 0 以下にならないよう、levelFloor で止める。
  // upgrades を渡すと、共通の強化をその回数までとして計算する
  rawIntervalRate(upgrades = this.commonUpgrades) {
    const { intervalPerLevel, levelFloor } = CONFIG.weaponLevels;
    const levelRate = Math.max(levelFloor, 1 - intervalPerLevel * upgrades);
    const focus = this.stats && this.focusCount > 1 ? this.focusCount ** -CONFIG.characters.focus.intervalExp : 1;
    return this.game.attackIntervalRate * levelRate * this.game.frequencyRate * focus;
  }

  // 間隔の強化が下限からあふれた割合（あふれていなければ 0。下限の 0.2 倍ぶん短くなるはずなら 0.25）。
  // 限界突破（Lv 9 から）の共通の強化は数えない（限界突破の強さは、武器ごとの決まりで足す）
  get intervalOverflow() {
    const upgrades = Math.min(this.commonUpgrades, CONFIG.weaponLevels.max - 1);
    return Math.max(0, CONFIG.weaponLevels.minIntervalRate / this.rawIntervalRate(upgrades) - 1);
  }

  // 発動間隔が経過していれば true。発動したら this.timer = 0 に戻す
  tick(dt) {
    this.timer += dt;
    return this.timer >= this.config.intervalSec * this.intervalRate;
  }

  // element を省略したら攻撃の属性で当てる
  hit(target, damage = this.config.damage, element = this.config.element) {
    this.game.dealDamage(target, damage * this.damageRate, element);
  }

  update() {}

  // 敵より下に描くもの（床に広がる範囲など）
  drawBelow() {}

  draw() {}

  // Lv 2・4・6 で上がる見た目の段階（1〜3）。Lv 1 と MAX は 0（MAX は武器ごとの MAX の見た目で描く）
  get visualTier() {
    if (this.isMax) return 0;
    return CONFIG.weaponLevelVisual.tiers.filter((lv) => this.level >= lv).length;
  }

  // 段階の見た目を重ねる目印：{ x, y, r（はっきりした部分の半径）, k（濃さ 0〜1。省略で 1）}。武器ごとに上書きする
  levelSpots() {
    return [];
  }

  // true なら段階の見た目を敵より下に描く（床に広がる攻撃）
  get levelFxBelow() {
    return false;
  }

  // 段階の見た目：目印の縁（当たる範囲の内側）に、属性の色の光る線。below は敵より下の描画のときに true
  drawLevelFx(ctx, below) {
    const tier = this.visualTier;
    if (!tier || below !== this.levelFxBelow) return;
    const v = CONFIG.weaponLevelVisual;
    const i = tier - 1;
    ctx.save();
    // levelColors を持つ武器は、属性の色の代わりにその色を使う
    ctx.strokeStyle = (this.config.levelColors ?? v.colors[this.config.element] ?? v.colors.none)[i];
    for (const s of this.levelSpots()) {
      const w = Math.min(v.width[i], s.r);
      ctx.globalAlpha = v.alpha[i] * (s.k ?? 1);
      ctx.lineWidth = w;
      circle(ctx, s.x, s.y, s.r - w / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 同じ相手には cooldownSec ごとに 1 回だけ当たる
export class HitTracker {
  constructor(cooldownSec) {
    this.cooldownSec = cooldownSec;
    this.last = new WeakMap();
  }

  tryHit(target, now) {
    const t = this.last.get(target);
    if (t !== undefined && now - t < this.cooldownSec) return false;
    this.last.set(target, now);
    return true;
  }
}

// まっすぐ飛ぶ弾。range だけ進むと消える
export class Projectile {
  constructor(x, y, angle, speed, radius, range) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = radius;
    this.remaining = range;
    this.spent = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.remaining -= Math.hypot(this.vx, this.vy) * dt;
    if (this.remaining <= 0) this.spent = true;
  }
}
