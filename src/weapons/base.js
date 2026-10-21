import { CONFIG } from '../config.js';
import { drawGlow, drawWisps, hash, circle } from './max-fx.js';

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
    this.#stats = s;
    this.#statsLevel = this.level;
    this.#statsConfig = c;
    return s;
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
    return 1 + CONFIG.weaponLevels.damagePerLevel * this.commonUpgrades;
  }

  // 攻撃の間隔の倍率。キャラの倍率・強化の段階・発生頻度アップで縮む。ただし下限がある
  get intervalRate() {
    const { intervalPerLevel, minIntervalRate } = CONFIG.weaponLevels;
    const levelRate = 1 - intervalPerLevel * this.commonUpgrades;
    return Math.max(minIntervalRate, this.game.attackIntervalRate * levelRate * this.game.frequencyRate);
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

  // 段階の見た目の案（A・B・C）。?levelVariant= があればそれを使う
  get levelVariant() {
    return this.game.debugLevelVariant ?? CONFIG.weaponLevelVisual.variant;
  }

  // 段階の見た目を重ねる目印：{ x, y, r（はっきりした部分の半径）, k（濃さ 0〜1。省略で 1）, seed }。武器ごとに上書きする
  levelSpots() {
    return [];
  }

  // true なら段階の見た目を敵より下に描く（床に広がる攻撃）
  get levelFxBelow() {
    return false;
  }

  // 段階の見た目。below は敵より下の描画のときに true
  drawLevelFx(ctx, below) {
    const tier = this.visualTier;
    if (!tier || below !== this.levelFxBelow) return;
    const lv = CONFIG.weaponLevelVisual;
    const variant = this.levelVariant;
    const v = lv[variant];
    const i = tier - 1;
    const color = (lv.colors[this.config.element] ?? lv.colors.none)[i];
    const t = this.game.time;
    ctx.save();
    this.levelSpots().forEach((s, n) => {
      const k = s.k ?? 1;
      const seed = s.seed ?? n;
      if (variant === 'A') {
        // まわりの淡い光
        drawGlow(ctx, s.x, s.y, s.r + Math.min(s.r * (v.scale[i] - 1), v.maxExtra[i]), color, v.alpha[i] * k);
      } else if (variant === 'B') {
        // 縁の光る線（当たる範囲の内側）
        const w = Math.min(v.width[i], s.r);
        ctx.globalAlpha = v.alpha[i] * k;
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        circle(ctx, s.x, s.y, s.r - w / 2);
        ctx.stroke();
      } else {
        this.#drawLevelParticles(ctx, s, v, i, color, k, seed, t);
      }
    });
    ctx.restore();
  }

  // まわりの粒（熱い：湯気、冷たい：きらめき、属性なし：火花）。半透明にして、はっきりした絵にしない
  #drawLevelParticles(ctx, s, v, i, color, k, seed, t) {
    const count = Math.min(v.maxCount, v.count[i] * Math.max(1, Math.round(s.r / v.sizeStep)));
    const element = this.config.element;
    if (element === 'hot') {
      drawWisps(ctx, s.x, s.y - s.r * 0.5, { count, height: s.r + v.reach, spread: s.r * 1.2, size: v.size, color, alpha: v.alpha * k, time: t, speed: v.speed, seed });
      return;
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = v.size;
    ctx.lineCap = 'round';
    for (let j = 0; j < count; j++) {
      if (element === 'ice') {
        const a = hash(seed + j) * Math.PI * 2 + t * 0.8;
        const d = s.r + v.size + hash(seed + j * 3) * v.reach * 0.5;
        ctx.globalAlpha = v.alpha * k * Math.max(0, Math.sin(t * 8 + j * 2 + seed));
        ctx.fillRect(s.x + Math.cos(a) * d - v.size / 2, s.y + Math.sin(a) * d - v.size / 2, v.size, v.size);
      } else {
        const ph = (t * v.speed + hash(seed + j)) % 1;
        const a = hash(seed + j * 3) * Math.PI * 2;
        const d = s.r + ph * v.reach;
        ctx.globalAlpha = v.alpha * k * (1 - ph);
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d);
        ctx.lineTo(s.x + Math.cos(a) * (d + v.size * 2), s.y + Math.sin(a) * (d + v.size * 2));
        ctx.stroke();
      }
    }
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
