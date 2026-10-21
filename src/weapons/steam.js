import { CONFIG } from '../config.js';
import { Weapon, angleTo } from './base.js';

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
        for (const a of angles) this.puffs.push({ angle: a, half: all ? Math.PI : half, range, life: c.puffLifeSec });
      }
    }
    for (const f of this.puffs) f.life -= dt;
    this.puffs = this.puffs.filter((f) => f.life > 0);
  }

  draw(ctx) {
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
}
