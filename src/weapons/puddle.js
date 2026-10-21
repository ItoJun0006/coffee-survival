import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';

// 足元に熱い珈琲をこぼし、上にいる敵にダメージを与え続ける
export class Puddle extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.puddle);
    this.zones = [];
    // 水たまりが重なっても、同じ敵へのダメージは 1 つ分だけ
    this.hits = new HitTracker(this.config.tickSec);
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      this.timer = 0;
      this.zones.push({ x: g.player.x, y: g.player.y, life: c.durationSec });
    }
    for (const z of this.zones) {
      z.life -= dt;
      for (const t of g.targetsInCircle(z.x, z.y, c.radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  drawBelow(ctx) {
    const c = this.config;
    for (const z of this.zones) {
      ctx.fillStyle = `rgba(110, 60, 30, ${0.6 * Math.min(1, z.life)})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
