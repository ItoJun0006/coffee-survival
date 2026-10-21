import { CONFIG } from '../config.js';
import { Weapon, dist } from './base.js';

// 敵の頭上に熱い雫を降らせる
export class Drip extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.drip);
    this.drops = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      const candidates = g.targets().filter((t) => dist(t, g.player) < c.range);
      if (candidates.length > 0) {
        this.timer = 0;
        for (let i = 0; i < c.drops; i++) {
          const t = candidates[Math.floor(Math.random() * candidates.length)];
          this.drops.push({ x: t.x, y: t.y, timer: c.delaySec, splash: 0 });
        }
      }
    }
    for (const d of this.drops) {
      if (d.timer > 0) {
        d.timer -= dt;
        if (d.timer <= 0) {
          for (const t of g.targetsInCircle(d.x, d.y, c.radius)) this.hit(t);
          d.splash = 0.3;
        }
      } else {
        d.splash -= dt;
      }
    }
    this.drops = this.drops.filter((d) => d.timer > 0 || d.splash > 0);
  }

  drawBelow(ctx) {
    const c = this.config;
    for (const d of this.drops) {
      if (d.timer <= 0) continue;
      ctx.fillStyle = 'rgba(60, 30, 15, 0.35)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, c.radius * (1 - d.timer / c.delaySec), c.radius * 0.5 * (1 - d.timer / c.delaySec), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw(ctx) {
    const c = this.config;
    for (const d of this.drops) {
      if (d.timer > 0) {
        const y = d.y - (d.timer / c.delaySec) * 220;
        ctx.fillStyle = '#6b3e22';
        ctx.beginPath();
        ctx.moveTo(d.x, y - 12);
        ctx.quadraticCurveTo(d.x + 8, y + 2, d.x, y + 6);
        ctx.quadraticCurveTo(d.x - 8, y + 2, d.x, y - 12);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(200, 140, 80, ${d.splash / 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, c.radius * (1.3 - d.splash), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
