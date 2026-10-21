import { CONFIG } from '../config.js';

const cfg = CONFIG.boss.yawn;

// あくびの波動：ボスから円状に広がり、1 回だけプレイヤーに当たる
export class YawnWave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = CONFIG.boss.radius;
    this.hitDone = false;
  }

  get alive() {
    return this.r < cfg.maxRadius;
  }

  update(dt) {
    this.r += cfg.speed * dt;
  }

  hits(target) {
    if (this.hitDone) return false;
    const d = Math.hypot(target.x - this.x, target.y - this.y);
    if (Math.abs(d - this.r) > cfg.thickness / 2 + target.radius) return false;
    this.hitDone = true;
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.7 * (1 - this.r / cfg.maxRadius);
    ctx.strokeStyle = CONFIG.colors.yawn;
    ctx.lineWidth = cfg.thickness;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
