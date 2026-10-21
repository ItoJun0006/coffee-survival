import { CONFIG } from '../config.js';
import { Weapon, dist, angleTo } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// カフェインが上限の一定以上あるときだけ、周りに衝撃波を放って押し返す
export class Shockwave extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.shockwave);
    this.rings = [];
    // 発動のあとに続けて出す波（MAX）
    this.pending = [];
    // 最後に発動した時刻（MAX の、発動の瞬間にプレイヤーが光る見た目）
    this.firedAt = -Infinity;
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
      this.firedAt = g.time;
      for (let i = 0; i < s.waves; i++) {
        this.pending.push({ x: p.x, y: p.y, delay: i * s.waveGapSec, push: i === s.waves - 1 });
      }
    }
    for (const w of this.pending) {
      w.delay -= dt;
      if (w.delay <= 0) this.rings.push({ x: w.x, y: w.y, r: p.radius, hit: new Set(), push: w.push, seed: Math.random() * 100 });
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
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    const maxRadius = this.config.maxRadius * this.stats.radiusRate;
    for (const ring of this.rings) {
      ctx.strokeStyle = `rgba(255, 210, 120, ${0.8 * (1 - ring.r / maxRadius)})`;
      ctx.lineWidth = this.config.thickness * 0.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 当たる帯（ring.r − thickness 〜 ring.r）をそのまま描く
  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const th = this.config.thickness;
    const maxRadius = this.config.maxRadius * this.stats.radiusRate;
    const p = this.game.player;
    const since = this.game.time - this.firedAt;
    if (since < v.flashSec) drawGlow(ctx, p.x, p.y, v.flashRadius, v.flash, 1 - since / v.flashSec);
    for (const ring of this.rings) {
      const k = 1 - ring.r / maxRadius;
      const inner = Math.max(0, ring.r - th);
      ctx.save();
      if (variant === 'A') {
        // 外側が白っぽい黄色、内側がオレンジの光る円環と、縁から外へ走る火花
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.lineWidth = th / 2;
        ctx.strokeStyle = v.inner;
        circle(ctx, ring.x, ring.y, inner + th / 4);
        ctx.stroke();
        ctx.strokeStyle = v.outer;
        circle(ctx, ring.x, ring.y, ring.r - th / 4);
        ctx.stroke();
        if (ring.push) {
          ctx.strokeStyle = v.edge;
          ctx.lineWidth = v.pushEdge;
          circle(ctx, ring.x, ring.y, ring.r - v.pushEdge / 2);
          ctx.stroke();
        }
        ctx.globalAlpha = v.sparkAlpha * k;
        ctx.strokeStyle = v.spark;
        ctx.lineWidth = 3;
        for (let i = 0; i < v.sparks; i++) {
          const a = hash(ring.seed + i) * Math.PI * 2;
          const d = ring.r + hash(ring.seed + i * 5) * v.sparkLen;
          ctx.beginPath();
          ctx.moveTo(ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r);
          ctx.lineTo(ring.x + Math.cos(a) * d, ring.y + Math.sin(a) * d);
          ctx.stroke();
        }
      } else if (variant === 'B') {
        // 帯の幅の中をジグザグに走る稲妻の輪
        ctx.globalAlpha = 0.55 + 0.45 * k;
        ctx.strokeStyle = v.bolt;
        ctx.lineWidth = ring.push ? v.pushWidth : v.width;
        ctx.lineJoin = 'round';
        const n = Math.max(12, Math.round((ring.r * Math.PI * 2) / v.zigPx));
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const rr = i % 2 ? inner + ctx.lineWidth / 2 : ring.r - ctx.lineWidth / 2;
          ctx.lineTo(ring.x + Math.cos(a) * rr, ring.y + Math.sin(a) * rr);
        }
        ctx.stroke();
        ctx.globalAlpha = v.hazeAlpha * k;
        ctx.strokeStyle = v.haze;
        ctx.lineWidth = th;
        circle(ctx, ring.x, ring.y, ring.r - th / 2);
        ctx.stroke();
      } else {
        // クレマ色の波紋と、外の縁に並ぶ泡
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.strokeStyle = v.band;
        ctx.lineWidth = th;
        circle(ctx, ring.x, ring.y, ring.r - th / 2);
        ctx.stroke();
        ctx.strokeStyle = v.line;
        ctx.lineWidth = 3;
        circle(ctx, ring.x, ring.y, inner + 1.5);
        ctx.stroke();
        ctx.fillStyle = v.foam;
        const size = ring.push ? v.pushFoam : v.foamSize;
        const n = Math.max(10, Math.round((ring.r * Math.PI * 2) / (size * 3)));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring.seed;
          const rr = ring.r - size - hash(ring.seed + i) * (th / 2 - size);
          circle(ctx, ring.x + Math.cos(a) * rr, ring.y + Math.sin(a) * rr, size);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}
