import { CONFIG } from '../config.js';
import { Weapon, Projectile } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

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
        shard.seed = i * 13 + this.offset;
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
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
    ctx.fillStyle = '#cfeaff';
    for (const s of this.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle + Math.PI / 4);
      ctx.fillRect(-s.radius * 0.7, -s.radius * 0.7, s.radius * 1.4, s.radius * 1.4);
      ctx.restore();
    }
  }

  // 氷の MAX。はっきりした絵の端（結晶の腕の先など）が当たる半径
  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const t = this.game.time;
    for (const s of this.shards) {
      const r = s.radius;
      const ux = Math.cos(s.angle);
      const uy = Math.sin(s.angle);
      drawGlow(ctx, s.x, s.y, r * v.glowScale, v.glow, v.glowAlpha);
      ctx.save();
      // 後ろに残るきらめき・霜の粒
      ctx.fillStyle = v.sparkle;
      for (let i = 1; i <= v.sparkles; i++) {
        const back = i * v.sparkleGap;
        const side = (hash(s.seed + i) - 0.5) * r * 2;
        ctx.globalAlpha = v.sparkleAlpha * (1 - i / (v.sparkles + 1)) * (0.5 + 0.5 * Math.sin(t * 20 + i + s.seed));
        ctx.fillRect(s.x - ux * back - uy * side - 1.5, s.y - uy * back + ux * side - 1.5, 3, 3);
      }
      ctx.restore();
      ctx.save();
      ctx.translate(s.x, s.y);
      if (variant === 'A') {
        // 回りながら飛ぶ 6 本腕の雪の結晶
        ctx.rotate(t * v.spin + s.seed);
        ctx.strokeStyle = v.arm;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (r - 1.5), Math.sin(a) * (r - 1.5));
          ctx.stroke();
        }
        ctx.fillStyle = v.core;
        circle(ctx, 0, 0, r * 0.35);
        ctx.fill();
      } else if (variant === 'B') {
        // 進む向きにとがった氷の槍
        ctx.rotate(s.angle);
        ctx.fillStyle = v.body;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(0, r * v.width);
        ctx.lineTo(-r, 0);
        ctx.lineTo(0, -r * v.width);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = v.core;
        ctx.fillRect(-r * 0.2, -r * v.width * 0.5, r * 0.9, r * v.width * 0.5);
      } else {
        // きらめく八角の氷の宝石と、まわりの星のきらめき
        ctx.rotate(t * v.spin + s.seed);
        ctx.fillStyle = v.body;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = v.core;
        ctx.fillRect(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
        ctx.rotate(-(t * v.spin + s.seed));
        ctx.strokeStyle = v.star;
        ctx.lineWidth = 2;
        const tw = Math.max(0, Math.sin(t * v.twinkle + s.seed));
        ctx.globalAlpha = 0.6 * tw;
        const d = r * v.starDist;
        const L = r * v.starSize * tw;
        ctx.beginPath();
        ctx.moveTo(d - L, -d);
        ctx.lineTo(d + L, -d);
        ctx.moveTo(d, -d - L);
        ctx.lineTo(d, -d + L);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
