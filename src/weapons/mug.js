import { CONFIG } from '../config.js';
import { Weapon, HitTracker, angleTo, dist } from './base.js';
import { drawGlow, drawWisps, hash, circle } from './max-fx.js';

// 投げると戻ってくるマグカップ。敵を貫通する
export class Mug extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mug);
    this.mugs = [];
    // MAX のしぶきの見た目（当たるのは折り返す瞬間の 1 回だけ）
    this.splashes = [];
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
          this.mugs.push({ x: p.x, y: p.y, angle, radius: c.radius * s.sizeRate, travelled: 0, returning: false, spin: 0, spent: false, seed: i * 17 });
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
          this.splashes.push({ x: m.x, y: m.y, life: c.splashFxSec, seed: Math.random() * 100 });
        }
      }
      if (m.returning && dist(m, p) < p.radius) m.spent = true;
      for (const t of g.targetsInCircle(m.x, m.y, m.radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    this.mugs = this.mugs.filter((m) => !m.spent);
    for (const sp of this.splashes) sp.life -= dt;
    this.splashes = this.splashes.filter((sp) => sp.life > 0);
  }

  // マグの絵。大きさは当たる半径 r に収める（取っ手の先まで）
  #drawMug(ctx, m, { body = '#f4efe6', coffee = '#5a341f', crema = null, rim = null }) {
    const r = m.radius;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.spin);
    ctx.strokeStyle = body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r * 0.7, 0, r * 0.4, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = body;
    ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    if (rim) {
      ctx.fillStyle = rim;
      ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 0.2);
    }
    ctx.fillStyle = coffee;
    ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, crema ? r * 0.6 : r * 0.35);
    if (crema) {
      // なみなみの液面とクレマの縁
      ctx.fillStyle = crema;
      ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 0.18);
    }
    ctx.restore();
  }

  draw(ctx) {
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    for (const m of this.mugs) this.#drawMug(ctx, m, {});
  }

  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const R = this.config.splashRadius;
    const t = this.game.time;
    const speed = this.config.speed * this.stats.speedRate;
    // しぶき：はっきりした縁がちょうど当たる半径
    for (const sp of this.splashes) {
      const k = 1 - sp.life / this.config.splashFxSec;
      ctx.save();
      if (variant === 'A') {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = v.splashFill;
        circle(ctx, sp.x, sp.y, R);
        ctx.fill();
        ctx.strokeStyle = v.splashEdge;
        ctx.lineWidth = 3;
        circle(ctx, sp.x, sp.y, R - 1.5);
        ctx.stroke();
        ctx.fillStyle = v.drop;
        for (let i = 0; i < v.drops; i++) {
          const a = hash(sp.seed + i) * Math.PI * 2;
          const d = R * (0.3 + 0.7 * k) * (0.6 + 0.4 * hash(sp.seed + i * 3));
          circle(ctx, sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d, v.dropSize);
          ctx.fill();
        }
      } else if (variant === 'B') {
        drawGlow(ctx, sp.x, sp.y, R, v.glow, (1 - k) * 0.8);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = v.spike;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < v.spikes; i++) {
          const a = (i / v.spikes) * Math.PI * 2 + sp.seed;
          const d0 = R * (0.25 + 0.5 * k);
          ctx.beginPath();
          ctx.moveTo(sp.x + Math.cos(a) * d0, sp.y + Math.sin(a) * d0);
          ctx.lineTo(sp.x + Math.cos(a) * (R - 1.5), sp.y + Math.sin(a) * (R - 1.5));
          ctx.stroke();
        }
      } else {
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.strokeStyle = v.ring;
        ctx.lineWidth = 2;
        circle(ctx, sp.x, sp.y, R * (0.5 + 0.5 * k));
        ctx.stroke();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = v.drop;
        for (let i = 0; i < v.drops; i++) {
          const a = (i / v.drops) * Math.PI * 2 + sp.seed;
          const d = R - v.dropSize;
          circle(ctx, sp.x + Math.cos(a) * d, sp.y + Math.sin(a) * d - Math.sin(k * Math.PI) * v.dropLift, v.dropSize);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    for (const m of this.mugs) {
      const r = m.radius;
      const dx = Math.cos(m.angle) * speed;
      const dy = Math.sin(m.angle) * speed;
      if (variant === 'A') {
        // オレンジの光と、立ちのぼる湯気
        drawGlow(ctx, m.x, m.y, r * v.glowScale, v.glow, v.glowAlpha);
        drawWisps(ctx, m.x, m.y - r * 0.6, { count: v.wisps, height: v.wispHeight, spread: r, size: v.wispSize, color: v.steam, alpha: v.steamAlpha, time: t, speed: 2, seed: m.seed });
      } else if (variant === 'B') {
        // 進む向きの後ろへ伸びる炎の尾
        for (let i = 1; i <= v.tail; i++) {
          const back = i * v.tailGapSec;
          drawGlow(ctx, m.x - dx * back, m.y - dy * back, r * (1.4 - i * 0.18), i % 2 ? v.glow : v.glowHot, v.glowAlpha * (1 - i / (v.tail + 1)));
        }
      } else {
        // 後ろに残る湯気の輪
        ctx.save();
        ctx.strokeStyle = v.steam;
        ctx.lineWidth = 3;
        for (let i = 1; i <= v.tail; i++) {
          const back = i * v.tailGapSec;
          ctx.globalAlpha = v.steamAlpha * (1 - i / (v.tail + 1));
          circle(ctx, m.x - dx * back, m.y - dy * back, r * (0.5 + i * 0.12));
          ctx.stroke();
        }
        ctx.restore();
      }
      this.#drawMug(ctx, m, v);
    }
  }
}
