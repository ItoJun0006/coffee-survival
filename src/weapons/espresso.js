import { CONFIG } from '../config.js';
import { Weapon, HitTracker, angleTo, distToSegment } from './base.js';

// 一直線に貫く高圧のエスプレッソ
export class Espresso extends Weapon {
  constructor(game) {
    super(game, CONFIG.weapons.espresso);
    this.beams = [];
    // 撃つのを待っているショット（1 体しかいないときの 2 本目）
    this.queued = [];
    // MAX：撃ち続けているストリーム。同じ敵には hitCooldownSec ごとに 1 回
    this.streams = [];
    this.streamHits = new HitTracker(this.config.stream.hitCooldownSec);
  }

  baseStats() {
    return { shots: 1, widthRate: 1, knockback: 0, stream: false, damageRate: 1 };
  }

  get width() {
    return this.config.width * this.stats.widthRate;
  }

  update(dt) {
    const c = this.config;
    const g = this.game;
    const s = this.stats;
    const p = g.player;
    if (this.tick(dt)) {
      const targets = g.nearestTargets(c.range, s.shots);
      if (targets.length) {
        this.timer = 0;
        for (let i = 0; i < s.shots; i++) {
          const target = targets[i] ?? targets[0];
          this.queued.push({ target, angle: angleTo(p, target), delay: i < targets.length ? 0 : c.shotGapSec * (i - targets.length + 1) });
        }
      }
    }
    for (const q of this.queued) {
      q.delay -= dt;
      if (q.delay > 0) continue;
      const angle = q.target.dead ? q.angle : angleTo(p, q.target);
      if (s.stream) this.#startStream(angle);
      else this.#fire(angle);
    }
    this.queued = this.queued.filter((q) => q.delay > 0);
    this.#updateStreams(dt);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
  }

  #segment(angle) {
    const p = this.game.player;
    const r = this.config.range;
    return { x1: p.x, y1: p.y, x2: p.x + Math.cos(angle) * r, y2: p.y + Math.sin(angle) * r };
  }

  // 線の上の敵に当てる。canHit で当てるかを決める
  #strike(angle, damage, canHit) {
    const g = this.game;
    const { x1, y1, x2, y2 } = this.#segment(angle);
    const k = this.stats.knockback;
    for (const t of g.targets()) {
      if (distToSegment(t, x1, y1, x2, y2) >= this.width / 2 + t.radius || !canHit(t)) continue;
      this.hit(t, damage);
      if (k) g.knockback(t, Math.cos(angle) * k, Math.sin(angle) * k);
    }
  }

  #fire(angle) {
    const c = this.config;
    this.#strike(angle, c.damage * this.stats.damageRate, () => true);
    this.beams.push({ ...this.#segment(angle), life: c.beamLifeSec });
  }

  // MAX：狙った向きを中心に sweepDeg なぎ払うストリーム。同時に出せるのは shots 本まで
  #startStream(angle) {
    const st = this.config.stream;
    if (this.streams.length >= this.stats.shots) return;
    const sweep = (st.sweepDeg * Math.PI) / 180;
    this.streams.push({ from: angle - sweep / 2, sweep, t: 0, angle });
  }

  #updateStreams(dt) {
    const c = this.config;
    const g = this.game;
    const st = c.stream;
    for (const s of this.streams) {
      s.t += dt;
      s.angle = s.from + s.sweep * Math.min(1, s.t / st.durationSec);
      this.#strike(s.angle, c.damage * this.stats.damageRate, (t) => this.streamHits.tryHit(t, g.time));
    }
    this.streams = this.streams.filter((s) => s.t < st.durationSec);
  }

  draw(ctx) {
    const { coreRate, beamLifeSec } = this.config;
    const w = this.width;
    ctx.lineCap = 'round';
    // 外側の線の太さを当たる太さ（width）にそろえ、芯はその内側に描く
    const line = (b, k) => {
      ctx.strokeStyle = `rgba(201, 141, 75, ${0.6 * k})`;
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(61, 35, 20, ${k})`;
      ctx.lineWidth = w * coreRate * k;
      ctx.stroke();
    };
    for (const b of this.beams) line(b, b.life / beamLifeSec);
    for (const s of this.streams) line(this.#segment(s.angle), 1);
    ctx.lineCap = 'butt';
  }
}
