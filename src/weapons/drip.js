import { CONFIG } from '../config.js';
import { Weapon, HitTracker, dist } from './base.js';

// 敵の頭上に熱い雫を降らせる
export class Drip extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.drip);
    this.drops = [];
    // MAX：着弾点に残る湯気。重なっても同じ敵へのダメージは 1 つ分
    this.mists = [];
    this.mistHits = new HitTracker(this.config.linger.tickSec);
  }

  baseStats() {
    return { drops: this.config.drops, radiusRate: 1, spreadTargets: false, linger: false, damageRate: 1 };
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const radius = c.radius * s.radiusRate;
    if (this.tick(dt)) {
      const candidates = g.targets().filter((t) => dist(t, g.player) < c.range);
      if (candidates.length > 0) {
        this.timer = 0;
        for (const pos of s.spreadTargets ? this.#spreadPositions(candidates, s.drops) : this.#randomPositions(candidates, s.drops)) {
          this.drops.push({ ...pos, timer: c.delaySec, splash: 0 });
        }
      }
    }
    for (const d of this.drops) {
      if (d.timer > 0) {
        d.timer -= dt;
        if (d.timer <= 0) {
          for (const t of g.targetsInCircle(d.x, d.y, radius)) this.hit(t, c.damage * s.damageRate);
          d.splash = c.splashSec;
          if (s.linger) this.mists.push({ x: d.x, y: d.y, life: c.linger.durationSec });
        }
      } else {
        d.splash -= dt;
      }
    }
    this.drops = this.drops.filter((d) => d.timer > 0 || d.splash > 0);
    for (const m of this.mists) {
      m.life -= dt;
      for (const t of g.targetsInCircle(m.x, m.y, radius)) {
        if (this.mistHits.tryHit(t, g.time)) this.hit(t, c.damage * s.damageRate * c.linger.damageRate);
      }
    }
    this.mists = this.mists.filter((m) => m.life > 0);
  }

  // 範囲内の敵からランダムに選ぶ（同じ敵に重なってよい）
  #randomPositions(candidates, count) {
    return Array.from({ length: count }, () => {
      const t = candidates[Math.floor(Math.random() * candidates.length)];
      return { x: t.x, y: t.y };
    });
  }

  // 範囲内の敵をシャッフルして別々に狙い、余った雫はプレイヤーのまわりに落とす。
  // ボスに直撃させるのは 1 回の発動で 1 つまで
  #spreadPositions(candidates, count) {
    const p = this.game.player;
    const list = [...candidates];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return Array.from({ length: count }, (_, i) => {
      if (i < list.length) return { x: list[i].x, y: list[i].y };
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.config.scatterRadius;
      return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
    });
  }

  drawBelow(ctx) {
    const c = this.config;
    const radius = c.radius * this.stats.radiusRate;
    for (const d of this.drops) {
      if (d.timer <= 0) continue;
      ctx.fillStyle = 'rgba(60, 30, 15, 0.35)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, radius * (1 - d.timer / c.delaySec), radius * 0.5 * (1 - d.timer / c.delaySec), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  draw(ctx) {
    const c = this.config;
    const radius = c.radius * this.stats.radiusRate;
    for (const d of this.drops) {
      if (d.timer > 0) {
        const y = d.y - (d.timer / c.delaySec) * c.fallHeight;
        ctx.fillStyle = '#6b3e22';
        ctx.beginPath();
        ctx.moveTo(d.x, y - 12);
        ctx.quadraticCurveTo(d.x + 8, y + 2, d.x, y + 6);
        ctx.quadraticCurveTo(d.x - 8, y + 2, d.x, y - 12);
        ctx.fill();
      } else {
        ctx.strokeStyle = `rgba(200, 140, 80, ${d.splash / c.splashSec})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, radius * (1.3 - d.splash), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
