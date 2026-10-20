// 強化アイテムのアイコン。中心 (x, y)、幅と高さがおよそ size の範囲に描く
// 絵は 80 × 80 の大きさを基準に描き、size に合わせて縮める
const CREAM = '#f4e3c8';
const DARK = '#4a2c1a';
const STEEL = '#c9c2b6';
const GREEN = '#8fc7a0';
const GOLD = '#f0d58a';
const HOT = '#e8935a';

export function drawItemIcon(ctx, id, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 80, size / 80);
  ctx.lineCap = 'round';
  ICONS[id](ctx);
  ctx.restore();
}

const ICONS = {
  // 範囲アップ：XL のマグカップ
  area(ctx) {
    mug(ctx, -4, -14, 46, 40);
    steam(ctx, -4, -20, 18);
    ctx.fillStyle = DARK;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('XL', -4, 10);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2.5;
    for (const [sx, sy, ex, ey] of [[-36, -20, -44, -28], [36, -20, 44, -28], [-36, 26, -44, 34], [32, 26, 40, 34]]) {
      line(ctx, sx, sy, ex, ey);
    }
  },

  // 発生頻度アップ：しずくが次々に落ちるドリッパー
  frequency(ctx) {
    ctx.fillStyle = CREAM;
    ctx.fillRect(-30, -30, 60, 6);
    ctx.beginPath();
    ctx.moveTo(-26, -26);
    ctx.lineTo(26, -26);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = DARK;
    ctx.fillRect(-6, 0, 12, 4);
    // 下へ行くほど小さく薄くなるしずく
    [[0, 12, 1], [0, 24, 0.75], [0, 34, 0.5]].forEach(([dx, dy, k]) => {
      ctx.globalAlpha = k;
      drop(ctx, dx, dy, 6 * k + 2);
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2.5;
    for (const dy of [10, 20, 30]) {
      line(ctx, -14, dy, -20, dy);
      line(ctx, 14, dy, 20, dy);
    }
  },

  // 攻撃力アップ：焙煎豆を山盛りにした計量スプーン
  power(ctx) {
    ctx.strokeStyle = STEEL;
    ctx.lineWidth = 6;
    line(ctx, 10, 12, 36, 32);
    ctx.fillStyle = STEEL;
    ctx.beginPath();
    ctx.ellipse(-4, 4, 24, 15, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // スプーンからはみ出すくらい山盛りの豆
    for (const [dx, dy, rot] of [[-18, 4, 0.8], [-6, 6, -0.4], [6, 2, 0.5], [-12, -8, 0.2], [0, -10, 1.1], [-6, -21, -0.7]]) {
      bean(ctx, dx, dy, 8, rot);
    }
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 2.5;
    for (const [sx, sy, ex, ey] of [[-30, -22, -38, -30], [10, -30, 14, -40], [-36, 4, -46, 4], [22, -12, 32, -16]]) {
      line(ctx, sx, sy, ex, ey);
    }
  },

  // 経験値アップ：きらきらの角砂糖
  xp(ctx) {
    cube(ctx, -12, 14, 22);
    cube(ctx, 12, 14, 22);
    cube(ctx, 0, -8, 22);
    for (const [dx, dy, s] of [[24, -22, 6], [-26, -14, 5], [10, -32, 4]]) sparkle(ctx, dx, dy, s);
  },
};

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function mug(ctx, x, y, w, h) {
  ctx.fillStyle = CREAM;
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = w * 0.12;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.45, h * 0.28, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2 - w * 0.06, y + h);
  ctx.lineTo(x - w / 2 + w * 0.06, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = DARK;
  ctx.fill();
}

function steam(ctx, x, y, h) {
  ctx.strokeStyle = 'rgba(255, 248, 238, 0.8)';
  ctx.lineWidth = 2.5;
  for (let i = -1; i <= 1; i++) {
    const sx = x + i * 10;
    ctx.beginPath();
    ctx.moveTo(sx, y);
    ctx.bezierCurveTo(sx - 6, y - h * 0.33, sx + 6, y - h * 0.66, sx, y - h);
    ctx.stroke();
  }
}

function drop(ctx, x, y, r) {
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.quadraticCurveTo(x + r, y, x, y + r);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.6);
  ctx.fill();
}

function bean(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a170c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.3, 0, 0, r * 0.8);
  ctx.stroke();
  ctx.restore();
}

function cube(ctx, x, y, s) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(x - s / 2, y + s / 2 - 4, s, 4);
}

function sparkle(ctx, x, y, s) {
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 2);
  ctx.lineTo(x + s * 0.5, y - s * 0.5);
  ctx.lineTo(x + s * 2, y);
  ctx.lineTo(x + s * 0.5, y + s * 0.5);
  ctx.lineTo(x, y + s * 2);
  ctx.lineTo(x - s * 0.5, y + s * 0.5);
  ctx.lineTo(x - s * 2, y);
  ctx.lineTo(x - s * 0.5, y - s * 0.5);
  ctx.closePath();
  ctx.fill();
}
