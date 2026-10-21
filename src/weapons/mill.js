import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';

// プレイヤーの周りを回るミルの刃
export class Mill extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mill);
    this.angle = 0;
    this.time = 0;
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  baseStats() {
    return { count: this.config.count, bladeRate: 1, spinRate: 1 };
  }

  // 今の回る半径。MAX は周期的に伸び縮みする
  get orbitRadius() {
    const r = this.config.orbitRadius;
    const pulse = this.stats.pulse;
    if (!pulse) return r;
    const k = (1 - Math.cos((this.time / pulse.periodSec) * Math.PI * 2)) / 2;
    return r * (pulse.minRate + (pulse.maxRate - pulse.minRate) * k);
  }

  get bladeRadius() {
    return this.config.bladeRadius * this.stats.bladeRate;
  }

  #blades() {
    const p = this.game.player;
    const { count } = this.stats;
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
    this.time += dt;
    this.angle += c.angularSpeed * s.spinRate * dt;
    // ミルは発動しないので、攻撃の間隔の強化は同じ敵に当たる間隔に効く
    this.hits.cooldownSec = c.hitCooldownSec * this.intervalRate;
    const blade = this.bladeRadius;
    const reach = c.orbitRadius * (s.pulse?.maxRate ?? 1) + blade;
    // 刃が届きうる円の中の敵だけを、刃と比べる
    const near = g.targets().filter((t) => Math.hypot(t.x - p.x, t.y - p.y) < reach + t.radius);
    if (!near.length) return;
    for (const b of this.#blades()) {
      for (const t of near) {
        if (Math.hypot(t.x - b.x, t.y - b.y) >= blade + t.radius) continue;
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
  }

  draw(ctx) {
    const r = this.bladeRadius;
    for (const b of this.#blades()) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a * 3);
      ctx.fillStyle = '#9a9a9a';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 === 0 ? r : r * 0.55;
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5b5b5b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
