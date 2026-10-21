import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';

// 足元に熱い珈琲をこぼし、上にいる敵にダメージを与え続ける
export class Puddle extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.puddle);
    this.zones = [];
    // 水たまり・こぼれ跡が重なっても、同じ敵へのダメージは 1 つ分だけ
    this.hits = new HitTracker(this.config.tickSec);
    // MAX：前にこぼれ跡を置いてから歩いた距離
    this.walked = 0;
    this.lastPos = null;
  }

  baseStats() {
    return { durationRate: 1, radiusRate: 1, slow: false, trail: false };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    const radius = c.radius * s.radiusRate;
    if (this.tick(dt)) {
      this.timer = 0;
      // こぼれ跡より先に当たるよう、普通の水たまりは前に入れる
      this.zones.unshift({ x: p.x, y: p.y, radius, life: c.durationSec * s.durationRate, damageRate: 1 });
    }
    if (s.trail) this.#dropTrail(radius);
    for (const z of this.zones) {
      z.life -= dt;
      for (const t of g.targetsInCircle(z.x, z.y, z.radius)) {
        if (s.slow) g.slow(t, c.slow.sec, c.slow.rate);
        if (this.hits.tryHit(t, g.time)) this.hit(t, c.damage * z.damageRate);
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  // 歩いた跡に小さな水たまりを置く。立ち止まっているときは置かない
  #dropTrail(radius) {
    const tr = this.config.trail;
    const p = this.game.player;
    if (this.lastPos) this.walked += Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y);
    this.lastPos = { x: p.x, y: p.y };
    if (this.walked < tr.stepPx) return;
    this.walked = 0;
    this.zones.push({ x: p.x, y: p.y, radius: radius * tr.radiusRate, life: tr.durationSec, damageRate: tr.damageRate, trail: true });
    const trails = this.zones.filter((z) => z.trail);
    if (trails.length > tr.max) this.zones.splice(this.zones.indexOf(trails[0]), 1);
  }

  drawBelow(ctx) {
    for (const z of this.zones) {
      ctx.fillStyle = `rgba(110, 60, 30, ${0.6 * Math.min(1, z.life)})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
