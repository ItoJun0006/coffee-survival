import { CONFIG } from '../config.js';

export class Bean {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.bean.radius;
    this.angle = Math.random() * Math.PI;
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = CONFIG.colors.bean;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CONFIG.colors.beanLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.3, 0, 0, r * 0.8);
    ctx.stroke();
    ctx.restore();
  }
}
