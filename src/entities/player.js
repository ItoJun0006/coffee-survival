import { CONFIG } from '../config.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.player.radius;
    this.caffeine = CONFIG.player.maxCaffeine;
    this.invincibleTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1;
  }

  // dir: 入力方向（長さ 0〜1）、push: 外から加わる速度（px/秒）
  update(dt, dir, push = { x: 0, y: 0 }) {
    const { width, height } = CONFIG.world;
    const speed = CONFIG.player.speed * (this.slowTimer > 0 ? this.slowFactor : 1);
    this.x = clamp(this.x + (dir.x * speed + push.x) * dt, this.radius, width - this.radius);
    this.y = clamp(this.y + (dir.y * speed + push.y) * dt, this.radius, height - this.radius);
    this.caffeine -= CONFIG.player.caffeineDecayPerSec * dt;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
  }

  get alive() {
    return this.caffeine > 0;
  }

  // 被弾：無敵時間中は無効
  hit(amount) {
    if (this.invincibleTimer > 0) return;
    this.caffeine -= amount;
    this.invincibleTimer = CONFIG.player.invincibleSec;
  }

  // 継続的な減少：無敵時間に関係なく減る
  drain(amount) {
    this.caffeine -= amount;
  }

  heal(amount) {
    this.caffeine = Math.min(CONFIG.player.maxCaffeine, this.caffeine + amount);
  }

  slow(sec, factor) {
    this.slowTimer = sec;
    this.slowFactor = factor;
  }

  draw(ctx) {
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) return;
    ctx.fillStyle = this.slowTimer > 0 ? CONFIG.colors.playerSlowed : CONFIG.colors.player;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
