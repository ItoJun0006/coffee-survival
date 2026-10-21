import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';
import { drawWisps, hash, circle } from './max-fx.js';

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
      this.zones.unshift({ x: p.x, y: p.y, radius, life: c.durationSec * s.durationRate, damageRate: 1, seed: Math.random() * 100 });
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
    this.zones.push({ x: p.x, y: p.y, radius: radius * tr.radiusRate, life: tr.durationSec, damageRate: tr.damageRate, trail: true, seed: Math.random() * 100 });
    const trails = this.zones.filter((z) => z.trail);
    if (trails.length > tr.max) this.zones.splice(this.zones.indexOf(trails[0]), 1);
  }

  drawBelow(ctx) {
    if (this.isMax) {
      this.#drawMaxBelow(ctx);
      return;
    }
    for (const z of this.zones) {
      ctx.fillStyle = `rgba(110, 60, 30, ${0.6 * Math.min(1, z.life)})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 水たまりもこぼれ跡も同じ描き方：濃い琥珀色の表面とオレンジの縁取り（縁が当たる半径）、ふくらんではじける泡
  #drawMaxBelow(ctx) {
    const v = this.config.maxVisual;
    const t = this.game.time;
    for (const z of this.zones) {
      const k = Math.min(1, z.life);
      const r = z.radius;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = v.surface;
      circle(ctx, z.x, z.y, r);
      ctx.fill();
      ctx.strokeStyle = v.rim;
      ctx.lineWidth = 3;
      circle(ctx, z.x, z.y, r - 1.5);
      ctx.stroke();
      ctx.fillStyle = v.bubble;
      ctx.strokeStyle = v.bubble;
      ctx.lineWidth = 2;
      const n = Math.max(2, Math.round(v.bubbles * (r / this.config.radius)));
      for (let i = 0; i < n; i++) {
        const ph = (t * v.bubbleSpeed + hash(z.seed + i)) % 1;
        const a = hash(z.seed + i * 3) * Math.PI * 2;
        const d = Math.sqrt(hash(z.seed + i * 5)) * r * 0.7;
        const bx = z.x + Math.cos(a) * d;
        const by = z.y + Math.sin(a) * d;
        // ふくらむ間は塗った丸、はじけるときは輪
        if (ph < 0.8) {
          circle(ctx, bx, by, 1.5 + ph * v.bubbleSize);
          ctx.fill();
        } else {
          circle(ctx, bx, by, 1.5 + v.bubbleSize * (0.8 + (ph - 0.8) * 3));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // 水たまりから立ちのぼる湯気
  draw(ctx) {
    if (!this.isMax) return;
    const v = this.config.maxVisual;
    const t = this.game.time;
    for (const z of this.zones) {
      const k = Math.min(1, z.life);
      const scale = z.radius / this.config.radius;
      drawWisps(ctx, z.x, z.y, { count: Math.max(1, Math.round(v.wisps * scale)), height: v.wispHeight, spread: z.radius * 1.2, size: 4 + scale * 2, color: v.steam, alpha: v.steamAlpha * k, time: t, speed: 0.9, seed: z.seed });
    }
  }
}
