import { CONFIG } from './config.js';
import { CREAM, DARK, STEEL, HOT, line, mug, steam, drop, bean } from './item-icons.js';

// 攻撃のアイコン（仕様 015）。強化アイテムのアイコンと同じく、80 × 80 の大きさを基準に描き、size に合わせて縮める
export function drawWeaponIcon(ctx, id, x, y, size) {
  const draw = ICONS[id];
  if (!draw) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 80, size / 80);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx);
  ctx.restore();
}

// 攻撃（Weapon）の CONFIG.weapons のキー
export const weaponIdOf = (weapon) => Object.keys(CONFIG.weapons).find((k) => CONFIG.weapons[k].name === weapon.name);

const ICE = '#9fd6f2';
const ICE_DARK = '#4f8fb8';
const COFFEE = '#5a3218';
const RING = '#f2a65a';

const ICONS = {
  // 豆マシンガン：一列に飛んでいく焙煎豆と、勢いの線
  beanGun(ctx) {
    for (const [dx, k] of [[-22, 0.55], [-2, 0.8], [20, 1]]) {
      ctx.globalAlpha = k;
      bean(ctx, dx, 0, 11, Math.PI / 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3;
    for (const dy of [-14, 0, 14]) line(ctx, -40, dy, -32, dy);
  },

  // 豆ショットガン：1 点から扇形に飛び散る豆と、広がる線（強化アイテムの計量スプーンと見分けるため、道具は描かない）
  beanShotgun(ctx) {
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.5;
    for (const a of [-0.55, -0.27, 0, 0.27, 0.55]) line(ctx, -34 + Math.cos(a) * 8, Math.sin(a) * 8, -34 + Math.cos(a) * 26, Math.sin(a) * 26);
    ctx.fillStyle = HOT;
    ctx.beginPath();
    ctx.arc(-34, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    for (const a of [-0.55, -0.27, 0, 0.27, 0.55]) bean(ctx, -34 + Math.cos(a) * 52, Math.sin(a) * 52, 8, a + Math.PI / 2);
  },

  // ミル・トルネード：手回しの珈琲ミル（四角い胴とハンドル）と、回る線
  mill(ctx) {
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(-18, -2, 36, 32);
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-14, 16, 28, 8);
    ctx.fillStyle = STEEL;
    ctx.beginPath();
    ctx.moveTo(-16, -2);
    ctx.lineTo(16, -2);
    ctx.lineTo(10, -14);
    ctx.lineTo(-10, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 4;
    line(ctx, 0, -14, 0, -22);
    line(ctx, 0, -22, 22, -30);
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.arc(22, -30, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 8, 34, Math.PI * 1.05, Math.PI * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 8, 34, Math.PI * 0.05, Math.PI * 0.45);
    ctx.stroke();
  },

  // マグカップ投げ：斜めに飛ぶマグと、戻ってくる弧の矢印
  mug(ctx) {
    ctx.save();
    ctx.rotate(-0.35);
    mug(ctx, -6, -10, 36, 32);
    ctx.restore();
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 4, 32, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.moveTo(-30, 12);
    ctx.lineTo(-36, 24);
    ctx.lineTo(-22, 22);
    ctx.closePath();
    ctx.fill();
  },

  // ドリップの雨：注ぎ口の細いケトルから落ちる熱いしずく
  drip(ctx) {
    ctx.fillStyle = STEEL;
    ctx.beginPath();
    ctx.roundRect(-30, -26, 32, 26, 8);
    ctx.fill();
    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(2, -10);
    ctx.quadraticCurveTo(18, -12, 20, -26);
    ctx.lineTo(28, -30);
    ctx.stroke();
    ctx.strokeStyle = DARK;
    line(ctx, -32, -18, -40, -8);
    [[26, -12, 1], [24, 4, 0.8], [28, 20, 0.6], [16, 30, 0.5]].forEach(([dx, dy, k]) => {
      ctx.globalAlpha = k;
      drop(ctx, dx, dy, 5);
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 2.5;
    for (const dx of [-24, -12]) line(ctx, dx, 14, dx, 26);
  },

  // スチーム噴射：ミルクピッチャーと、もこもこ吹き出す蒸気の雲
  steam(ctx) {
    ctx.fillStyle = STEEL;
    ctx.beginPath();
    ctx.moveTo(-30, -2);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-10, 30);
    ctx.lineTo(-26, 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(2, -8);
    ctx.lineTo(-4, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 248, 238, 0.92)';
    for (const [dx, dy, r] of [[8, -16, 10], [20, -22, 12], [30, -10, 10], [18, -4, 9], [32, -28, 7]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 2.5;
    line(ctx, 4, 6, 12, 14);
    line(ctx, 22, 8, 30, 16);
  },

  // こぼれ珈琲：倒れたカップと、広がる熱い水たまり
  puddle(ctx) {
    ctx.fillStyle = COFFEE;
    ctx.beginPath();
    ctx.ellipse(6, 18, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232, 147, 90, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-18, -2);
    ctx.rotate(-Math.PI / 2 - 0.2);
    mug(ctx, 0, -10, 26, 26);
    ctx.restore();
    steam(ctx, 14, 6, 18);
  },

  // アイス珈琲：氷の入ったグラスとストロー
  ice(ctx) {
    ctx.fillStyle = 'rgba(200, 235, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-20, -24);
    ctx.lineTo(20, -24);
    ctx.lineTo(16, 30);
    ctx.lineTo(-16, 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COFFEE;
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(18, -6);
    ctx.lineTo(16, 28);
    ctx.lineTo(-16, 28);
    ctx.closePath();
    ctx.fill();
    for (const [dx, dy, rot] of [[-8, -4, 0.3], [6, 4, -0.2], [-4, 14, 0.1]]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(rot);
      ctx.fillStyle = ICE;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -5, 4, 4);
      ctx.restore();
    }
    ctx.strokeStyle = ICE_DARK;
    ctx.lineWidth = 4;
    line(ctx, 8, -6, 18, -34);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -24, 40, 0.1);
  },

  // エスプレッソ・ショット：小さなカップに向けて、一直線に落ちる濃い珈琲
  espresso(ctx) {
    ctx.fillStyle = STEEL;
    ctx.fillRect(-26, -34, 52, 10);
    ctx.fillRect(-8, -24, 16, 8);
    ctx.fillStyle = COFFEE;
    ctx.fillRect(-5, -16, 4, 26);
    ctx.fillRect(1, -16, 4, 26);
    ctx.fillStyle = '#e8b070';
    ctx.fillRect(-5, -16, 1.5, 26);
    ctx.fillRect(1, -16, 1.5, 26);
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(16, 10);
    ctx.quadraticCurveTo(14, 30, 0, 30);
    ctx.quadraticCurveTo(-14, 30, -16, 10);
    ctx.fill();
    ctx.fillStyle = '#c69c6d';
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.fillRect(-22, 32, 44, 4);
  },

  // カフェイン・ショックウェーブ：マグから広がる二重の衝撃の輪
  shockwave(ctx) {
    ctx.strokeStyle = RING;
    for (const [r, w, a] of [[36, 3, 0.55], [26, 4, 0.9]]) {
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 4, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    mug(ctx, -2, -6, 26, 22);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(-2, -26);
    ctx.lineTo(6, -16);
    ctx.lineTo(0, -16);
    ctx.lineTo(6, -6);
    ctx.lineTo(-6, -18);
    ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();
  },
};

