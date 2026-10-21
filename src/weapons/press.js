import { CONFIG } from '../config.js';
import { Weapon, angleTo, dist } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// 一番近い敵の真上からフレンチプレスで押しつぶす
export class Press extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.press);
    this.blasts = [];
  }

  baseStats() {
    return { radiusRate: 1, delayRate: 1, targets: 1, crowd: false, knockback: 0, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    if (this.tick(dt)) {
      const radius = c.radius * s.radiusRate;
      const delay = c.delaySec * s.delayRate;
      const spots = s.crowd ? this.#crowdSpot(radius) : g.nearestTargets(c.range, s.targets);
      if (spots.length) {
        this.timer = 0;
        for (const t of spots) this.blasts.push({ x: t.x, y: t.y, radius, delay, timer: delay, flash: 0, seed: Math.random() * 100 });
      }
    }
    for (const b of this.blasts) {
      if (b.timer > 0) {
        b.timer -= dt;
        if (b.timer <= 0) {
          for (const t of g.targetsInCircle(b.x, b.y, b.radius)) {
            this.hit(t, c.damage * s.damageRate);
            if (!s.knockback) continue;
            const a = angleTo(b, t);
            g.knockback(t, Math.cos(a) * s.knockback, Math.sin(a) * s.knockback);
          }
          b.flash = s.crowd ? c.maxVisual.landSec : 0.25;
        }
      } else {
        b.flash -= dt;
      }
    }
    this.blasts = this.blasts.filter((b) => b.timer > 0 || b.flash > 0);
  }

  // MAX：射程内の敵それぞれを中心にした円のうち、中の敵が一番多い所（ボスは bossWeight 体分）
  #crowdSpot(radius) {
    const g = this.game;
    const c = this.config;
    const inRange = g.targets().filter((t) => dist(t, g.player) - t.radius < c.range);
    let best = null;
    let bestCount = 0;
    for (const center of inRange) {
      let count = 0;
      for (const t of inRange) {
        if (Math.hypot(t.x - center.x, t.y - center.y) < radius + t.radius) count += t === g.boss ? c.bossWeight : 1;
      }
      if (count > bestCount) {
        bestCount = count;
        best = center;
      }
    }
    return best ? [best] : [];
  }

  drawBelow(ctx) {
    if (this.isMax) {
      this.#drawMaxBelow(ctx);
      return;
    }
    for (const b of this.blasts) {
      if (b.timer <= 0) continue;
      ctx.strokeStyle = 'rgba(240, 200, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  draw(ctx) {
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    for (const b of this.blasts) {
      const r = b.radius;
      if (b.timer > 0) {
        // 上から降りてくるプランジャー
        const k = b.timer / b.delay;
        const y = b.y - k * 260;
        ctx.fillStyle = 'rgba(200, 220, 230, 0.55)';
        ctx.fillRect(b.x - r * 0.6, y - r * 1.2, r * 1.2, r * 1.2);
        ctx.fillStyle = '#4b4b4b';
        ctx.fillRect(b.x - r * 0.7, y - 6, r * 1.4, 8);
        ctx.fillRect(b.x - 4, y - r * 1.6, 8, r * 0.5);
      } else {
        ctx.fillStyle = `rgba(255, 230, 190, ${b.flash / 0.25 * 0.7})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 予告：当たる範囲ちょうどの円
  #drawMaxBelow(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    for (const b of this.blasts) {
      if (b.timer <= 0) continue;
      const r = b.radius;
      const k = b.timer / b.delay;
      ctx.save();
      if (variant === 'A') {
        // 予告円と、残り時間を示す線（上から時計回りに減る）
        ctx.fillStyle = v.zone;
        circle(ctx, b.x, b.y, r);
        ctx.fill();
        ctx.strokeStyle = v.ring;
        ctx.lineWidth = 3;
        circle(ctx, b.x, b.y, r - 1.5);
        ctx.stroke();
        ctx.strokeStyle = v.timer;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();
      } else if (variant === 'B') {
        // 濃くなっていく影と、狙いの十字
        ctx.fillStyle = v.shadow;
        ctx.globalAlpha = 0.35 + 0.65 * (1 - k);
        circle(ctx, b.x, b.y, r);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = v.ring;
        ctx.lineWidth = 3;
        circle(ctx, b.x, b.y, r - 1.5);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x - r, b.y);
        ctx.lineTo(b.x - r * 0.3, b.y);
        ctx.moveTo(b.x + r * 0.3, b.y);
        ctx.lineTo(b.x + r, b.y);
        ctx.moveTo(b.x, b.y - r);
        ctx.lineTo(b.x, b.y - r * 0.3);
        ctx.moveTo(b.x, b.y + r * 0.3);
        ctx.lineTo(b.x, b.y + r);
        ctx.stroke();
      } else {
        // 外から縮んでくる輪が、落ちる瞬間に当たる範囲の円に重なる
        ctx.strokeStyle = v.ring;
        ctx.lineWidth = 3;
        circle(ctx, b.x, b.y, r - 1.5);
        ctx.stroke();
        ctx.strokeStyle = v.closing;
        for (let i = 0; i < v.closingRings; i++) {
          const rr = r * (1 + k * v.closingSpread * (1 + i * 0.5));
          ctx.globalAlpha = 0.6 * (1 - k * 0.5);
          circle(ctx, b.x, b.y, rr - 1.5);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    for (const b of this.blasts) {
      const r = b.radius;
      if (b.timer > 0) {
        const k = b.timer / b.delay;
        this.#drawPress(ctx, b.x, b.y - k * v.fallHeight, r, v);
        continue;
      }
      // 着地：衝撃の輪と飛び散るもの。はっきりした部分は当たる半径の中
      const k = 1 - b.flash / this.config.maxVisual.landSec;
      ctx.save();
      if (variant === 'A') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = v.shock;
        ctx.lineWidth = 6;
        circle(ctx, b.x, b.y, r * (0.5 + 0.5 * k) - 3);
        ctx.stroke();
        ctx.fillStyle = v.grounds;
        for (let i = 0; i < v.groundCount; i++) {
          const a = hash(b.seed + i) * Math.PI * 2;
          const d = r * (0.3 + 0.7 * k * (0.5 + 0.5 * hash(b.seed + i * 3)));
          ctx.fillRect(b.x + Math.cos(a) * d - 2, b.y + Math.sin(a) * d - 2 - Math.sin(k * Math.PI) * 12, 4, 4);
        }
      } else if (variant === 'B') {
        // 縁に湧き上がる土ぼこりと、床に走るひび
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = v.crack;
        ctx.lineWidth = 3;
        for (let i = 0; i < v.cracks; i++) {
          const a = (i / v.cracks) * Math.PI * 2 + b.seed;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(a) * r * 0.25, b.y + Math.sin(a) * r * 0.25);
          ctx.lineTo(b.x + Math.cos(a + 0.12) * r * 0.6, b.y + Math.sin(a + 0.12) * r * 0.6);
          ctx.lineTo(b.x + Math.cos(a - 0.05) * (r - 2), b.y + Math.sin(a - 0.05) * (r - 2));
          ctx.stroke();
        }
        ctx.fillStyle = v.dust;
        for (let i = 0; i < v.dustCount; i++) {
          const a = (i / v.dustCount) * Math.PI * 2 + b.seed;
          const L = v.dustSize * (0.6 + 0.6 * k) * (0.7 + 0.3 * hash(b.seed + i));
          ctx.globalAlpha = 0.6 * (1 - k);
          circle(ctx, b.x + Math.cos(a) * (r - L), b.y + Math.sin(a) * (r - L), L);
          ctx.fill();
        }
      } else {
        // 珈琲が王冠のように跳ねる
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.fillStyle = v.splash;
        circle(ctx, b.x, b.y, r * (0.6 + 0.4 * k));
        ctx.fill();
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = v.drop;
        for (let i = 0; i < v.drops; i++) {
          const a = (i / v.drops) * Math.PI * 2 + b.seed;
          const d = (r - 4) * (0.6 + 0.4 * k);
          circle(ctx, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - Math.sin(k * Math.PI) * v.dropLift, 4);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // 巨大なプレス：ガラスの容器に珈琲とクレマ、金属のふたとつまみ。幅は当たる直径より狭い
  #drawPress(ctx, x, bottom, r, v) {
    const w = r * v.widthRate;
    const h = r * v.heightRate;
    const top = bottom - h;
    ctx.save();
    drawGlow(ctx, x, bottom - h / 2, r * 0.9, v.glow, v.glowAlpha);
    ctx.fillStyle = v.frame;
    ctx.fillRect(x - w / 2 - 3, top, 3, h);
    ctx.fillRect(x + w / 2, top, 3, h);
    ctx.fillRect(x - w / 2 - 3, bottom - 6, w + 6, 6);
    ctx.fillStyle = v.glass;
    ctx.fillRect(x - w / 2, top, w, h - 6);
    ctx.fillStyle = v.coffee;
    ctx.fillRect(x - w / 2, top + h * v.emptyRate, w, h * (1 - v.emptyRate) - 6);
    ctx.fillStyle = v.crema;
    ctx.fillRect(x - w / 2, top + h * v.emptyRate, w, 6);
    ctx.fillStyle = v.lid;
    ctx.fillRect(x - w / 2 - 6, top - 9, w + 12, 9);
    ctx.fillRect(x - 3, top - 9 - h * 0.3, 6, h * 0.3);
    ctx.fillStyle = v.knob;
    ctx.fillRect(x - 9, top - 18 - h * 0.3, 18, 12);
    ctx.restore();
  }
}
