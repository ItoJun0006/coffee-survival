import { CONFIG } from '../config.js';
import { isUnlocked, unlock } from '../progress.js';

const cfg = CONFIG.jacoCat;

// 確認用：?cat を付けて開くと、3 秒後に必ず横切る（仕様 065）
export const debugCat = new URLSearchParams(location.search).has('cat');

// 隠し要素「横切るジャコウネコ」（仕様 065）。敵ではないので、攻撃は当たらず、触れてもカフェインは減らない。
// 画面の外の start から、プレイヤーの近くを通って反対側へまっすぐ走り抜け、走り終えたら消える
export class JacoCat {
  // player を中心に、半径 distance の円の外から外へ走る
  constructor(player, distance) {
    const a = Math.random() * Math.PI * 2;
    const side = (Math.random() * 2 - 1) * cfg.passOffset;
    // 通る点：プレイヤーから、走る向きと直角に side だけずれた所
    const px = player.x - Math.sin(a) * side;
    const py = player.y + Math.cos(a) * side;
    this.x = px - Math.cos(a) * distance;
    this.y = py - Math.sin(a) * distance;
    this.vx = Math.cos(a) * cfg.speed;
    this.vy = Math.sin(a) * cfg.speed;
    this.radius = cfg.radius;
    this.left = (distance * 2) / cfg.speed;
    this.run = 0;
  }

  get gone() {
    return this.left <= 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.left -= dt;
    this.run += dt * 14;
  }

  touches(player) {
    return Math.hypot(player.x - this.x, player.y - this.y) < this.radius + player.radius;
  }

  // 右向きの絵を、走る向きに合わせて左右に反転して描く
  draw(ctx) {
    const r = this.radius * 1.4;
    const l = cfg.look;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.vx < 0) ctx.scale(-1, 1);
    // しま模様の長いしっぽ
    const tail = (u) => {
      const a = 1 - u;
      return [r * (a * a * -0.7 + 2 * a * u * -1.3 + u * u * -1.55), r * (a * a * -0.05 + 2 * a * u * -0.1 + u * u * -0.5)];
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = l.body;
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(...tail(0));
    ctx.quadraticCurveTo(-r * 1.3, -r * 0.1, -r * 1.55, -r * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = l.dark;
    ctx.lineWidth = r * 0.19;
    for (const k of [0.3, 0.55, 0.8]) {
      ctx.beginPath();
      ctx.moveTo(...tail(k));
      ctx.lineTo(...tail(k + 0.08));
      ctx.stroke();
    }
    // 走る足
    ctx.lineCap = 'round';
    ctx.strokeStyle = l.leg;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    for (const [x, ph] of [[-0.5, 0], [-0.3, Math.PI], [0.35, Math.PI / 2], [0.55, Math.PI * 1.5]]) {
      const s = Math.sin(this.run + ph) * r * 0.25;
      ctx.moveTo(r * x, r * 0.2);
      ctx.lineTo(r * x + s, r * 0.6);
    }
    ctx.stroke();
    // 細い体と黒い斑点
    ctx.fillStyle = l.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = l.dark;
    for (const [x, y] of [[-0.4, -0.1], [-0.1, 0.05], [0.2, -0.12], [0.45, 0.02], [-0.25, 0.15]]) {
      ctx.beginPath();
      ctx.arc(r * x, r * y, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // 頭・耳・鼻先、目のまわりの黒い仮面
    ctx.fillStyle = l.body;
    ctx.beginPath();
    ctx.ellipse(r * 0.85, -r * 0.25, r * 0.35, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.68, -r * 0.45);
    ctx.lineTo(r * 0.72, -r * 0.8);
    ctx.lineTo(r * 0.88, -r * 0.5);
    ctx.moveTo(r * 0.9, -r * 0.5);
    ctx.lineTo(r * 1.02, -r * 0.82);
    ctx.lineTo(r * 1.1, -r * 0.45);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 1.15, -r * 0.18, r * 0.15, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = l.dark;
    ctx.fillRect(r * 0.8, -r * 0.36, r * 0.42, r * 0.13);
    ctx.fillStyle = l.eye;
    ctx.fillRect(r * 0.98, -r * 0.34, r * 0.09, r * 0.09);
    ctx.fillStyle = l.nose;
    ctx.fillRect(r * 1.26, -r * 0.2, r * 0.07, r * 0.06);
    ctx.restore();
  }
}

// 触ったときのごほうび。豆コインは game.js が渡す。触った回数はプレイをまたいで、解放の印（cat-touch-1〜）で数える。
// 今回が何回目か（kopiTouches まで）を返す
export function countCatTouch() {
  let n = 1;
  while (n < cfg.kopiTouches && isUnlocked(`cat-touch-${n}`)) n += 1;
  unlock(`cat-touch-${n}`);
  // 実績「横切るジャコウネコ」（仕様 041）
  unlock('secret-cat');
  return n;
}
