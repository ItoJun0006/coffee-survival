import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';

// プレイヤーの周りを回るミルの刃
export class Mill extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mill);
    this.angle = 0;
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  #blades() {
    const c = this.config;
    const p = this.game.player;
    return Array.from({ length: c.count }, (_, i) => {
      const a = this.angle + (i / c.count) * Math.PI * 2;
      return { x: p.x + Math.cos(a) * c.orbitRadius, y: p.y + Math.sin(a) * c.orbitRadius, a };
    });
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    this.angle += c.angularSpeed * dt;
    for (const b of this.#blades()) {
      for (const t of g.targetsInCircle(b.x, b.y, c.bladeRadius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
  }

  draw(ctx) {
    const r = this.config.bladeRadius;
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
