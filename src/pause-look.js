import { CONFIG } from './config.js';
import { font } from './font.js';

// ポーズメニューの見た目（仕様 040）：立体的なボタンと、値を見せるバー。style は 3 案（CONFIG.pauseLook.style）。
// item は { name, x, y, w, h }。バーの項目は ratio（0〜1 の割合）と valueText（右に出す値）を持つ。選べる項目（曲など）は choice（今の名前）を持つ

const look = () => CONFIG.pauseLook;

// 角の丸い四角の道を作る
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPauseItem(ctx, it, selected, t) {
  const s = look();
  const c = s.styles[s.style];
  // 選んでいるボタンは押し込まれたように少し下げ、下の厚みを薄くする
  const depth = selected ? c.depth / 2 : c.depth;
  const y = it.y + (c.depth - depth);
  ctx.save();
  // 影と、ボタンの厚み（下側の面）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, it.x + 2, y + depth + 4, it.w, it.h, c.radius);
  ctx.fill();
  ctx.fillStyle = c.side;
  roundRect(ctx, it.x, y + depth, it.w, it.h, c.radius);
  ctx.fill();
  // 表の面：上が明るく下が暗いグラデーション
  const g = ctx.createLinearGradient(0, y, 0, y + it.h);
  g.addColorStop(0, selected ? c.faceOnTop : c.faceTop);
  g.addColorStop(1, selected ? c.faceOnBottom : c.faceBottom);
  ctx.fillStyle = g;
  roundRect(ctx, it.x, y, it.w, it.h, c.radius);
  ctx.fill();
  // 上のふちの光
  ctx.strokeStyle = c.highlight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(it.x + c.radius, y + 1.5);
  ctx.lineTo(it.x + it.w - c.radius, y + 1.5);
  ctx.stroke();
  if (c.rivets) {
    ctx.fillStyle = c.rivets;
    for (const [rx, ry] of [[8, 8], [it.w - 8, 8], [8, it.h - 8], [it.w - 8, it.h - 8]]) {
      ctx.beginPath();
      ctx.arc(it.x + rx, y + ry, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (c.grain) {
    ctx.strokeStyle = c.grain;
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(it.x + 6, y + (it.h * k) / 4);
      ctx.bezierCurveTo(it.x + it.w * 0.3, y + (it.h * k) / 4 - 3, it.x + it.w * 0.7, y + (it.h * k) / 4 + 3, it.x + it.w - 6, y + (it.h * k) / 4);
      ctx.stroke();
    }
  }
  if (selected) {
    ctx.strokeStyle = c.focus;
    ctx.lineWidth = 2.5;
    roundRect(ctx, it.x - 3, y - 3, it.w + 6, it.h + 6, c.radius + 3);
    ctx.stroke();
  }

  ctx.textBaseline = 'middle';
  ctx.fillStyle = selected ? c.textOn : c.text;
  const cy = y + it.h / 2;
  if (it.ratio !== undefined) {
    // 名前は左、バーはまん中から右、値はバーの右
    ctx.font = font(15, true);
    ctx.textAlign = 'left';
    ctx.fillText(it.name, it.x + 16, cy);
    const bx = it.x + it.w * 0.46;
    const bw = it.w * 0.36;
    drawBar(ctx, c, bx, cy, bw, it.ratio, selected);
    ctx.textAlign = 'right';
    ctx.font = font(14, true);
    ctx.fillStyle = selected ? c.textOn : c.text;
    ctx.fillText(it.valueText, it.x + it.w - 12, cy);
  } else if (it.choice !== undefined) {
    ctx.font = font(15, true);
    ctx.textAlign = 'left';
    ctx.fillText(it.name, it.x + 16, cy);
    ctx.textAlign = 'center';
    const mid = it.x + it.w * 0.66;
    ctx.fillText(`◀  ${it.choice}  ▶`, mid, cy);
  } else {
    ctx.font = font(18, true);
    ctx.textAlign = 'center';
    ctx.fillText(it.name, it.x + it.w / 2, cy);
  }
  ctx.restore();
}

// 値のバー：へこんだ溝に、割合だけ色を入れ、つまみを置く
function drawBar(ctx, c, x, cy, w, ratio, selected) {
  const h = 10;
  ctx.fillStyle = c.barTrack;
  roundRect(ctx, x, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + h / 2, cy - h / 2 + 1);
  ctx.lineTo(x + w - h / 2, cy - h / 2 + 1);
  ctx.stroke();
  if (ratio > 0) {
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, c.barFillTop);
    g.addColorStop(1, c.barFillBottom);
    ctx.fillStyle = g;
    roundRect(ctx, x, cy - h / 2, Math.max(h, w * ratio), h, h / 2);
    ctx.fill();
  }
  // つまみ
  const kx = x + w * ratio;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(kx + 1, cy + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  const kg = ctx.createRadialGradient(kx - 3, cy - 3, 1, kx, cy, 9);
  kg.addColorStop(0, c.knobLight);
  kg.addColorStop(1, c.knob);
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(kx, cy, selected ? 9 : 8, 0, Math.PI * 2);
  ctx.fill();
}
