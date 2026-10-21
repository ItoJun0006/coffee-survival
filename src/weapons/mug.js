import { CONFIG } from '../config.js';
import { Weapon, HitTracker, angleTo, dist } from './base.js';

// 投げると戻ってくるマグカップ。敵を貫通する
export class Mug extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mug);
    this.mugs = [];
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  baseStats() {
    return { count: 1, spreadDeg: 0, sizeRate: 1, rangeRate: 1, speedRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    const range = c.range * s.rangeRate;
    const speed = c.speed * s.speedRate;
    if (this.tick(dt)) {
      const target = g.nearestTarget(range);
      if (target) {
        this.timer = 0;
        const base = angleTo(p, target);
        const step = (s.spreadDeg * Math.PI) / 180;
        for (let i = 0; i < s.count; i++) {
          const angle = base + (i - (s.count - 1) / 2) * step;
          this.mugs.push({ x: p.x, y: p.y, angle, radius: c.radius * s.sizeRate, travelled: 0, returning: false, spin: 0, spent: false });
        }
      }
    }
    for (const m of this.mugs) {
      if (m.returning) m.angle = angleTo(m, p);
      m.x += Math.cos(m.angle) * speed * dt;
      m.y += Math.sin(m.angle) * speed * dt;
      m.spin += dt * 12;
      m.travelled += speed * dt;
      if (!m.returning && m.travelled >= range) {
        m.returning = true;
        // MAX：折り返す瞬間に熱いしぶきが散る
        if (s.splash) {
          for (const t of g.targetsInCircle(m.x, m.y, c.splashRadius)) this.hit(t, c.splashDamage, c.splashElement);
        }
      }
      if (m.returning && dist(m, p) < p.radius) m.spent = true;
      for (const t of g.targetsInCircle(m.x, m.y, m.radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    this.mugs = this.mugs.filter((m) => !m.spent);
  }

  draw(ctx) {
    for (const m of this.mugs) {
      const r = m.radius;
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
