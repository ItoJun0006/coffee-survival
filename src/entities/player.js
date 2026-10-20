import { CONFIG } from '../config.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// 珈琲豆のキャラを描く。look は目線の向き（長さ 0〜1）、bob は歩くときの弾み（0〜1）
export function drawCharacter(ctx, character, r, { look = { x: 0, y: 0 }, bob = 0, slowed = false } = {}) {
  const { color, crease } = character.roast;
  ctx.save();
  ctx.scale(1 + bob * 0.06, 1 - bob * 0.06);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // つや
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.18, r * 0.3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 豆の割れ目
  ctx.strokeStyle = crease;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.88);
  ctx.quadraticCurveTo(r * 0.22, -r * 0.35, 0, r * 0.15);
  ctx.stroke();
  // 目と口
  for (const side of [-1, 1]) {
    const ex = side * r * 0.38;
    const ey = -r * 0.05;
    ctx.fillStyle = '#fff8ee';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e120c';
    ctx.beginPath();
    ctx.arc(ex + look.x * r * 0.08, ey + look.y * r * 0.08, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#fff8ee';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, r * 0.38, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  if (slowed) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = CONFIG.colors.playerSlowed;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export class Player {
  constructor(x, y, character) {
    this.x = x;
    this.y = y;
    this.character = character;
    this.radius = CONFIG.player.radius;
    this.speed = CONFIG.player.speed * character.roast.speedRate;
    this.maxCaffeine = character.roast.maxCaffeine;
    this.caffeine = this.maxCaffeine;
    this.invincibleTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.look = { x: 0, y: 0 };
    this.walkTime = 0;
  }

  // dir: 入力方向（長さ 0〜1）、push: 外から加わる速度（px/秒）
  update(dt, dir, push = { x: 0, y: 0 }) {
    const { width, height } = CONFIG.world;
    const speed = this.speed * (this.slowTimer > 0 ? this.slowFactor : 1);
    this.x = clamp(this.x + (dir.x * speed + push.x) * dt, this.radius, width - this.radius);
    this.y = clamp(this.y + (dir.y * speed + push.y) * dt, this.radius, height - this.radius);
    this.caffeine -= CONFIG.player.caffeineDecayPerSec * dt;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    // 動いている間だけ弾ませ、目線を進む方向に向ける
    if (dir.x || dir.y) {
      this.walkTime += dt;
      this.look = dir;
    }
  }

  get alive() {
    return this.caffeine > 0;
  }

  // 被弾：無敵時間中は無効。実際にダメージを受けたら true
  hit(amount) {
    if (this.invincibleTimer > 0) return false;
    this.caffeine -= amount;
    this.invincibleTimer = CONFIG.player.invincibleSec;
    return true;
  }

  // 継続的な減少：無敵時間に関係なく減る
  drain(amount) {
    this.caffeine -= amount;
  }

  heal(amount) {
    this.caffeine = Math.min(this.maxCaffeine, this.caffeine + amount);
  }

  slow(sec, factor) {
    this.slowTimer = sec;
    this.slowFactor = factor;
  }

  draw(ctx) {
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    drawCharacter(ctx, this.character, this.radius, {
      look: this.look,
      bob: Math.abs(Math.sin(this.walkTime * 12)),
      slowed: this.slowTimer > 0,
    });
    ctx.restore();
  }
}
