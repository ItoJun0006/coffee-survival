import { CONFIG } from '../config.js';
import { sound } from '../sound.js';
import { flower, leaf } from '../item-icons.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// 珈琲豆のキャラを描く。look は目線の向き（長さ 0〜1）、bob は歩くときの弾み（0〜1）、skin はスキン「椿」を付けているか
export function drawCharacter(ctx, character, r, { look = { x: 0, y: 0 }, bob = 0, slowed = false, skin = false } = {}) {
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
  if (skin) drawCamelliaSkin(ctx, r);

  if (slowed) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = CONFIG.colors.playerSlowed;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// スキン「椿」。椿の花の絵は、大きさ 80 を基準にしたアイコンの絵（item-icons.js）を使う
function drawCamelliaSkin(ctx, r) {
  const k = r / 40;
  const at = (x, y, size, draw) => {
    ctx.save();
    ctx.translate(x * r, y * r);
    ctx.scale(k * size, k * size);
    draw();
    ctx.restore();
  };
  const look = CONFIG.camellia.skin.look;
  if (look === 'A') {
    // A：頭に大きな椿の髪飾り
    at(-0.5, -0.82, 1, () => {
      leaf(ctx, 14, 10, 12, 0.6);
      flower(ctx, 0, 0, 18);
    });
  } else if (look === 'B') {
    // B：椿の花冠
    at(0, -0.95, 1, () => {
      leaf(ctx, -16, 4, 9, -0.4);
      leaf(ctx, 16, 4, 9, 0.4);
      flower(ctx, -24, 6, 11);
      flower(ctx, 24, 6, 11);
      flower(ctx, 0, -2, 13);
    });
  } else {
    // C：体をぐるりと囲む椿の首飾り（花をまとう）
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.12 + i * 0.19);
      at(Math.cos(a) * 0.82, Math.sin(a) * 0.72 + 0.12, 0.55, () => {
        leaf(ctx, 12, 8, 10, 0.5 + i);
        flower(ctx, 0, 0, 15);
      });
    }
  }
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
    // 見た目の大きさの倍率（当たる範囲の radius は変えない）
    this.drawScale = character.drawScale ?? 1;
  }

  // 性能を変える（赤ちゃん豆の成長など）。カフェイン上限が増えた分は、今のカフェインにも足す
  setStats(speedRate, maxCaffeine) {
    this.speed = CONFIG.player.speed * speedRate;
    if (maxCaffeine > this.maxCaffeine) this.caffeine += maxCaffeine - this.maxCaffeine;
    this.maxCaffeine = maxCaffeine;
    this.caffeine = Math.min(this.caffeine, this.maxCaffeine);
  }

  // dir: 入力方向（長さ 0〜1）、push: 外から加わる速度（px/秒）
  update(dt, dir, push = { x: 0, y: 0 }) {
    const { width, height } = CONFIG.world;
    const speed = this.speed * (this.slowTimer > 0 ? this.slowFactor : 1);
    const { x, y } = this;
    this.x = clamp(this.x + (dir.x * speed + push.x) * dt, this.radius, width - this.radius);
    this.y = clamp(this.y + (dir.y * speed + push.y) * dt, this.radius, height - this.radius);
    // このフレームで実際に動いた距離（壁で止まった分は含まない）
    this.moved = Math.hypot(this.x - x, this.y - y);
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

  // 被弾：無敵時間中は無効
  hit(amount) {
    if (this.invincibleTimer > 0) return;
    this.caffeine -= amount;
    this.invincibleTimer = CONFIG.player.invincibleSec;
    sound.play('damage');
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
    drawCharacter(ctx, this.character, this.radius * this.drawScale, {
      look: this.look,
      bob: Math.abs(Math.sin(this.walkTime * 12)),
      slowed: this.slowTimer > 0,
      skin: this.skin,
    });
    ctx.restore();
  }
}
