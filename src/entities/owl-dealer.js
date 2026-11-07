import { shape, ellipse, sleepyEye, cardFan } from './dealer-parts.js';

// ビデオポーカー（仕様 044）の親「ねぼけフクロウの店主」。夜ふかしのはずが眠いフクロウが、緑のサンバイザー（配り手の帽子）で札を配る。
// (x, y) を顔のまん中にして描く。t は秒（ときどき、ゆっくり首をかしげる）
const COLORS = { body: '#8a6a4a', belly: '#e8d8b8', feather: '#b89a70', face: '#f2e2b0', beak: '#e8963a', visor: '#2f8a5a', gold: '#e0b050', wing: '#7a5a3a' };

export function drawOwlDealer(ctx, x, y, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8) * 0.04);
  shape(ctx, COLORS.body, ellipse(ctx, 0, 26, 70, 78));
  shape(ctx, COLORS.belly, ellipse(ctx, 0, 50, 44, 50), 3);
  // おなかの羽の模様
  ctx.strokeStyle = COLORS.feather;
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    for (const sx of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 18 - 6, 34 + i * 18);
      ctx.lineTo(sx * 18, 40 + i * 18);
      ctx.lineTo(sx * 18 + 6, 34 + i * 18);
      ctx.stroke();
    }
  }
  // 耳の羽と、眠そうな大きな目
  for (const sx of [-1, 1]) shape(ctx, COLORS.body, () => { ctx.moveTo(sx * 26, -40); ctx.lineTo(sx * 50, -82); ctx.lineTo(sx * 56, -34); ctx.closePath(); });
  for (const sx of [-1, 1]) {
    shape(ctx, COLORS.face, ellipse(ctx, sx * 26, -14, 24, 24));
    sleepyEye(ctx, sx * 26, -12, 14, COLORS.face);
  }
  shape(ctx, COLORS.beak, () => { ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.lineTo(0, 20); ctx.closePath(); }, 3);
  // 緑のサンバイザー
  shape(ctx, COLORS.visor, () => { ctx.moveTo(-58, -44); ctx.quadraticCurveTo(0, -74, 58, -44); ctx.lineTo(66, -30); ctx.quadraticCurveTo(0, -50, -66, -30); ctx.closePath(); });
  shape(ctx, COLORS.gold, () => ctx.rect(-56, -50, 112, 6), 2);
  for (const sx of [-1, 1]) shape(ctx, COLORS.wing, ellipse(ctx, sx * 66, 36, 16, 40, sx * 0.3));
  cardFan(ctx, 88, 52);
  ctx.restore();
}
