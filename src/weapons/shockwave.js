import { CONFIG } from '../config.js';
import { Weapon, dist, angleTo } from './base.js';

// カフェインが多いときだけ、周りに衝撃波を放って押し返す
export class Shockwave extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.shockwave);
    this.rings = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const p = g.player;
    if (this.tick(dt) && p.caffeine >= c.minCaffeine) {
      this.timer = 0;
      this.rings.push({ x: p.x, y: p.y, r: p.radius, hit: new Set() });
    }
    for (const ring of this.rings) {
      ring.r += c.speed * dt;
      for (const t of g.targetsInCircle(ring.x, ring.y, ring.r)) {
        if (ring.hit.has(t) || dist(t, ring) + t.radius < ring.r - c.thickness) continue;
        ring.hit.add(t);
        this.hit(t);
        const a = angleTo(ring, t);
        g.knockback(t, Math.cos(a) * c.knockback, Math.sin(a) * c.knockback);
      }
    }
    this.rings = this.rings.filter((ring) => ring.r < c.maxRadius);
  }

  draw(ctx) {
    const c = this.config;
    for (const ring of this.rings) {
      ctx.strokeStyle = `rgba(255, 210, 120, ${0.8 * (1 - ring.r / c.maxRadius)})`;
      ctx.lineWidth = c.thickness * 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
