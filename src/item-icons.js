import { font } from './font.js';
// 強化アイテムのアイコン。中心 (x, y)、幅と高さがおよそ size の範囲に描く
// 絵は 80 × 80 の大きさを基準に描き、size に合わせて縮める
export const CREAM = '#f4e3c8';
export const DARK = '#4a2c1a';
export const STEEL = '#c9c2b6';
export const GREEN = '#8fc7a0';
export const GOLD = '#f0d58a';
export const HOT = '#e8935a';

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
    ctx.font = font(13, true);
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

export function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function mug(ctx, x, y, w, h) {
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

export function steam(ctx, x, y, h) {
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

export function drop(ctx, x, y, r) {
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.quadraticCurveTo(x + r, y, x, y + r);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.6);
  ctx.fill();
}

export function bean(ctx, x, y, r, rot) {
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

export function cube(ctx, x, y, s) {
  ctx.fillStyle = '#fffaf0';
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(x - s / 2, y + s / 2 - 4, s, 4);
}

export function sparkle(ctx, x, y, s) {
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

const CAMELLIA_RED = '#d8384e';
const CAMELLIA_DARK = '#9e2236';
const LEAF = '#3f7a4a';
const STAMEN = '#f2c94c';

// 椿の花のアイコン（仕様 010）。ICONS には camellia-yabu のような名前で入れる
const CAMELLIA = {
  // 藪椿：正面から見た椿。赤い花びら 5 枚と黄色いしべ、つやのある葉 2 枚
  yabu(ctx) {
    leaf(ctx, -24, 22, 18, -0.7);
    leaf(ctx, 26, 20, 18, 0.8);
    flower(ctx, 0, -2, 26, CAMELLIA_RED, CAMELLIA_DARK);
  },
  // 珈琲椿：珈琲に浮かぶ椿。マグカップの上に赤い花が浮かび、湯気が立つ
  coffee(ctx) {
    mug(ctx, 0, -4, 52, 36);
    steam(ctx, 0, -22, 14);
    leaf(ctx, 18, -10, 12, 0.9);
    flower(ctx, -4, -10, 16, CAMELLIA_RED, CAMELLIA_DARK);
  },
  // 落ち椿：花ごと落ちる椿。横から見た丸い花と、舞う花びら
  ochi(ctx) {
    leaf(ctx, -20, 26, 16, -0.4);
    ctx.fillStyle = '#d9607a';
    ctx.beginPath();
    ctx.arc(0, 6, 26, Math.PI * 0.95, Math.PI * 2.05);
    ctx.closePath();
    ctx.fill();
    // 外側の花びらと、内側の花びら
    for (const [dx, dy, rx, ry, color] of [[-16, -4, 11, 14, '#e47a92'], [16, -4, 11, 14, '#e47a92'], [-7, -10, 10, 14, '#f3b3c2'], [7, -10, 10, 14, '#f3b3c2']]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(dx, dy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = STAMEN;
    ctx.fillRect(-6, -26, 12, 10);
    ctx.fillStyle = '#f6c4cf';
    for (const [dx, dy, rot] of [[30, -26, 0.6], [-32, -18, -0.5]]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
};

// 正面から見た椿の花（花びら 5 枚と黄色いしべ）。スキンでも使う
export function flower(ctx, x, y, r, color = CAMELLIA_RED, shade = CAMELLIA_DARK) {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    ctx.fillStyle = i % 2 ? shade : color;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = STAMEN;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

export function leaf(ctx, x, y, len, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = LEAF;
  ctx.beginPath();
  ctx.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  line(ctx, -len * 0.8, 0, len * 0.8, 0);
  ctx.restore();
}

for (const [kind, draw] of Object.entries(CAMELLIA)) ICONS[`camellia-${kind}`] = draw;
