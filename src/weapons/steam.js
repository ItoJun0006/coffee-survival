import { CONFIG } from '../config.js';
import { Weapon, angleTo } from './base.js';

// 一番近い敵の方向へ扇形に蒸気を吹き出し、押し返す
export class Steam extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.steam);
    this.puffs = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const p = g.player;
    if (this.tick(dt)) {
      const target = g.nearestTarget(c.range);
      if (target) {
        this.timer = 0;
        const facing = angleTo(p, target);
        const half = (c.angleDeg * Math.PI) / 360;
        for (const t of g.targetsInCircle(p.x, p.y, c.range)) {
          const diff = Math.abs(Math.atan2(Math.sin(angleTo(p, t) - facing), Math.cos(angleTo(p, t) - facing)));
          if (diff > half) continue;
          this.hit(t);
          g.knockback(t, Math.cos(facing) * c.knockback, Math.sin(facing) * c.knockback);
        }
        this.puffs.push({ angle: facing, life: 0.35 });
      }
    }
    for (const f of this.puffs) f.life -= dt;
    this.puffs = this.puffs.filter((f) => f.life > 0);
  }

  draw(ctx) {
    const c = this.config;
    const p = this.game.player;
    const half = (c.angleDeg * Math.PI) / 360;
    for (const f of this.puffs) {
      const g = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, c.range);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.6 * (f.life / 0.35)})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, c.range * (1.2 - f.life), f.angle - half, f.angle + half);
      ctx.closePath();
      ctx.fill();
    }
  }
}
