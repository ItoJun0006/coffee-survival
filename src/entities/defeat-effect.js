import { CONFIG } from '../config.js';

const cfg = CONFIG.effects.defeat;

// 敵を倒したときのエフェクト：一瞬白く光り、白い輪が広がり、敵の色の粒が飛び散って消える
export class DefeatEffect {
  constructor(x, y, color, radius) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = radius;
    this.t = 0;
    const offset = Math.random() * Math.PI * 2;
    this.particles = Array.from({ length: cfg.particles }, (_, i) => {
      const a = offset + (i / cfg.particles) * Math.PI * 2;
      const speed = cfg.speed * (0.6 + Math.random() * 0.8);
      return { x: 0, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, size: 3 + Math.random() * 3 };
    });
  }

  get alive() {
    return this.t < cfg.durationSec;
  }

  update(dt) {
    this.t += dt;
    // 粒は飛び出した直後が速く、だんだん減速する
    const decay = Math.exp(-5 * dt);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= decay;
      p.vy *= decay;
    }
  }

  draw(ctx) {
    const k = this.t / cfg.durationSec;
    ctx.save();
    ctx.translate(this.x, this.y);
    // 倒した瞬間の光。最初の 3 分の 1 の時間で消える
    const flash = Math.max(0, 1 - k * 3);
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.8;
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * (1 + k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1 - k;

    ctx.strokeStyle = '#fff6e8';
    ctx.lineWidth = 3 * (1 - k);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * (0.8 + k * 1.2), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.color;
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
