import { CONFIG } from '../config.js';
import { Weapon, angleTo, dist } from './base.js';

// 一番近い敵の真上からフレンチプレスで押しつぶす
export class Press extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.press);
    this.blasts = [];
  }

  baseStats() {
    return { radiusRate: 1, delayRate: 1, targets: 1, crowd: false, knockback: 0, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    if (this.tick(dt)) {
      const radius = c.radius * s.radiusRate;
      const delay = c.delaySec * s.delayRate;
      const spots = s.crowd ? this.#crowdSpot(radius) : g.nearestTargets(c.range, s.targets);
      if (spots.length) {
        this.timer = 0;
        for (const t of spots) this.blasts.push({ x: t.x, y: t.y, radius, delay, timer: delay, flash: 0 });
      }
    }
    for (const b of this.blasts) {
      if (b.timer > 0) {
        b.timer -= dt;
        if (b.timer <= 0) {
          for (const t of g.targetsInCircle(b.x, b.y, b.radius)) {
            this.hit(t, c.damage * s.damageRate);
            if (!s.knockback) continue;
            const a = angleTo(b, t);
            g.knockback(t, Math.cos(a) * s.knockback, Math.sin(a) * s.knockback);
          }
          b.flash = 0.25;
        }
      } else {
        b.flash -= dt;
      }
    }
    this.blasts = this.blasts.filter((b) => b.timer > 0 || b.flash > 0);
  }

  // MAX：射程内の敵それぞれを中心にした円のうち、中の敵が一番多い所（ボスは bossWeight 体分）
  #crowdSpot(radius) {
    const g = this.game;
    const c = this.config;
    const inRange = g.targets().filter((t) => dist(t, g.player) - t.radius < c.range);
    let best = null;
    let bestCount = 0;
    for (const center of inRange) {
      let count = 0;
      for (const t of inRange) {
        if (Math.hypot(t.x - center.x, t.y - center.y) < radius + t.radius) count += t === g.boss ? c.bossWeight : 1;
      }
      if (count > bestCount) {
        bestCount = count;
        best = center;
      }
    }
    return best ? [best] : [];
  }

  drawBelow(ctx) {
    for (const b of this.blasts) {
      if (b.timer <= 0) continue;
      ctx.strokeStyle = 'rgba(240, 200, 150, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  draw(ctx) {
    for (const b of this.blasts) {
      const r = b.radius;
      if (b.timer > 0) {
        // 上から降りてくるプランジャー
        const k = b.timer / b.delay;
        const y = b.y - k * 260;
        ctx.fillStyle = 'rgba(200, 220, 230, 0.55)';
        ctx.fillRect(b.x - r * 0.6, y - r * 1.2, r * 1.2, r * 1.2);
        ctx.fillStyle = '#4b4b4b';
        ctx.fillRect(b.x - r * 0.7, y - 6, r * 1.4, 8);
        ctx.fillRect(b.x - 4, y - r * 1.6, 8, r * 0.5);
      } else {
        ctx.fillStyle = `rgba(255, 230, 190, ${b.flash / 0.25 * 0.7})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
