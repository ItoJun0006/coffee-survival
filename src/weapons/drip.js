import { CONFIG } from '../config.js';
import { Weapon, HitTracker, dist } from './base.js';
import { drawGlow, drawWisps, circle } from './max-fx.js';

// 敵の頭上に熱い雫を降らせる
export class Drip extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.drip);
    this.drops = [];
    // MAX：着弾点に残る湯気。重なっても同じ敵へのダメージは 1 つ分
    this.mists = [];
    this.mistHits = new HitTracker(this.config.linger.tickSec);
  }

  baseStats() {
    return { drops: this.config.drops, radiusRate: 1, spreadTargets: false, linger: false, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const radius = c.radius * s.radiusRate;
    if (this.tick(dt)) {
      const candidates = g.targets().filter((t) => dist(t, g.player) < c.range);
      if (candidates.length > 0) {
        this.timer = 0;
        for (const pos of s.spreadTargets ? this.#spreadPositions(candidates, s.drops) : this.#randomPositions(candidates, s.drops)) {
          this.drops.push({ ...pos, timer: c.delaySec, splash: 0, seed: Math.random() * 100 });
        }
      }
    }
    for (const d of this.drops) {
      if (d.timer > 0) {
        d.timer -= dt;
        if (d.timer <= 0) {
          for (const t of g.targetsInCircle(d.x, d.y, radius)) this.hit(t, c.damage * s.damageRate);
          d.splash = c.splashSec;
          if (s.linger) this.mists.push({ x: d.x, y: d.y, life: c.linger.durationSec, seed: d.seed });
        }
      } else {
        d.splash -= dt;
      }
    }
    this.drops = this.drops.filter((d) => d.timer > 0 || d.splash > 0);
    for (const m of this.mists) {
      m.life -= dt;
      for (const t of g.targetsInCircle(m.x, m.y, radius)) {
        if (this.mistHits.tryHit(t, g.time)) this.hit(t, c.damage * s.damageRate * c.linger.damageRate);
      }
    }
    this.mists = this.mists.filter((m) => m.life > 0);
  }

  // 範囲内の敵からランダムに選ぶ（同じ敵に重なってよい）
  #randomPositions(candidates, count) {
    return Array.from({ length: count }, () => {
      const t = candidates[Math.floor(Math.random() * candidates.length)];
      return { x: t.x, y: t.y };
    });
  }

  // 範囲内の敵をシャッフルして別々に狙い、余った雫はプレイヤーのまわりに落とす。
  // ボスに直撃させるのは 1 回の発動で 1 つまで
  #spreadPositions(candidates, count) {
    const p = this.game.player;
    const list = [...candidates];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return Array.from({ length: count }, (_, i) => {
      if (i < list.length) return { x: list[i].x, y: list[i].y };
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.config.scatterRadius;
      return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    });
  }

  // 落ちてくる雫
  levelSpots() {
    const c = this.config;
    return this.drops.filter((d) => d.timer > 0).map((d) => ({ x: d.x, y: d.y - (d.timer / c.delaySec) * c.fallHeight, r: c.dropSize, seed: d.seed }));
  }

  drawBelow(ctx) {
    const c = this.config;
    const radius = c.radius * this.stats.radiusRate;
    for (const d of this.drops) {
      if (d.timer <= 0) continue;
      ctx.fillStyle = 'rgba(60, 30, 15, 0.35)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, radius * (1 - d.timer / c.delaySec), radius * 0.5 * (1 - d.timer / c.delaySec), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.isMax) return;
    // 着弾点に残る湯気の範囲（はっきりした縁が当たる半径）
    const v = c.maxVisual;
    for (const m of this.mists) {
      const k = Math.min(1, m.life / c.linger.durationSec * 2);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = v.mistFill;
      circle(ctx, m.x, m.y, radius);
      ctx.fill();
      ctx.strokeStyle = v.mistEdge;
      ctx.lineWidth = 3;
      circle(ctx, m.x, m.y, radius - 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  // しずくの形。先が上、(x, y) が下の丸の中心
  #dropPath(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 2);
    ctx.quadraticCurveTo(x + size * 1.35, y + size * 0.35, x, y + size);
    ctx.quadraticCurveTo(x - size * 1.35, y + size * 0.35, x, y - size * 2);
  }

  draw(ctx) {
    const c = this.config;
    const radius = c.radius * this.stats.radiusRate;
    const v = this.isMax ? c.maxVisual : null;
    const t = this.game.time;
    for (const d of this.drops) {
      if (d.timer > 0) {
        const y = d.y - (d.timer / c.delaySec) * c.fallHeight;
        if (!v) {
          ctx.fillStyle = '#6b3e22';
          this.#dropPath(ctx, d.x, y, c.dropSize);
          ctx.fill();
        } else {
          // 狙った所の上に小さなドリッパーが現れ、そこから落ちる
          const top = d.y - c.fallHeight;
          ctx.save();
          ctx.globalAlpha = Math.min(1, (c.delaySec - d.timer) / v.dripperFadeSec, d.timer / v.dripperFadeSec);
          this.#drawDripper(ctx, d.x, top, v);
          ctx.restore();
          drawGlow(ctx, d.x, y, v.glowRadius, v.glow, v.glowAlpha);
          ctx.fillStyle = v.drop;
          this.#dropPath(ctx, d.x, y, c.dropSize);
          ctx.fill();
        }
      } else if (!v) {
        ctx.strokeStyle = `rgba(200, 140, 80, ${d.splash / c.splashSec})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, radius * (1.3 - d.splash), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 着弾：当たる半径ちょうどの輪と、跳ねる雫
        const k = 1 - d.splash / c.splashSec;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = v.splash;
        ctx.lineWidth = 3;
        circle(ctx, d.x, d.y, radius - 1.5);
        ctx.stroke();
        ctx.fillStyle = v.drop;
        for (let i = 0; i < v.crown; i++) {
          const a = (i / v.crown) * Math.PI * 2 + d.seed;
          const rr = radius * (0.3 + 0.6 * k);
          circle(ctx, d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.6 - Math.sin(k * Math.PI) * v.crownLift, 3);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    if (!v) return;
    // 湯気の範囲から立ちのぼる湯気
    for (const m of this.mists) {
      const k = Math.min(1, m.life / c.linger.durationSec * 2);
      drawWisps(ctx, m.x, m.y, { count: v.wisps, height: v.wispHeight, spread: radius * 1.4, size: 5, color: v.steam, alpha: v.steamAlpha * k, time: t, speed: 1.4, seed: m.seed });
    }
  }

  // 銅色の小さなドリッパー（(x, y) が中心）
  #drawDripper(ctx, x, y, v) {
    const w = v.dripperSize;
    ctx.fillStyle = v.dripper;
    ctx.beginPath();
    ctx.moveTo(x - w, y - w * 0.6);
    ctx.lineTo(x + w, y - w * 0.6);
    ctx.lineTo(x + w * 0.35, y + w * 0.4);
    ctx.lineTo(x - w * 0.35, y + w * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = v.dripperRim;
    ctx.fillRect(x - w * 1.1, y - w * 0.75, w * 2.2, 3);
    ctx.fillRect(x - w * 0.5, y + w * 0.4, w, 3);
  }
}
