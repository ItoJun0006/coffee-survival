import { CONFIG } from '../config.js';
import { Weapon, Projectile } from './base.js';

// 氷を全方向に飛ばし、当たった敵を凍らせて止める
export class Ice extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.ice);
    this.shards = [];
    this.offset = 0;
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      this.timer = 0;
      this.offset += 0.4;
      for (let i = 0; i < c.shards; i++) {
        const a = this.offset + (i / c.shards) * Math.PI * 2;
        this.shards.push(new Projectile(g.player.x, g.player.y, a, c.speed, c.radius, c.range));
      }
    }
    for (const s of this.shards) {
      s.update(dt);
      const hit = g.targetsInCircle(s.x, s.y, s.radius)[0];
      if (!hit) continue;
      this.hit(hit);
      g.freeze(hit, c.freezeSec);
      s.spent = true;
    }
    this.shards = this.shards.filter((s) => !s.spent);
  }

  draw(ctx) {
    ctx.fillStyle = '#cfeaff';
    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle + Math.PI / 4);
      ctx.fillRect(-s.radius * 0.7, -s.radius * 0.7, s.radius * 1.4, s.radius * 1.4);
      ctx.restore();
    }
  }
}
