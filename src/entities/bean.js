import { CONFIG } from '../config.js';

export class Bean {
  // fake: 夢の世界で出る偽物の豆。拾うとカフェインが減る
  constructor(x, y, fake = false) {
    this.x = x;
    this.y = y;
    this.fake = fake;
    this.radius = CONFIG.bean.radius;
    this.angle = Math.random() * Math.PI;
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.fake ? CONFIG.colors.fakeBean : CONFIG.colors.bean;
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
