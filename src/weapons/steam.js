import { CONFIG } from '../config.js';
import { Weapon, angleTo } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// 2 つの向きの差（0〜π）
const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// 一番近い敵の方向へ扇形に蒸気を吹き出し、押し返す
export class Steam extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.steam);
    this.puffs = [];
  }

  baseStats() {
    return { angleDeg: this.config.angleDeg, rangeRate: 1, directionsDeg: [0], knockbackRate: 1, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    const range = c.range * s.rangeRate;
    if (this.tick(dt)) {
      const target = g.nearestTarget(range);
      if (target) {
        this.timer = 0;
        const facing = angleTo(p, target);
        const all = s.angleDeg >= 360;
        const half = (s.angleDeg * Math.PI) / 360;
        const angles = all ? [facing] : s.directionsDeg.map((d) => facing + (d * Math.PI) / 180);
        const knockback = c.knockback * s.knockbackRate;
        for (const t of g.targetsInCircle(p.x, p.y, range)) {
          const toT = angleTo(p, t);
          // どれかの扇に入っていれば 1 回だけ当たる。全方向なら角度は見ない
          const inside = all || angles.some((a) => angleDiff(toT, a) <= half);
          if (!inside) continue;
          this.hit(t, c.damage * s.damageRate);
          // 押し返しは、その敵がいる扇の向き（全方向なら外向き）
          const push = all ? toT : angles.reduce((best, a) => (angleDiff(toT, a) < angleDiff(toT, best) ? a : best));
          g.knockback(t, Math.cos(push) * knockback, Math.sin(push) * knockback);
        }
        for (const a of angles) this.puffs.push({ angle: a, half: all ? Math.PI : half, range, life: c.puffLifeSec, seed: Math.random() * 100 });
      }
    }
    for (const f of this.puffs) f.life -= dt;
    this.puffs = this.puffs.filter((f) => f.life > 0);
  }

  draw(ctx) {
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    const c = this.config;
    const p = this.game.player;
    for (const f of this.puffs) {
      const k = f.life / c.puffLifeSec;
      const g = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, f.range);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.6 * k})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, f.range * (1.2 - f.life), f.angle - f.half, f.angle + f.half);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 全方向の蒸気。はっきりした部分の外の端が当たる半径（f.range）
  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const p = this.game.player;
    for (const f of this.puffs) {
      const k = f.life / this.config.puffLifeSec;
      const R = f.range;
      drawGlow(ctx, p.x, p.y, R * v.coreScale, v.core, v.coreAlpha * k);
      ctx.save();
      if (variant === 'A') {
        // もこもこした蒸気の雲：外周のかたまりが膨らむ
        ctx.fillStyle = v.cloud;
        const n = v.lumps;
        for (let i = 0; i < n; i++) {
          const L = v.lumpSize * (0.55 + 0.45 * (1 - k)) * (0.8 + 0.4 * hash(f.seed + i));
          const a = (i / n) * Math.PI * 2 + f.seed;
          ctx.globalAlpha = v.cloudAlpha * k;
          circle(ctx, p.x + Math.cos(a) * (R - L), p.y + Math.sin(a) * (R - L), L);
          ctx.fill();
        }
        ctx.fillStyle = v.inner;
        ctx.globalAlpha = v.innerAlpha * k;
        circle(ctx, p.x, p.y, R - v.lumpSize);
        ctx.fill();
      } else if (variant === 'B') {
        // 全方向へ吹き出す蒸気の筋。筋の先の湯気の玉の端が当たる半径
        ctx.lineCap = 'round';
        ctx.strokeStyle = v.jet;
        ctx.fillStyle = v.jet;
        ctx.lineWidth = v.jetWidth;
        ctx.globalAlpha = v.jetAlpha * k;
        for (let i = 0; i < v.jets; i++) {
          const a = (i / v.jets) * Math.PI * 2 + f.seed;
          const end = R - v.tipSize;
          const start = p.radius + (end - p.radius) * (0.6 * k);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * start, p.y + Math.sin(a) * start);
          ctx.lineTo(p.x + Math.cos(a) * end, p.y + Math.sin(a) * end);
          ctx.stroke();
          circle(ctx, p.x + Math.cos(a) * end, p.y + Math.sin(a) * end, v.tipSize);
          ctx.fill();
        }
      } else {
        // 外へ散っていく湯気の粒。一番外の粒の端が当たる半径
        ctx.fillStyle = v.puff;
        for (let i = 0; i < v.puffs; i++) {
          const a = hash(f.seed + i) * Math.PI * 2;
          const size = v.puffSize * (0.6 + 0.4 * hash(f.seed + i * 3));
          const d = (R - size) * (1 - (1 - hash(f.seed + i * 7) * v.depth) * k * 0.5);
          ctx.globalAlpha = v.puffAlpha * Math.min(1, k * 1.6);
          circle(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, size);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}
