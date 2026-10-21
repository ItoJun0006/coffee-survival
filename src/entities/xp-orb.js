import { CONFIG } from '../config.js';

const cfg = CONFIG.xpOrb;

// 経験値の粒：倒した敵が落とす。近づくと吸い寄せられ、触れると経験値が入る
export class XpOrb {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.phase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  // 経験値が多い粒ほど大きく見せる
  get radius() {
    return cfg.radius * Math.min(2, Math.sqrt(this.value));
  }

  update(dt, player) {
    this.phase += dt * 4;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < player.radius + this.radius) {
      this.collected = true;
      return;
    }
    if (d < cfg.magnetRadius) {
      const step = Math.min(d, cfg.magnetSpeed * dt);
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
  }

  draw(ctx) {
    const r = this.radius;
    const y = this.y + Math.sin(this.phase) * 2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.arc(this.x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(this.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(this.x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
