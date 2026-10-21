import { CONFIG } from '../config.js';
import { Weapon, Projectile, angleTo } from './base.js';

// 射程内で一番近い敵に豆を連射する
export class BeanGun extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.beanGun);
    this.bullets = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      const target = g.nearestTarget(c.range);
      if (target) {
        this.timer = 0;
        this.bullets.push(new Projectile(g.player.x, g.player.y, angleTo(g.player, target), c.speed, c.radius, c.range * 1.5));
      }
    }
    for (const b of this.bullets) {
      b.update(dt);
      const hit = g.targetsInCircle(b.x, b.y, b.radius)[0];
      if (!hit) continue;
      this.hit(hit);
      b.spent = true;
    }
    this.bullets = this.bullets.filter((b) => !b.spent);
  }

  draw(ctx) {
    ctx.fillStyle = CONFIG.colors.bullet;
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.radius * 0.8, b.radius, b.angle + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
