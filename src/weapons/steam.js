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
    return { angleDeg: this.config.angleDeg, rangeRate: 0.4, directionsDeg: [0], knockbackRate: 1, damageRate: 1 };
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

  // 扇のふち（当たる半径の端）に並べる
  levelSpots() {
    const p = this.game.player;
    const { puffLifeSec, levelSpot } = this.config;
    return this.puffs.flatMap((f) => Array.from({ length: levelSpot.count }, (_, i) => {
      const a = f.angle - f.half + ((i + 0.5) / levelSpot.count) * f.half * 2;
      const d = f.range - levelSpot.radius;
      return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: levelSpot.radius, k: f.life / puffLifeSec };
    }));
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

  // 全方向の蒸気：芯の暖色の光から、外へ散っていく湯気の粒。一番外の粒の端が当たる半径（f.range）
  #drawMax(ctx) {
    const v = this.config.maxVisual;
    const p = this.game.player;
    for (const f of this.puffs) {
      const k = f.life / this.config.puffLifeSec;
      const R = f.range;
      drawGlow(ctx, p.x, p.y, R * v.coreScale, v.core, v.coreAlpha * k);
      ctx.save();
      ctx.fillStyle = v.puff;
      ctx.globalAlpha = v.puffAlpha * Math.min(1, k * 1.6);
      for (let i = 0; i < v.puffs; i++) {
        const a = hash(f.seed + i) * Math.PI * 2;
        const size = v.puffSize * (0.6 + 0.4 * hash(f.seed + i * 3));
        const d = (R - size) * (1 - (1 - hash(f.seed + i * 7) * v.depth) * k * 0.5);
        circle(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, size);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
