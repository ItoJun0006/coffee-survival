import { CONFIG } from '../config.js';
import { Weapon, Projectile } from './base.js';

// 氷を全方向に飛ばし、当たった敵を凍らせて止める
export class Ice extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.ice);
    this.shards = [];
    this.offset = 0;
  }

  baseStats() {
    return { shards: this.config.shards, freezeRate: 1, pierce: 1, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    if (this.tick(dt)) {
      this.timer = 0;
      this.offset += 0.4;
      for (let i = 0; i < s.shards; i++) {
        const a = this.offset + (i / s.shards) * Math.PI * 2;
        const shard = new Projectile(g.player.x, g.player.y, a, c.speed, c.radius, c.range);
        shard.hits = new Set();
        this.shards.push(shard);
      }
    }
    for (const shard of this.shards) {
      shard.update(dt);
      // 当たれる残りの数だけ、近い順に当てる。数を使い切ったら氷は消える
      const hits = g.targetsInCircle(shard.x, shard.y, shard.radius).filter((t) => !shard.hits.has(t));
      if (!hits.length) continue;
      hits.sort((p, q) => Math.hypot(p.x - shard.x, p.y - shard.y) - Math.hypot(q.x - shard.x, q.y - shard.y));
      for (const t of hits.slice(0, s.pierce - shard.hits.size)) {
        shard.hits.add(t);
        this.#strike(t);
      }
      if (shard.hits.size >= s.pierce) shard.spent = true;
    }
    this.shards = this.shards.filter((shard) => !shard.spent);
  }

  // Lv 6 から：凍っている敵は砕いて大ダメージ（凍らせ直さない）。それ以外は凍らせる
  #strike(t) {
    const c = this.config;
    const s = this.stats;
    const damage = c.damage * s.damageRate;
    if (s.shatterRate && t.frozen) {
      this.hit(t, damage * s.shatterRate);
      t.thaw();
      return;
    }
    this.hit(t, damage);
    this.game.freeze(t, c.freezeSec * s.freezeRate, c.refreezeGuardSec);
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
