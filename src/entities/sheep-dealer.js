import { LINE, shape, ellipse, sleepyEye, cardFan } from './dealer-parts.js';

// カードゲーム（仕様 043）の親「ひつじの支配人」。眠りを数える羊の親玉が、シルクハットと片眼鏡と懐中時計で、夜ふかしを見はる。
// (x, y) を顔のまん中にして描く。t は秒（ゆっくり上下にゆれる）
const COLORS = { wool: '#efe8da', face: '#3a2e2a', dial: '#fff8ea', hat: '#3b2a5a', gold: '#e0b050', tie: '#a8323a' };

export function drawSheepDealer(ctx, x, y, t = 0) {
  const cy = y + Math.sin(t * 1.6) * 2;
  const cx = x;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    shape(ctx, COLORS.wool, ellipse(ctx, cx + Math.cos(a) * 62, cy + 12 + Math.sin(a) * 50, 26, 26));
  }
  shape(ctx, COLORS.wool, ellipse(ctx, cx, cy + 12, 66, 54), 0);
  for (const sx of [-1, 1]) shape(ctx, COLORS.face, ellipse(ctx, cx + sx * 46, cy + 4, 20, 9, sx * 0.4));
  shape(ctx, COLORS.face, ellipse(ctx, cx, cy + 12, 34, 42));
  sleepyEye(ctx, cx - 14, cy + 4, 9, COLORS.face);
  sleepyEye(ctx, cx + 14, cy + 4, 9, COLORS.face);
  // 片眼鏡と鎖
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx + 14, cy + 4, 13, 0, Math.PI * 2);
  ctx.moveTo(cx + 26, cy + 10);
  ctx.quadraticCurveTo(cx + 40, cy + 40, cx + 30, cy + 58);
  ctx.stroke();
  // 蝶ネクタイ
  shape(ctx, COLORS.tie, () => {
    for (const sx of [-1, 1]) {
      ctx.moveTo(cx, cy + 58);
      ctx.lineTo(cx + sx * 16, cy + 50);
      ctx.lineTo(cx + sx * 16, cy + 66);
      ctx.closePath();
    }
  }, 3);
  // シルクハット
  shape(ctx, COLORS.hat, ellipse(ctx, cx, cy - 36, 52, 10));
  shape(ctx, COLORS.hat, () => ctx.rect(cx - 32, cy - 96, 64, 60));
  shape(ctx, COLORS.gold, () => ctx.rect(cx - 32, cy - 50, 64, 10), 3);
  // 懐中時計（針はゆっくり回る）
  shape(ctx, COLORS.gold, ellipse(ctx, cx - 92, cy + 50, 22, 22));
  shape(ctx, COLORS.dial, ellipse(ctx, cx - 92, cy + 50, 15, 15), 2);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 92, cy + 50);
  ctx.lineTo(cx - 92 + Math.sin(t * 0.5) * 10, cy + 50 - Math.cos(t * 0.5) * 10);
  ctx.moveTo(cx - 92, cy + 50);
  ctx.lineTo(cx - 84, cy + 54);
  ctx.stroke();
  cardFan(ctx, cx + 92, cy + 60);
}
