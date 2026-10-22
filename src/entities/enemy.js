import { CONFIG } from '../config.js';

// 眠気の化身の手下。type は CONFIG.enemies のキー
// strength は出現時の強さの倍率 { hp, speed, damage }。時間がたつほど大きくなる
export class Enemy {
  constructor(type, x, y, strength = { hp: 1, speed: 1, damage: 1 }) {
    this.type = type;
    this.config = CONFIG.enemies[type];
    this.x = x;
    this.y = y;
    this.radius = this.config.radius;
    this.hp = this.config.hp * strength.hp;
    this.speed = this.config.speed * strength.speed;
    this.damageRate = strength.damage;
    this.wobble = Math.random() * Math.PI * 2;
    this.freezeTimer = 0;
    // 凍りが解けた直後の、凍らない残り時間と、そのときに入る長さ
    this.freezeGuardTimer = 0;
    this.freezeGuardSec = 0;
    // 足どめの残り時間と、速さにかける倍率
    this.slowTimer = 0;
    this.slowRate = 1;
    this.kx = 0;
    this.ky = 0;
  }

  get dead() {
    return this.hp <= 0;
  }

  get frozen() {
    return this.freezeTimer > 0;
  }

  damage(amount) {
    this.hp -= amount;
  }

  // 凍っている間と、解けた直後の待ち時間の間は、凍らせ直さない
  freeze(sec, guardSec = 0) {
    if (this.frozen || this.freezeGuardTimer > 0) return;
    this.freezeTimer = sec;
    this.freezeGuardSec = guardSec;
  }

  // すぐに凍りを解き、待ち時間に入る
  thaw() {
    if (!this.frozen) return;
    this.freezeTimer = 0;
    this.freezeGuardTimer = this.freezeGuardSec;
  }

  // かけ直したときは、長い方の時間と強い方の倍率を残す
  slow(sec, rate) {
    this.slowRate = this.slowTimer > 0 ? Math.min(this.slowRate, rate) : rate;
    this.slowTimer = Math.max(this.slowTimer, sec);
  }

  // 押し返しの速度（px/秒）。時間とともに弱まる
  knockback(vx, vy) {
    this.kx += vx;
    this.ky += vy;
  }

  update(dt, target) {
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    if (this.frozen) {
      this.freezeTimer -= dt;
      if (!this.frozen) this.freezeGuardTimer = this.freezeGuardSec;
    } else {
      this.freezeGuardTimer = Math.max(0, this.freezeGuardTimer - dt);
      const d = Math.hypot(target.x - this.x, target.y - this.y) || 1;
      const speed = this.speed * (this.slowTimer > 0 ? this.slowRate : 1);
      this.x += ((target.x - this.x) / d) * speed * dt;
      this.y += ((target.y - this.y) / d) * speed * dt;
      this.wobble += dt * 4;
    }
    this.x += this.kx * dt;
    this.y += this.ky * dt;
    const decay = Math.exp(-6 * dt);
    this.kx *= decay;
    this.ky *= decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'sheep') this.#drawSheep(ctx);
    else if (this.type === 'slime') this.#drawSlime(ctx);
    else this.#drawGhost(ctx);
    if (this.frozen) {
      ctx.fillStyle = 'rgba(190, 230, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  #drawSheep(ctx) {
    const r = this.radius;
    ctx.fillStyle = '#e8e2d6';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4a3b33';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    this.#drawSleepyEyes(ctx, r * 0.18, r * 0.05, '#e8e2d6');
  }

  #drawSlime(ctx) {
    const r = this.radius;
    const squash = 1 + Math.sin(this.wobble) * 0.08;
    ctx.fillStyle = '#7a5c8e';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * squash, r / squash, 0, 0, Math.PI * 2);
    ctx.fill();
    this.#drawSleepyEyes(ctx, r * 0.35, -r * 0.1, '#f0e6ff');
  }

  #drawGhost(ctx) {
    const r = this.radius;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#b9c4d8';
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r, Math.PI, 0);
    for (let i = 0; i <= 4; i++) {
      const x = r - (i / 4) * r * 2;
      ctx.lineTo(x, r * 0.8 + Math.sin(this.wobble + i) * r * 0.15);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    this.#drawSleepyEyes(ctx, r * 0.35, -r * 0.2, '#3a4560');
  }

  // 閉じかけの目（横線）
  #drawSleepyEyes(ctx, spread, y, color) {
    ctx.strokeStyle = color;
    // ドット絵（1 マス 3px）にしても消えないよう、ドットの大きさ以上の太さにする
    ctx.lineWidth = Math.max(2, CONFIG.pixelArt.enabled ? CONFIG.pixelArt.size : 0);
    ctx.beginPath();
    ctx.moveTo(-spread - 4, y);
    ctx.lineTo(-spread + 4, y);
    ctx.moveTo(spread - 4, y);
    ctx.lineTo(spread + 4, y);
    ctx.stroke();
  }
}
