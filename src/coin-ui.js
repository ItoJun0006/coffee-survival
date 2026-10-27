// 豆コインの絵と表示（仕様 016）：豆コインの絵、品種を買うメニュー風のポップアップ、結果画面の数え上げ
import { CONFIG } from './config.js';
import { drawCharacter } from './entities/player.js';
import { drawBadgeIcon } from './entities/bean-badge.js';
import { font } from './font.js';

const cfg = CONFIG.coins;
const fmt = (n) => Math.round(n).toLocaleString('ja-JP');
export const coinText = (n) => `${fmt(n)} ${cfg.unit}`;

function text(ctx, s, x, y, { size = 14, bold = false, color, align = 'center' } = {}) {
  ctx.font = font(size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// 豆コイン。金色の丸に、珈琲豆と割れ目
export function drawCoin(ctx, x, y, s) {
  const { edge, face, bean } = cfg.icon;
  ctx.save();
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(x, y + s * 0.08, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bean;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = face;
  ctx.lineWidth = Math.max(1, s * 0.14);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.15, y, x, y + s * 0.5);
  ctx.stroke();
  ctx.restore();
}

// ---- 豆を買うメニュー風のポップアップ ----
// offer は { name, origin, members, labels, trait, desc, price, requireText }。members は一緒に買うキャラ
// （品種なら浅煎り・中煎り・深煎りの 3 体、特別なキャラなら 1 体）、labels はその下の名前、
// requireText はまだ満たしていない条件の文（満たしていれば null）。have は今持っている豆コイン、
// choice は選んでいるボタンの番号。押せるボタンの { x, y, w, h, action } を返す（action は 'order' / 'cancel'）
export const MENU_SIZE = { w: 420, h: 310 };

export function drawMenuPopup(ctx, cx, cy, offer, have, choice) {
  const m = cfg.menu;
  const { w, h } = MENU_SIZE;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const enough = have >= offer.price && !offer.requireText;
  ctx.fillStyle = m.paper;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = m.frame;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  text(ctx, m.head, cx, y + 26, { size: 11, bold: true, color: m.frame });
  text(ctx, offer.name, cx, y + 52, { size: 22, bold: true, color: m.ink });
  text(ctx, offer.origin, cx, y + 76, { size: 11, color: m.sub });
  // 一緒に買うキャラ。買えないときは影にする
  offer.members.forEach((ch, i) => {
    const px = cx + (i - (offer.members.length - 1) / 2) * 90;
    ctx.save();
    ctx.translate(px, y + 122);
    if (enough) {
      drawCharacter(ctx, ch, 22 * (ch.drawScale ?? 1));
    } else {
      ctx.globalAlpha = m.shadowAlpha;
      ctx.fillStyle = ch.roast.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22 * 0.82, 22 * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    text(ctx, offer.labels[i], px, y + 158, { size: 11, color: m.sub });
  });
  text(ctx, offer.trait, cx, y + 182, { size: 13, bold: true, color: m.ink });
  text(ctx, offer.desc, cx, y + 202, { size: 12, color: m.sub });
  // 値段の札
  ctx.fillStyle = m.tag;
  ctx.fillRect(x + w - 156, y + 220, 134, 34);
  drawCoin(ctx, x + w - 136, y + 237, 9);
  text(ctx, coinText(offer.price), x + w - 118, y + 238, { size: 17, bold: true, color: m.tagText, align: 'left' });
  if (offer.requireText) {
    // 条件を満たすまでは、条件を赤い字で出す
    text(ctx, cfg.texts.require.replace('{text}', offer.requireText), x + 28, y + 238, { size: 12, bold: true, color: m.alert, align: 'left' });
  } else {
    text(ctx, `持っている ${coinText(have)}`, x + 28, y + 230, { size: 12, color: m.sub, align: 'left' });
    if (!enough) text(ctx, `あと ${coinText(offer.price - have)}`, x + 28, y + 248, { size: 13, bold: true, color: m.alert, align: 'left' });
  }
  const labels = enough ? [[m.order, 'order'], [m.cancel, 'cancel']] : [[m.close, 'cancel']];
  const bw = 120;
  const bh = 30;
  const gap = 20;
  const total = labels.length * bw + (labels.length - 1) * gap;
  return labels.map(([label, action], i) => {
    const b = { x: cx - total / 2 + i * (bw + gap), y: y + h - 46, w: bw, h: bh, action };
    const selected = i === choice;
    ctx.fillStyle = selected ? m.button : m.buttonIdle;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, { size: 15, bold: true, color: m.ink });
    return b;
  });
}

// ---- 結果画面の数え上げ ----
// tally は { rows: [{ label, detail, value }], before, startedAt, skipped }。now は今の時刻（ミリ秒）。
// 行が rowSec ごとに順に出て、それぞれ countSec で 0 から数え上がり、最後に totalSec で合計に足される
export function tallyDuration(tally) {
  const t = cfg.tally;
  return (tally.rows.length - 1) * t.rowSec + t.countSec + t.totalSec;
}

export function tallyDone(tally, now) {
  return tally.skipped || (now - tally.startedAt) / 1000 >= tallyDuration(tally);
}

// パネルを描き、パネルの下の端の y を返す
export function drawCoinTally(ctx, cx, top, tally, now) {
  const t = cfg.tally;
  const elapsed = tally.skipped ? Infinity : (now - tally.startedAt) / 1000;
  const earned = tally.rows.reduce((s, r) => s + r.value, 0);
  const w = 320;
  const rowH = 24;
  const h = 26 + tally.rows.length * rowH + 52;
  const x = cx - w / 2;
  ctx.fillStyle = t.panel;
  ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = t.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, top, w, h);
  const ease = (k) => Math.min(1, Math.max(0, k));
  tally.rows.forEach((row, i) => {
    const k = ease((elapsed - i * t.rowSec) / t.countSec);
    if (elapsed < i * t.rowSec) return;
    const y = top + 20 + i * rowH;
    // 豆の証の行（仕様 081）は、盾の絵を付けて金色で書く
    if (row.badge) drawBadgeIcon(ctx, x + 22, y, 7);
    text(ctx, `${row.label}${row.detail ? ` ${row.detail}` : ''}`, x + (row.badge ? 34 : 16), y, { size: 13, color: row.badge ? CONFIG.coins.affordableLock : t.text, align: 'left' });
    text(ctx, `＋${fmt(row.value * k)}`, x + w - 16, y, { size: 14, bold: true, color: t.text, align: 'right' });
  });
  const lineY = top + 20 + tally.rows.length * rowH - 6;
  ctx.fillStyle = t.sub;
  ctx.fillRect(x + 16, lineY, w - 32, 1);
  // 合計：行がすべて数え上がったあと、totalSec で足される
  const totalStart = (tally.rows.length - 1) * t.rowSec + t.countSec;
  const k = ease((elapsed - totalStart) / t.totalSec);
  const y = lineY + 22;
  drawCoin(ctx, x + 28, y, 10);
  text(ctx, `${cfg.name}　${coinText(tally.before + earned * k)}`, x + 46, y + 1, { size: 17, bold: true, color: t.total, align: 'left' });
  text(ctx, `（＋${fmt(earned)}）`, x + w - 16, y + 1, { size: 13, color: t.text, align: 'right' });
  if (!tallyDone(tally, now)) {
    // 合計の欄へ飛んでいく途中の豆コイン
    const f = (elapsed % 0.5) / 0.5;
    drawCoin(ctx, x + w - 30 - f * (w - 80), top + 12 + f * (y - top - 12), 6);
    text(ctx, t.skipHint, cx, top + h - 10, { size: 10, color: t.sub });
  }
  return top + h;
}
