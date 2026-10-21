import { CONFIG } from '../config.js';
import { Weapon, HitTracker, dist } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    ctx.lineTo(x + (hx / 16) * size, y + (hy / 16) * size);
  }
  ctx.closePath();
}

// 足元にハートのラテアートを描く。中の敵にダメージを与え、中にいる間カフェインが回復する
export class Latte extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.latte);
    this.arts = [];
    // 模様が重なっても、ダメージと回復は 1 つ分だけ
    this.hits = new HitTracker(this.config.tickSec);
  }

  baseStats() {
    return { durationRate: 1, radiusRate: 1, healRate: 1, follow: false };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    const radius = c.radius * s.radiusRate;
    const duration = c.durationSec * s.durationRate;
    if (this.tick(dt)) {
      this.timer = 0;
      // MAX：模様はいつも 1 枚で、発動したら残り時間を戻すだけ
      if (s.follow && this.arts.length) this.arts[0].life = duration;
      else this.arts.push({ x: p.x, y: p.y, life: duration });
    }
    for (const a of this.arts) {
      a.life -= dt;
      a.radius = radius;
      if (s.follow) Object.assign(a, { x: p.x, y: p.y });
      for (const t of g.targetsInCircle(a.x, a.y, radius)) {
        if (this.hits.tryHit(t, g.time)) this.hit(t);
      }
    }
    if (this.arts.some((a) => dist(a, p) < radius)) p.heal(c.healPerSec * s.healRate * dt);
    this.arts = this.arts.filter((a) => a.life > 0);
  }

  drawBelow(ctx) {
    if (this.isMax) {
      this.#drawMaxBelow(ctx);
      return;
    }
    for (const a of this.arts) {
      const k = Math.min(1, a.life / 0.5);
      ctx.fillStyle = `rgba(196, 150, 108, ${0.45 * k})`;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(250, 240, 225, ${0.7 * k})`;
      heartPath(ctx, a.x, a.y, a.radius * 0.6);
      ctx.fill();
    }
  }

  // 模様。当たる範囲ちょうどに縁を描く
  #drawMaxBelow(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const t = this.game.time;
    for (const a of this.arts) {
      const k = Math.min(1, a.life / 0.5);
      const r = a.radius;
      const pulse = 1 + v.pulse * Math.sin(t * v.pulseSpeed);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = v.base;
      circle(ctx, a.x, a.y, r);
      ctx.fill();
      if (variant === 'A') {
        // チューリップ風の 3 重のハート（ミルクとクレマを交互）
        v.layers.forEach((color, i) => {
          ctx.fillStyle = color;
          const size = r * v.heartSize * (1 - i * 0.28) * pulse;
          heartPath(ctx, a.x, a.y - r * 0.12 * i, size);
          ctx.fill();
        });
      } else if (variant === 'B') {
        // ロゼッタ（葉の模様）：軸に沿って重なる弧
        ctx.strokeStyle = v.milk;
        ctx.lineWidth = v.lineWidth;
        ctx.lineCap = 'round';
        const len = r * 0.7 * pulse;
        for (let i = 0; i < v.leaves; i++) {
          const q = i / (v.leaves - 1);
          const y = a.y - len + q * len * 1.7;
          const w = r * 0.55 * Math.sin((0.15 + q * 0.75) * Math.PI) * pulse;
          ctx.beginPath();
          ctx.moveTo(a.x - w, y - w * 0.35);
          ctx.quadraticCurveTo(a.x, y + w * 0.45, a.x + w, y - w * 0.35);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - len);
        ctx.lineTo(a.x, a.y + len * 0.85);
        ctx.stroke();
        ctx.fillStyle = v.milk;
        heartPath(ctx, a.x, a.y - len, r * 0.12);
        ctx.fill();
      } else {
        // 大きなハートと、縁の内側を回る小さなハートの輪
        ctx.fillStyle = v.milk;
        heartPath(ctx, a.x, a.y, r * v.heartSize * pulse);
        ctx.fill();
        ctx.fillStyle = v.ringHeart;
        const n = v.ringHearts;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + t * v.spin;
          const d = r - v.ringHeartSize * 1.2;
          heartPath(ctx, a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, v.ringHeartSize);
          ctx.fill();
        }
      }
      // キャラメル色の縁（当たる範囲ちょうど）
      ctx.strokeStyle = v.rim;
      ctx.lineWidth = 3;
      circle(ctx, a.x, a.y, r - 1.5);
      ctx.stroke();
      if (v.foam) {
        // 縁の内側を回る泡の点
        ctx.fillStyle = v.foam;
        for (let i = 0; i < v.foamDots; i++) {
          const ang = (i / v.foamDots) * Math.PI * 2 + t * v.spin;
          circle(ctx, a.x + Math.cos(ang) * (r - 8), a.y + Math.sin(ang) * (r - 8), 2 + hash(i) * 1.5);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // 回復中の見た目
  draw(ctx) {
    if (!this.isMax) return;
    const p = this.game.player;
    if (!this.arts.some((a) => dist(a, p) < a.radius)) return;
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const t = this.game.time;
    if (v.healGlow) drawGlow(ctx, p.x, p.y, v.healGlow, v.healGlowColor, 0.5 + 0.2 * Math.sin(t * 4));
    if (!v.healHearts) return;
    // プレイヤーのまわりから浮かぶ小さな白いハート
    ctx.save();
    ctx.fillStyle = v.healHeart;
    for (let i = 0; i < v.healHearts; i++) {
      const q = (t * 0.8 + i / v.healHearts) % 1;
      ctx.globalAlpha = 0.85 * Math.sin(q * Math.PI);
      const x = p.x + (hash(i * 5) - 0.5) * p.radius * 3;
      heartPath(ctx, x + Math.sin((q + i) * 6) * 3, p.y - p.radius * 0.5 - q * 34, 5);
      ctx.fill();
    }
    ctx.restore();
  }
}
