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
    return { count: 2, spreadDeg: 0, sizeRate: 1, rangeRate: 0.5, speedRate: 0.6 };
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

  levelSpots() {
    return this.mugs.map((m) => ({ x: m.x, y: m.y, r: m.radius }));
  }

  // マグの絵。大きさは当たる半径 r に収める（取っ手の先まで）
  #drawMug(ctx, m, { coffee = '#5a341f', crema = null }) {
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
    const v = this.config.maxVisual;
    const R = this.config.splashRadius;
    const t = this.game.time;
    // しぶき：はっきりした縁がちょうど当たる半径
    for (const sp of this.splashes) {
      const k = 1 - sp.life / this.config.splashFxSec;
      ctx.save();
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
      ctx.restore();
    }
    // 熱い珈琲でなみなみのマグに、オレンジの光と立ちのぼる湯気
    for (const m of this.mugs) {
      const r = m.radius;
      drawGlow(ctx, m.x, m.y, r * v.glowScale, v.glow, v.glowAlpha);
      drawWisps(ctx, m.x, m.y - r * 0.6, { count: v.wisps, height: v.wispHeight, spread: r, size: v.wispSize, color: v.steam, alpha: v.steamAlpha, time: t, speed: 2, seed: m.seed });
      this.#drawMug(ctx, m, v);
    }
  }
}
