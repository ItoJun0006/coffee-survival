import { CONFIG } from '../config.js';
import { Weapon, dist, angleTo } from './base.js';

// カフェインが上限の一定以上あるときだけ、周りに衝撃波を放って押し返す
export class Shockwave extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.shockwave);
    this.rings = [];
    // 発動のあとに続けて出す波（MAX）
    this.pending = [];
  }

  baseStats() {
    return { minCaffeineRatio: this.config.minCaffeineRatio, radiusRate: 1, knockbackRate: 1, waves: 1, waveGapSec: 0, caffeineCost: 0 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    if (this.tick(dt) && p.caffeine >= p.maxCaffeine * s.minCaffeineRatio) {
      this.timer = 0;
      // 被弾の処理を通さずに減らす。発動の条件より少ない量なので 0 にはならない
      p.caffeine -= s.caffeineCost;
      for (let i = 0; i < s.waves; i++) {
        this.pending.push({ x: p.x, y: p.y, delay: i * s.waveGapSec, push: i === s.waves - 1 });
      }
    }
    for (const w of this.pending) {
      w.delay -= dt;
      if (w.delay <= 0) this.rings.push({ x: w.x, y: w.y, r: p.radius, hit: new Set(), push: w.push });
    }
    this.pending = this.pending.filter((w) => w.delay > 0);
    const maxRadius = c.maxRadius * s.radiusRate;
    const knockback = c.knockback * s.knockbackRate;
    for (const ring of this.rings) {
      ring.r += c.speed * dt;
      for (const t of g.targetsInCircle(ring.x, ring.y, ring.r)) {
        if (ring.hit.has(t) || dist(t, ring) + t.radius < ring.r - c.thickness) continue;
        ring.hit.add(t);
        this.hit(t);
        if (!ring.push) continue;
        const a = angleTo(ring, t);
        g.knockback(t, Math.cos(a) * knockback, Math.sin(a) * knockback);
      }
    }
    this.rings = this.rings.filter((ring) => ring.r < maxRadius);
  }

  draw(ctx) {
    const maxRadius = this.config.maxRadius * this.stats.radiusRate;
    for (const ring of this.rings) {
      ctx.strokeStyle = `rgba(255, 210, 120, ${0.8 * (1 - ring.r / maxRadius)})`;
      ctx.lineWidth = this.config.thickness * 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
