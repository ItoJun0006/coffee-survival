import { CONFIG } from '../config.js';
import { Weapon, angleTo, distToSegment } from './base.js';

// 一直線に貫く高圧のエスプレッソ
export class Espresso extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.espresso);
    this.beams = [];
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const p = g.player;
    if (this.tick(dt)) {
      const target = g.nearestTarget(c.range);
      if (target) {
        this.timer = 0;
        const a = angleTo(p, target);
        const x2 = p.x + Math.cos(a) * c.range;
        const y2 = p.y + Math.sin(a) * c.range;
        for (const t of g.targets()) {
          if (distToSegment(t, p.x, p.y, x2, y2) < c.width / 2 + t.radius) this.hit(t);
        }
        this.beams.push({ x1: p.x, y1: p.y, x2, y2, life: 0.25 });
      }
    }
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
  }

  draw(ctx) {
    const { width: w, coreRate } = this.config;
    ctx.lineCap = 'round';
    // 外側の線の太さを当たる太さ（width）にそろえ、芯はその内側に描く
    for (const b of this.beams) {
      const k = b.life / 0.25;
      ctx.strokeStyle = `rgba(201, 141, 75, ${0.6 * k})`;
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(61, 35, 20, ${k})`;
      ctx.lineWidth = w * coreRate * k;
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
}
