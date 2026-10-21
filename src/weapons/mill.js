import { CONFIG } from '../config.js';
import { Weapon, HitTracker } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

// プレイヤーの周りを回るミルの刃
export class Mill extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.mill);
    this.angle = 0;
    this.time = 0;
    this.hits = new HitTracker(this.config.hitCooldownSec);
  }

  baseStats() {
    return { count: this.config.count, bladeRate: 1, spinRate: 1 };
  }

  // 今の回る半径。MAX は周期的に伸び縮みする
  get orbitRadius() {
    const r = this.config.orbitRadius;
    const pulse = this.stats.pulse;
    if (!pulse) return r;
    const k = (1 - Math.cos((this.time / pulse.periodSec) * Math.PI * 2)) / 2;
    return r * (pulse.minRate + (pulse.maxRate - pulse.minRate) * k);
  }

  get bladeRadius() {
    return this.config.bladeRadius * this.stats.bladeRate;
  }

  #blades() {
    const p = this.game.player;
    const { count } = this.stats;
    const orbit = this.orbitRadius;
    return Array.from({ length: count }, (_, i) => {
      const a = this.angle + (i / count) * Math.PI * 2;
      return { x: p.x + Math.cos(a) * orbit, y: p.y + Math.sin(a) * orbit, a };
    });
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    this.time += dt;
    this.angle += c.angularSpeed * s.spinRate * dt;
    // ミルは発動しないので、攻撃の間隔の強化は同じ敵に当たる間隔に効く
    this.hits.cooldownSec = c.hitCooldownSec * this.intervalRate;
    const blade = this.bladeRadius;
    const reach = c.orbitRadius * (s.pulse?.maxRate ?? 1) + blade;
    // 刃が届きうる円の中の敵だけを、刃と比べる
    const near = g.targets().filter((t) => Math.hypot(t.x - p.x, t.y - p.y) < reach + t.radius);
    if (!near.length) return;
    for (const b of this.#blades()) {
      for (const t of near) {
        if (Math.hypot(t.x - b.x, t.y - b.y) >= blade + t.radius) continue;
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
  }

  // 刃の形（8 つの角の星形）。外側の角が半径 r
  #bladePath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.55;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  #drawBlade(ctx, b, r, { blade, edge, hub, edgeRate = 0 }) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a * 3);
    if (edge) {
      // 明るい縁：外側を縁の色で塗り、内側を刃の色で塗る（縁まで含めて半径 r）
      ctx.fillStyle = edge;
      this.#bladePath(ctx, r);
      ctx.fill();
    }
    ctx.fillStyle = blade;
    this.#bladePath(ctx, edge ? r * (1 - edgeRate) : r);
    ctx.fill();
    ctx.fillStyle = hub;
    circle(ctx, 0, 0, r * 0.3);
    ctx.fill();
    ctx.restore();
  }

  drawBelow(ctx) {
    if (!this.isMax) return;
    const v = this.config.maxVisual[this.maxVariant];
    if (!v.band) return;
    // 刃の通り道の帯（刃の幅ちょうど）
    const p = this.game.player;
    ctx.strokeStyle = v.band;
    ctx.lineWidth = this.bladeRadius * 2;
    circle(ctx, p.x, p.y, this.orbitRadius);
    ctx.stroke();
  }

  draw(ctx) {
    const r = this.bladeRadius;
    if (this.isMax) {
      this.#drawMax(ctx, r);
      return;
    }
    for (const b of this.#blades()) this.#drawBlade(ctx, b, r, { blade: '#9a9a9a', hub: '#5b5b5b' });
  }

  #drawMax(ctx, r) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const blades = this.#blades();
    const p = this.game.player;
    const orbit = this.orbitRadius;
    const t = this.game.time;
    if (variant === 'A') {
      // 真鍮〜銅色の刃と残像の弧。刃から挽いた粉が舞う
      ctx.save();
      ctx.lineCap = 'round';
      for (const b of blades) {
        for (let i = 0; i < v.trail; i++) {
          ctx.strokeStyle = v.trailColor;
          ctx.globalAlpha = v.trailAlpha * (1 - i / v.trail);
          ctx.lineWidth = r * 2 * (1 - (i + 1) / (v.trail + 1));
          ctx.beginPath();
          ctx.arc(p.x, p.y, orbit, b.a - v.trailArc * (i + 1) / v.trail, b.a - v.trailArc * i / v.trail);
          ctx.stroke();
        }
      }
      ctx.restore();
      blades.forEach((b, n) => {
        this.#drawBlade(ctx, b, r, v);
        this.#drawGrounds(ctx, b, r, v, t, n);
      });
    } else if (variant === 'B') {
      // 白銀の刃と、輪の中を渦巻く風の筋（刃の幅の中に収める）
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = v.wind;
      ctx.lineWidth = v.windWidth;
      for (let i = 0; i < v.streaks; i++) {
        const lane = orbit + (hash(i * 3.1) - 0.5) * (r * 2 - v.windWidth);
        const a = t * v.windSpin + (i / v.streaks) * Math.PI * 2;
        ctx.globalAlpha = v.windAlpha * (0.5 + hash(i) * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, lane, a, a + v.streakArc);
        ctx.stroke();
      }
      // 刃の後ろの白い流線
      ctx.strokeStyle = v.edge;
      for (const b of blades) {
        ctx.globalAlpha = v.windAlpha;
        ctx.lineWidth = r * 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, orbit, b.a - v.trailArc, b.a);
        ctx.stroke();
      }
      ctx.restore();
      for (const b of blades) this.#drawBlade(ctx, b, r, v);
    } else {
      // 削る熱で赤く光る刃と、刃から飛ぶ火花
      for (const b of blades) drawGlow(ctx, b.x, b.y, r * v.glowScale, v.glow, v.glowAlpha);
      for (const b of blades) this.#drawBlade(ctx, b, r, v);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = v.spark;
      ctx.lineWidth = v.sparkWidth;
      blades.forEach((b, n) => {
        for (let i = 0; i < v.sparks; i++) {
          const k = (t * v.sparkSpeed + hash(n * 11 + i)) % 1;
          // 回る向きと反対の後ろ側へ、少し外向きに飛ぶ
          const dir = b.a - Math.PI / 2 + (hash(n * 5 + i * 2.3) - 0.3) * 1.2;
          const d0 = r + k * v.sparkDist;
          ctx.globalAlpha = v.sparkAlpha * (1 - k);
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(dir) * d0, b.y + Math.sin(dir) * d0);
          ctx.lineTo(b.x + Math.cos(dir) * (d0 + v.sparkLen), b.y + Math.sin(dir) * (d0 + v.sparkLen));
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  }

  // 刃のまわりに舞う挽いた粉（半透明。はっきりした絵にしない）
  #drawGrounds(ctx, b, r, v, t, n) {
    ctx.save();
    ctx.fillStyle = v.grounds;
    for (let i = 0; i < v.groundCount; i++) {
      const k = (t * v.groundSpeed + hash(n * 13 + i)) % 1;
      const a = b.a + (hash(n * 7 + i * 3.7) - 0.5) * 2.4 + Math.PI;
      const d = r + k * v.groundDist;
      ctx.globalAlpha = v.groundAlpha * (1 - k);
      ctx.fillRect(b.x + Math.cos(a) * d - 2, b.y + Math.sin(a) * d - 2, 4, 4);
    }
    ctx.restore();
  }
}
