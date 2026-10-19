import { CONFIG } from '../config.js';
import { Weapon } from './base.js';

// 一番近い敵の真上からフレンチプレスで押しつぶす
export class Press extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.press);
    this.blasts = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      const target = g.nearestTarget(c.range);
      if (target) {
        this.timer = 0;
        this.blasts.push({ x: target.x, y: target.y, timer: c.delaySec, flash: 0 });
      }
    }
    for (const b of this.blasts) {
      if (b.timer > 0) {
        b.timer -= dt;
        if (b.timer <= 0) {
          for (const t of g.targetsInCircle(b.x, b.y, c.radius)) this.hit(t);
          b.flash = 0.25;
        }
      } else {
        b.flash -= dt;
      }
    }
    this.blasts = this.blasts.filter((b) => b.timer > 0 || b.flash > 0);
  }

  drawBelow(ctx) {
    const c = this.config;
    for (const b of this.blasts) {
      if (b.timer <= 0) continue;
      ctx.strokeStyle = 'rgba(240, 200, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, c.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  draw(ctx) {
    const c = this.config;
    for (const b of this.blasts) {
      if (b.timer > 0) {
        // 上から降りてくるプランジャー
        const k = b.timer / c.delaySec;
        const y = b.y - k * 260;
        ctx.fillStyle = 'rgba(200, 220, 230, 0.55)';
        ctx.fillRect(b.x - c.radius * 0.6, y - c.radius * 1.2, c.radius * 1.2, c.radius * 1.2);
        ctx.fillStyle = '#4b4b4b';
        ctx.fillRect(b.x - c.radius * 0.7, y - 6, c.radius * 1.4, 8);
        ctx.fillRect(b.x - 4, y - c.radius * 1.6, 8, c.radius * 0.5);
      } else {
        ctx.fillStyle = `rgba(255, 230, 190, ${b.flash / 0.25 * 0.7})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
