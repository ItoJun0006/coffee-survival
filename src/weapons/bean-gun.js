import { CONFIG } from '../config.js';
import { Weapon, Projectile, angleTo } from './base.js';

// 射程内で一番近い敵に豆を連射する。Lv ごとに豆の数・飛距離・射程が伸び、MAX では貫通する
export class BeanGun extends Weapon {
  constructor(game, config = CONFIG.weapons.beanGun) {
    super(game, config);
    this.bullets = [];
    this.flashTimer = 0;
  }

  // 今の Lv までに受けた特別な強化をまとめたもの
  get stats() {
    const c = this.config;
    const s = { count: c.baseCount ?? 1, spreadDeg: c.baseSpreadDeg ?? 0, flightRate: c.flightRate, rangeRate: 1, pierce: false, damageRate: 1 };
    for (const [lv, up] of Object.entries(c.upgrades)) {
      if (this.level < Number(lv)) continue;
      if (up.count) Object.assign(s, { count: up.count, spreadDeg: up.spreadDeg });
      if (up.flightRate) s.flightRate *= up.flightRate;
      if (up.rangeRate) s.rangeRate *= up.rangeRate;
      if (up.pierce) s.pierce = true;
      if (up.damageRate) s.damageRate *= up.damageRate;
    }
    return s;
  }

  get commonUpgrades() {
    return this.config.commonLevels.filter((lv) => this.level >= lv).length;
  }

  upgradeDesc(nextLevel) {
    return this.config.upgrades[nextLevel]?.desc ?? this.config.commonDesc;
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.tick(dt)) {
      const range = c.range * s.rangeRate;
      const target = g.nearestTarget(range);
      if (target) {
        this.timer = 0;
        const base = angleTo(g.player, target);
        const step = (s.spreadDeg * Math.PI) / 180;
        for (let i = 0; i < s.count; i++) {
          const angle = base + (i - (s.count - 1) / 2) * step;
          const b = new Projectile(g.player.x, g.player.y, angle, c.speed, c.radius, c.range * s.flightRate);
          b.hits = new Set();
          b.trail = [];
          b.trailTimer = 0;
          this.bullets.push(b);
        }
        if (this.isMax) this.flashTimer = c.maxVisual.flashSec;
      }
    }
    for (const b of this.bullets) {
      if (this.isMax) this.#recordTrail(b, dt);
      b.update(dt);
      const hits = g.targetsInCircle(b.x, b.y, b.radius).filter((t) => !b.hits.has(t));
      if (!hits.length) continue;
      for (const t of s.pierce ? hits : hits.slice(0, 1)) {
        b.hits.add(t);
        this.hit(t, c.damage * s.damageRate);
      }
      if (!s.pierce) b.spent = true;
    }
    this.bullets = this.bullets.filter((b) => !b.spent);
  }

  // MAX の残像用に、少し前の位置を覚えておく
  #recordTrail(b, dt) {
    const v = this.config.maxVisual;
    b.trailTimer += dt;
    if (b.trailTimer < v.trailGapSec) return;
    b.trailTimer = 0;
    b.trail.unshift({ x: b.x, y: b.y });
    b.trail.length = Math.min(b.trail.length, v.trail);
  }

  draw(ctx) {
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    ctx.fillStyle = CONFIG.colors.bullet;
    for (const b of this.bullets) this.#bean(ctx, b.x, b.y, b.radius, b.angle);
  }

  #bean(ctx, x, y, r, angle) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.8, r, angle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 焙煎の炎をまとった豆：光の輪・残像の尾・撃った瞬間の光
  #drawMax(ctx) {
    const v = this.config.maxVisual;
    const p = this.game.player;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (this.flashTimer > 0) {
      const k = this.flashTimer / v.flashSec;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, v.flashRadius);
      grad.addColorStop(0, v.core);
      grad.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.globalAlpha = k;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, v.flashRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of this.bullets) {
      b.trail.forEach((t, i) => {
        ctx.globalAlpha = 0.45 * (1 - (i + 1) / (v.trail + 1));
        ctx.fillStyle = v.glow;
        this.#bean(ctx, t.x, t.y, b.radius * (1 - i * 0.12), b.angle);
      });
      const gr = b.radius * v.glowScale;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, gr);
      grad.addColorStop(0, v.core);
      grad.addColorStop(0.4, v.glow);
      grad.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, gr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 豆そのものは光の上に、いつもの色で描く（当たる範囲と同じ大きさ）
    ctx.fillStyle = CONFIG.colors.bullet;
    for (const b of this.bullets) this.#bean(ctx, b.x, b.y, b.radius, b.angle);
  }
}
