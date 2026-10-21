import { CONFIG } from '../config.js';
import { Weapon, HitTracker, angleTo, distToSegment } from './base.js';
import { drawGlow, hash, circle } from './max-fx.js';

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
    this.streams.push({ from: angle - sweep / 2, sweep, t: 0, angle, seed: Math.random() * 100 });
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
    if (this.isMax) {
      this.#drawMax(ctx);
      return;
    }
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

  #stroke(ctx, b, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }

  // ストリーム。はっきりした線の太さが当たる太さ（width）
  #drawMax(ctx) {
    const variant = this.maxVariant;
    const v = this.config.maxVisual[variant];
    const w = this.width;
    const p = this.game.player;
    const t = this.game.time;
    const range = this.config.range;
    if (this.streams.length) drawGlow(ctx, p.x, p.y, v.playerGlow, v.glow, v.playerGlowAlpha);
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.streams) {
      const b = this.#segment(s.angle);
      const ux = Math.cos(s.angle);
      const uy = Math.sin(s.angle);
      ctx.globalAlpha = 1;
      if (variant === 'A') {
        // クリーム色の芯・クレマ色の縁・ごく薄いオレンジの光の 3 層と、流れる湯気の粒
        ctx.globalAlpha = 1;
        this.#stroke(ctx, b, v.halo, w * v.haloRate);
        this.#stroke(ctx, b, v.rim, w);
        this.#stroke(ctx, b, v.core, w * v.coreRate);
        ctx.fillStyle = v.steam;
        for (let i = 0; i < v.particles; i++) {
          const q = (t * v.flow + i / v.particles) % 1;
          const side = (hash(s.seed + i) - 0.5) * w * 1.6;
          ctx.globalAlpha = v.steamAlpha * (1 - q);
          circle(ctx, p.x + ux * q * range - uy * side, p.y + uy * q * range + ux * side, 3);
          ctx.fill();
        }
      } else if (variant === 'B') {
        // 赤く光る縁の中を、濃いエスプレッソが流れる。光の輪が先へ走る
        this.#stroke(ctx, b, v.halo, w * v.haloRate);
        this.#stroke(ctx, b, v.rim, w);
        this.#stroke(ctx, b, v.core, w * v.coreRate);
        ctx.strokeStyle = v.pulse;
        ctx.lineWidth = 3;
        for (let i = 0; i < v.pulses; i++) {
          const q = (t * v.flow + i / v.pulses) % 1;
          ctx.globalAlpha = 0.9 * (1 - q * 0.5);
          circle(ctx, p.x + ux * q * range, p.y + uy * q * range, w / 2 - 1.5);
          ctx.stroke();
        }
        drawGlow(ctx, b.x2, b.y2, v.tipGlow, v.glow, 0.7);
      } else {
        // うねる液体の線と、先から飛び散る雫
        ctx.strokeStyle = v.rim;
        ctx.lineWidth = w * v.waveWidth;
        ctx.beginPath();
        const amp = (w * (1 - v.waveWidth)) / 2;
        for (let i = 0; i <= v.segments; i++) {
          const q = i / v.segments;
          const off = Math.sin(q * v.waves * Math.PI * 2 - t * v.flow * 10) * amp;
          ctx.lineTo(p.x + ux * q * range - uy * off, p.y + uy * q * range + ux * off);
        }
        ctx.stroke();
        this.#stroke(ctx, b, v.core, w * v.coreRate);
        ctx.fillStyle = v.drop;
        for (let i = 0; i < v.drops; i++) {
          const q = (t * 2 + hash(s.seed + i)) % 1;
          const spread = (hash(s.seed + i * 3) - 0.5) * 1.2;
          const a = s.angle + spread;
          ctx.globalAlpha = 0.6 * (1 - q);
          circle(ctx, b.x2 + Math.cos(a) * q * v.dropDist, b.y2 + Math.sin(a) * q * v.dropDist, 3);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}
