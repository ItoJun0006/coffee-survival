import { CONFIG } from '../config.js';
import { Weapon, Projectile } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// 氷を 1 つだけ、ランダムな向きに飛ばす。敵に当たるか届く距離まで飛んだら、その場で氷塊になって
// 周りの敵にまとめてダメージを与えて凍らせる（仕様 012 FR-011）。MAX は氷塊のあとに氷の床が残る
export class Ice extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.ice);
    this.shards = [];
    // 割れている途中の氷塊と、残っている氷の床
    this.blocks = [];
    this.floors = [];
  }

  baseStats() {
    return { blockRate: 1, freezeRate: 1, floor: null };
  }

  get blockRadius() {
    return this.config.blockRadius * this.stats.blockRate;
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    if (this.tick(dt)) {
      this.timer = 0;
      // directions 方向（60 なら 6° きざみ）からランダムに 1 つ選ぶ
      const a = (Math.floor(Math.random() * c.directions) / c.directions) * Math.PI * 2;
      const shard = new Projectile(g.player.x, g.player.y, a, c.speed, c.radius, c.range);
      shard.seed = Math.random() * 100;
      this.shards.push(shard);
    }
    for (const shard of this.shards) {
      shard.update(dt);
      // 敵に当たるか、届く距離まで飛んだら氷塊になる
      if (shard.spent || g.targetsInCircle(shard.x, shard.y, shard.radius).length) {
        shard.spent = true;
        this.#burst(shard.x, shard.y);
      }
    }
    this.shards = this.shards.filter((shard) => !shard.spent);
    for (const b of this.blocks) b.age += dt;
    this.blocks = this.blocks.filter((b) => b.age < c.blockVisual.blockSec);
    this.#updateFloors(dt);
  }

  // 氷塊：範囲の中の敵にまとめてダメージを与えて凍らせる。Lv 6 から、凍っている敵は砕いて大ダメージ
  #burst(x, y) {
    const c = this.config;
    const s = this.stats;
    const r = this.blockRadius;
    for (const t of this.game.targetsInCircle(x, y, r)) {
      if (s.shatterRate && t.frozen) {
        this.hit(t, c.damage * s.shatterRate);
        t.thaw();
        continue;
      }
      this.hit(t, c.damage);
      this.game.freeze(t, c.freezeSec * s.freezeRate, c.refreezeGuardSec);
    }
    this.blocks.push({ x, y, r, age: 0, seed: Math.random() * 100 });
    if (s.floor) this.floors.push({ x, y, r, age: 0, tick: 0 });
  }

  // MAX：氷の床の上にいる敵を、tickSec ごとに凍らせる（凍りが解けた直後は凍らない）
  #updateFloors(dt) {
    const f = this.stats.floor;
    if (!f) {
      this.floors = [];
      return;
    }
    const c = this.config;
    for (const fl of this.floors) {
      fl.age += dt;
      fl.tick -= dt;
      if (fl.tick > 0) continue;
      fl.tick = f.tickSec;
      for (const t of this.game.targetsInCircle(fl.x, fl.y, fl.r)) this.game.freeze(t, c.freezeSec * this.stats.freezeRate, c.refreezeGuardSec);
    }
    this.floors = this.floors.filter((fl) => fl.age < f.sec);
  }

  levelSpots() {
    return this.shards.map((s) => ({ x: s.x, y: s.y, r: s.radius }));
  }

  // 敵より下に、氷の床を描く
  drawBelow(ctx) {
    const v = this.config.blockVisual;
    const f = this.stats.floor;
    for (const fl of this.floors) {
      const fade = Math.min(1, (f.sec - fl.age) / 0.3);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = v.floor;
      circle(ctx, fl.x, fl.y, fl.r);
      ctx.fill();
      ctx.strokeStyle = v.floorEdge;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }

  draw(ctx) {
    for (const b of this.blocks) this.#drawBlock(ctx, b);
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

  // 氷塊が割れる演出。k は 0（出た瞬間）〜1（消える）。はっきり描く部分は当たる範囲 r の中に収める
  #drawBlock(ctx, b) {
    const v = this.config.blockVisual;
    const k = b.age / v.blockSec;
    const fade = 1 - k;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (v.look === 'A') {
      // A：氷の塊がドンと現れ、割れて破片が外へ飛び散る
      if (k < 0.35) {
        const grow = 0.6 + (k / 0.35) * 0.4;
        const s = b.r * 0.55 * grow;
        ctx.fillStyle = v.ice;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + b.seed;
          const rr = s * (0.8 + hash(b.seed + i) * 0.3);
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = v.light;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const t = (k - 0.35) / 0.65;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = v.ice;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + b.seed;
          const d = b.r * (0.3 + t * 0.6);
          ctx.save();
          ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
          ctx.rotate(a + t * 4);
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        }
      }
    } else if (v.look === 'B') {
      // B：青白い輪が範囲いっぱいまで広がり、真ん中に氷の結晶の柱が立つ
      ctx.globalAlpha = fade;
      ctx.strokeStyle = v.glow;
      ctx.lineWidth = 4;
      circle(ctx, 0, 0, b.r * (0.3 + 0.7 * Math.min(1, k * 2)));
      ctx.stroke();
      // 結晶の柱 3 本（真ん中が高い）。下からせり上がる
      const rise = Math.min(1, k * 3);
      for (const [dx, hRate] of [[-16, 0.55], [0, 0.85], [16, 0.55]]) {
        const hgt = b.r * hRate * rise;
        ctx.fillStyle = v.ice;
        ctx.beginPath();
        ctx.moveTo(dx - 7, 10);
        ctx.lineTo(dx - 7, 10 - hgt * 0.7);
        ctx.lineTo(dx, 10 - hgt);
        ctx.lineTo(dx + 7, 10 - hgt * 0.7);
        ctx.lineTo(dx + 7, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = v.light;
        ctx.fillRect(dx - 2, 10 - hgt * 0.8, 3, hgt * 0.6);
      }
    } else {
      // C：霜が地面に一気に広がり、雪の結晶の模様を残して消える
      ctx.globalAlpha = 0.85 * fade;
      ctx.fillStyle = v.floor;
      circle(ctx, 0, 0, b.r * Math.min(1, 0.4 + k * 2));
      ctx.fill();
      ctx.strokeStyle = v.light;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + b.seed;
        const len = b.r * 0.9 * Math.min(1, 0.4 + k * 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        // 枝
        const mx = Math.cos(a) * len * 0.55;
        const my = Math.sin(a) * len * 0.55;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a + 0.6) * len * 0.25, my + Math.sin(a + 0.6) * len * 0.25);
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a - 0.6) * len * 0.25, my + Math.sin(a - 0.6) * len * 0.25);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 白い芯とシアンの淡い光をまとい、回りながら飛ぶ 6 本腕の雪の結晶。腕の先までが当たる半径。後ろにきらめきを残す
  #drawMax(ctx) {
    const v = this.config.maxVisual;
    const t = this.game.time;
    for (const s of this.shards) {
      const r = s.radius;
      const ux = Math.cos(s.angle);
      const uy = Math.sin(s.angle);
      drawGlow(ctx, s.x, s.y, r * v.glowScale, v.glow, v.glowAlpha);
      ctx.save();
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
      ctx.restore();
    }
  }
}
