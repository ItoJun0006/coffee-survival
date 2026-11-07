// カードの卓の親（ひつじの支配人・ねぼけフクロウの店主）を描く、共通の部品
export const LINE = '#2a1a10';
const EYE = '#fff8ea';

// 塗って、濃い茶色で縁取る（line が 0 なら縁取らない）
export function shape(ctx, fill, draw, line = 4) {
  ctx.beginPath();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

export const ellipse = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

// 眠そうな目：白目の上半分に、lid の色のまぶたがかぶさる
export function sleepyEye(ctx, x, y, r, lid) {
  shape(ctx, EYE, ellipse(ctx, x, y, r, r * 0.8), 3);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.25, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lid;
  ctx.fillRect(x - r, y - r, r * 2, r * 1.05);
  ctx.restore();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r, y + 1);
  ctx.lineTo(x + r, y + 1);
  ctx.stroke();
}

// 手に持った扇形のカード（まん中が表、両側が裏）
export function cardFan(ctx, x, y, face = EYE, back = '#7a4a2a') {
  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i * 0.32);
    shape(ctx, i === 0 ? face : back, () => ctx.rect(-12, -36, 24, 34), 3);
    ctx.restore();
  }
}
