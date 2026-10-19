import { CONFIG } from '../config.js';
import { Weapon, HitTracker, angleTo, dist } from './base.js';

// 投げると戻ってくるマグカップ。敵を貫通する
export class Mug extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mug);
    this.mugs = [];
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const p = g.player;
    if (this.tick(dt)) {
      const target = g.nearestTarget(c.range);
      if (target) {
        this.timer = 0;
        this.mugs.push({ x: p.x, y: p.y, angle: angleTo(p, target), travelled: 0, returning: false, spin: 0, spent: false });
      }
    }
    for (const m of this.mugs) {
      if (m.returning) m.angle = angleTo(m, p);
      m.x += Math.cos(m.angle) * c.speed * dt;
      m.y += Math.sin(m.angle) * c.speed * dt;
      m.spin += dt * 12;
      m.travelled += c.speed * dt;
      if (!m.returning && m.travelled >= c.range) m.returning = true;
      if (m.returning && dist(m, p) < p.radius) m.spent = true;
      for (const t of g.targetsInCircle(m.x, m.y, c.radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    this.mugs = this.mugs.filter((m) => !m.spent);
  }

  draw(ctx) {
    const r = this.config.radius;
    for (const m of this.mugs) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.spin);
      ctx.strokeStyle = '#f4efe6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r * 0.7, 0, r * 0.4, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = '#f4efe6';
      ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.fillStyle = '#5a341f';
      ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 0.35);
      ctx.restore();
    }
  }
}
