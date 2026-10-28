import { CONFIG } from './config.js';
import { font } from './font.js';

// ポーズメニューの見た目（仕様 040）：真鍮のプレートのボタンと、値を見せるバー。
// finish は仕上げの案（CONFIG.pauseLook.finish：polished 磨いた真鍮／aged 古びた真鍮／brushed ヘアライン）。
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

// 場所から決まる 0〜1 の乱数（毎フレーム同じ模様になるように）
const hash = (a, b) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export function drawPauseItem(ctx, it, selected, t) {
  const L = look();
  const c = L.finishes[L.finish];
  const depth = selected ? L.depth / 2 : L.depth;
  const y = it.y + (L.depth - depth);
  const { x, w, h } = it;
  ctx.save();
  // 落ちる影と、プレートの厚み
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundRect(ctx, x + 3, y + depth + 5, w, h, L.radius);
  ctx.fill();
  ctx.fillStyle = c.side;
  roundRect(ctx, x, y + depth, w, h, L.radius);
  ctx.fill();

  // 表の面：金属らしく、上から明・暗・明・暗の帯を重ねる
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const stops = selected ? c.faceOn : c.face;
  stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, L.radius);
  ctx.fill();
  ctx.save();
  roundRect(ctx, x, y, w, h, L.radius);
  ctx.clip();

  if (L.finish === 'brushed') {
    // ヘアライン：横に細い線をたくさん引く
    for (let k = 0; k < h; k += 1.5) {
      ctx.strokeStyle = hash(k, w) > 0.5 ? 'rgba(255, 250, 230, 0.10)' : 'rgba(60, 40, 10, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + k);
      ctx.lineTo(x + w, y + k);
      ctx.stroke();
    }
  } else if (L.finish === 'aged') {
    // 古びた真鍮：緑青（ろくしょう）のしみと、細かい傷
    for (let i = 0; i < 26; i++) {
      const px = x + hash(i, it.y) * w;
      const py = y + hash(it.y, i) * h;
      const r = 2 + hash(i * 3, it.y) * 7;
      ctx.fillStyle = i % 3 ? c.patina : c.patinaDark;
      ctx.globalAlpha = 0.25 + hash(i, i) * 0.3;
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.6, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(40, 25, 5, 0.25)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      const sx = x + hash(i, w) * w;
      const sy = y + hash(w, i) * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 10 + hash(i, 7) * 16, sy + (hash(7, i) - 0.5) * 6);
      ctx.stroke();
    }
  } else {
    // 磨いた真鍮：斜めに走る強い光の帯
    const gx = x + ((t * 0.15) % 1.6 - 0.3) * w;
    const sg = ctx.createLinearGradient(gx - 40, y, gx + 40, y + h);
    sg.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sg.addColorStop(0.5, 'rgba(255, 252, 235, 0.38)');
    sg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();

  // 面取り：内側の上と左を明るく、下と右を暗く
  ctx.lineWidth = 2;
  ctx.strokeStyle = c.bevelLight;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h - L.radius);
  ctx.lineTo(x + 3, y + 3);
  ctx.lineTo(x + w - L.radius, y + 3);
  ctx.stroke();
  ctx.strokeStyle = c.bevelDark;
  ctx.beginPath();
  ctx.moveTo(x + L.radius, y + h - 3);
  ctx.lineTo(x + w - 3, y + h - 3);
  ctx.lineTo(x + w - 3, y + 3);
  ctx.stroke();

  // 四隅のねじ（マイナスの溝）
  for (const [rx, ry] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
    const sx = x + rx;
    const sy = y + ry;
    const sg = ctx.createRadialGradient(sx - 1, sy - 1, 0.5, sx, sy, 4);
    sg.addColorStop(0, c.screwLight);
    sg.addColorStop(1, c.screw);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.screwSlot;
    ctx.lineWidth = 1.2;
    const a = hash(rx, ry + it.y) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(a) * 2.6, sy - Math.sin(a) * 2.6);
    ctx.lineTo(sx + Math.cos(a) * 2.6, sy + Math.sin(a) * 2.6);
    ctx.stroke();
  }

  if (selected) {
    ctx.strokeStyle = c.focus;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = c.focus;
    ctx.shadowBlur = 10;
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, L.radius + 3);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 文字は刻印：明るい影を 1px 下に置き、その上に暗い字
  const cy = y + h / 2;
  const engrave = (text, tx, align, size) => {
    ctx.font = font(size, true);
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.engraveLight;
    ctx.fillText(text, tx, cy + 1);
    ctx.fillStyle = c.engrave;
    ctx.fillText(text, tx, cy);
  };
  if (it.ratio !== undefined) {
    engrave(it.name, x + 22, 'left', 15);
    drawGauge(ctx, c, x + w * 0.46, cy, w * 0.34, it.ratio, selected);
    engrave(it.valueText, x + w - 20, 'right', 14);
  } else if (it.choice !== undefined) {
    engrave(it.name, x + 22, 'left', 15);
    engrave(`◀  ${it.choice}  ▶`, x + w * 0.64, 'center', 15);
  } else {
    engrave(it.name, x + w / 2, 'center', 18);
  }
  ctx.restore();
}

// 値のバー：ガラスの管に入った琥珀色の液体と、目盛り。つまみは真鍮の丸
function drawGauge(ctx, c, x, cy, w, ratio, selected) {
  const h = 12;
  // 彫りこんだ溝
  ctx.fillStyle = c.groove;
  roundRect(ctx, x - 2, cy - h / 2 - 2, w + 4, h + 4, (h + 4) / 2);
  ctx.fill();
  // ガラスの管
  const tg = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  tg.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  tg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = tg;
  roundRect(ctx, x, cy - h / 2, w, h, h / 2);
  ctx.fill();
  if (ratio > 0) {
    const lg = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    lg.addColorStop(0, c.liquidTop);
    lg.addColorStop(1, c.liquidBottom);
    ctx.fillStyle = lg;
    roundRect(ctx, x + 1, cy - h / 2 + 1, Math.max(h - 2, (w - 2) * ratio), h - 2, (h - 2) / 2);
    ctx.fill();
    // 管の光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + 4, cy - h / 2 + 2, Math.max(0, (w - 2) * ratio - 8), 2);
  }
  // 目盛り
  ctx.strokeStyle = c.engrave;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const tx = x + (w * i) / 4;
    ctx.beginPath();
    ctx.moveTo(tx, cy + h / 2 + 3);
    ctx.lineTo(tx, cy + h / 2 + (i % 2 ? 5 : 7));
    ctx.stroke();
  }
  // つまみ
  const kx = x + w * ratio;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(kx + 1.5, cy + 2.5, 9, 0, Math.PI * 2);
  ctx.fill();
  const kg = ctx.createRadialGradient(kx - 3, cy - 3, 1, kx, cy, 10);
  kg.addColorStop(0, c.screwLight);
  kg.addColorStop(1, c.screw);
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(kx, cy, selected ? 9.5 : 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.screwSlot;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(kx, cy, 5, 0, Math.PI * 2);
  ctx.stroke();
}
