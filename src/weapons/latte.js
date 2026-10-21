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
    // 模様が重なっても、ダメージと回復は 1 つ分だけ
    this.hits = new HitTracker(this.config.tickSec);
  }

  baseStats() {
    return { durationRate: 1, radiusRate: 1, healRate: 1, follow: false };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    const radius = c.radius * s.radiusRate;
    const duration = c.durationSec * s.durationRate;
    if (this.tick(dt)) {
      this.timer = 0;
      // MAX：模様はいつも 1 枚で、発動したら残り時間を戻すだけ
      if (s.follow && this.arts.length) this.arts[0].life = duration;
      else this.arts.push({ x: p.x, y: p.y, life: duration });
    }
    for (const a of this.arts) {
      a.life -= dt;
      a.radius = radius;
      if (s.follow) Object.assign(a, { x: p.x, y: p.y });
      for (const t of g.targetsInCircle(a.x, a.y, radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    if (this.arts.some((a) => dist(a, p) < radius)) p.heal(c.healPerSec * s.healRate * dt);
    this.arts = this.arts.filter((a) => a.life > 0);
  }

  drawBelow(ctx) {
    for (const a of this.arts) {
      const k = Math.min(1, a.life / 0.5);
      ctx.fillStyle = `rgba(196, 150, 108, ${0.45 * k})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(250, 240, 225, ${0.7 * k})`;
      heartPath(ctx, a.x, a.y, a.radius * 0.6);
      ctx.fill();
    }
  }
}
