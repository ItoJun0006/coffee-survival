import { CONFIG } from '../config.js';
import { Weapon, HitTracker, dist } from './base.js';

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    ctx.lineTo(x + (hx / 16) * size, y + (hy / 16) * size);
  }
  ctx.closePath();
}

// 足元にハートのラテアートを描く。中の敵にダメージを与え、中にいる間カフェインが回復する
export class Latte extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.latte);
    this.arts = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      this.timer = 0;
      this.arts.push({ x: g.player.x, y: g.player.y, life: c.durationSec, hits: new HitTracker(c.tickSec) });
    }
    for (const a of this.arts) {
      a.life -= dt;
      for (const t of g.targetsInCircle(a.x, a.y, c.radius)) {
        if (a.hits.tryHit(t, g.time)) this.hit(t);
      }
      if (dist(a, g.player) < c.radius) g.player.heal(c.healPerSec * dt);
    }
    this.arts = this.arts.filter((a) => a.life > 0);
  }

  drawBelow(ctx) {
    const c = this.config;
    for (const a of this.arts) {
      const k = Math.min(1, a.life / 0.5);
      ctx.fillStyle = `rgba(196, 150, 108, ${0.45 * k})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(250, 240, 225, ${0.7 * k})`;
      heartPath(ctx, a.x, a.y, c.radius * 0.6);
      ctx.fill();
    }
  }
}
