import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// プレイヤーの周りを回るミルの刃
export class Mill extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mill);
    this.angle = 0;
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  baseStats() {
    return { count: this.config.count, bladeRate: 1, spinRate: 1, knockbackRate: 1, hitCooldownRate: 1 };
  }

  get orbitRadius() {
    return this.config.orbitRadius;
  }

  // 限界突破（Lv 9 から）で受けた段階の数。everyLevels Lv ごとに 1 段階
  get breakSteps() {
    const { max } = CONFIG.weaponLevels;
    return Math.max(0, Math.floor((this.level - max) / this.config.limitBreak.everyLevels));
  }

  // 刃の半径。限界突破の段階ごとに小さくし、さらに隣の刃と重ならない大きさまでに抑える
  get bladeRadius() {
    const c = this.config;
    const r = c.bladeRadius * this.stats.bladeRate * c.limitBreak.shrinkRate ** this.breakSteps;
    const n = this.bladeCount;
    if (n < 2) return r;
    return Math.min(r, this.orbitRadius * Math.sin(Math.PI / n) * c.fitRate);
  }

  upgradeDesc(nextLevel) {
    const { max } = CONFIG.weaponLevels;
    const { everyLevels, desc } = this.config.limitBreak;
    if (nextLevel > max && (nextLevel - max) % everyLevels === 0) return desc;
    return super.upgradeDesc(nextLevel);
  }

  // 刃の数。限界突破の段階の数と、当たる間隔の強化が下限からあふれた分だけ足す（仕様 012 FR-004）
  get bladeCount() {
    const { perBlade, maxExtra } = this.config.overflow;
    const extra = this.game.character?.focus ? 0 : Math.min(maxExtra, Math.floor(this.intervalOverflow / perBlade));
    return this.stats.count + this.breakSteps + extra;
  }

  #blades() {
    const p = this.game.player;
    const count = this.bladeCount;
    const orbit = this.orbitRadius;
    return Array.from({ length: count }, (_, i) => {
      const a = this.angle + (i / count) * Math.PI * 2;
      return { x: p.x + Math.cos(a) * orbit, y: p.y + Math.sin(a) * orbit, a };
    });
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    this.angle += c.angularSpeed * s.spinRate * dt;
    // ミルは発動しないので、攻撃の間隔の強化は同じ敵に当たる間隔に効く
    this.hits.cooldownSec = c.hitCooldownSec * s.hitCooldownRate * this.intervalRate;
    const blade = this.bladeRadius;
    const reach = this.orbitRadius + blade;
    // 刃が届きうる円の中の敵だけを、刃と比べる
    const near = g.targets().filter((t) => Math.hypot(t.x - p.x, t.y - p.y) < reach + t.radius);
    if (!near.length) return;
    for (const b of this.#blades()) {
      for (const t of near) {
        if (Math.hypot(t.x - b.x, t.y - b.y) >= blade + t.radius) continue;
        if (!this.hits.tryHit(t, g.time)) continue;
        this.hit(t);
        // プレイヤーから外向きに押し返す
        const a = Math.atan2(t.y - p.y, t.x - p.x);
        const k = c.knockback * s.knockbackRate;
        g.knockback(t, Math.cos(a) * k, Math.sin(a) * k);
      }
    }
  }

  levelSpots() {
    const r = this.bladeRadius;
    return this.#blades().map((b) => ({ x: b.x, y: b.y, r }));
  }

  // 刃の形（8 つの角の星形）。外側の角が半径 r
  #bladePath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.55;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  #drawBlade(ctx, b, r, { blade, edge, hub, edgeRate = 0 }) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a * 3);
    if (edge) {
      // 明るい縁：外側を縁の色で塗り、内側を刃の色で塗る（縁まで含めて半径 r）
      ctx.fillStyle = edge;
      this.#bladePath(ctx, r);
      ctx.fill();
    }
    ctx.fillStyle = blade;
    this.#bladePath(ctx, edge ? r * (1 - edgeRate) : r);
    ctx.fill();
    ctx.fillStyle = hub;
    circle(ctx, 0, 0, r * 0.3);
    ctx.fill();
    ctx.restore();
  }

  draw(ctx) {
    const r = this.bladeRadius;
    if (this.isMax) {
      this.#drawMax(ctx, r);
      return;
    }
    for (const b of this.#blades()) this.#drawBlade(ctx, b, r, { blade: '#9a9a9a', hub: '#5b5b5b' });
  }

  // 削る熱で赤く光る刃と、刃から飛ぶ火花
  #drawMax(ctx, r) {
    const v = this.config.maxVisual;
    const blades = this.#blades();
    const t = this.game.time;
    for (const b of blades) drawGlow(ctx, b.x, b.y, r * v.glowScale, v.glow, v.glowAlpha);
    for (const b of blades) this.#drawBlade(ctx, b, r, v);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = v.spark;
    ctx.lineWidth = v.sparkWidth;
    blades.forEach((b, n) => {
      for (let i = 0; i < v.sparks; i++) {
        const k = (t * v.sparkSpeed + hash(n * 11 + i)) % 1;
        // 回る向きと反対の後ろ側へ、少し外向きに飛ぶ（半透明。はっきりした絵にしない）
        const dir = b.a - Math.PI / 2 + (hash(n * 5 + i * 2.3) - 0.3) * 1.2;
        const d0 = r + k * v.sparkDist;
        ctx.globalAlpha = v.sparkAlpha * (1 - k);
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(dir) * d0, b.y + Math.sin(dir) * d0);
        ctx.lineTo(b.x + Math.cos(dir) * (d0 + v.sparkLen), b.y + Math.sin(dir) * (d0 + v.sparkLen));
        ctx.stroke();
      }
    });
    ctx.restore();
  }
}
