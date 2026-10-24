import { CONFIG } from './config.js';
import { font } from './font.js';

// 自分の記録（仕様 001 の User Story 7）の見た目。C「3 枚のカード」
const cfg = CONFIG.records;

const formatTime = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const formatKills = (n) => n.toLocaleString('ja-JP');

function card(ctx, x, y, w, h, edge, edgeWidth) {
  ctx.fillStyle = cfg.colors.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = edgeWidth;
  ctx.strokeRect(x, y, w, h);
}

// 結果画面：生存時間・倒した敵・到達レベルのカードを 3 枚並べる。
// run は今回の数、result は recordResult() の戻り値（比べる前の自己ベストと、更新した項目）。カードの下端の y を返す
export function drawResultRecords(ctx, cx, top, run, result) {
  const { w, h, gap } = cfg.result;
  const c = cfg.colors;
  const rows = [
    { key: 'time', now: formatTime(run.time), best: formatTime(result.before.time) },
    { key: 'kills', now: `${formatKills(run.kills)} 体`, best: `${formatKills(result.before.kills)} 体` },
    { key: 'level', now: `Lv ${run.level}`, best: `Lv ${result.before.level}` },
  ];
  const x0 = cx - (w * rows.length + gap * (rows.length - 1)) / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rows.forEach((r, i) => {
    const up = result.updated[r.key];
    const x = x0 + i * (w + gap);
    const mid = x + w / 2;
    card(ctx, x, top, w, h, up ? c.gold : c.edge, up ? 3 : 1.5);
    ctx.font = font(13);
    ctx.fillStyle = c.label;
    ctx.fillText(cfg.labels[r.key], mid, top + 21);
    ctx.font = font(26, true);
    ctx.fillStyle = up ? c.gold : c.value;
    ctx.fillText(r.now, mid, top + 51);
    // 更新したときは、更新後の自己ベスト（今回の数）を出す
    ctx.font = font(12);
    ctx.fillStyle = c.best;
    ctx.fillText(`${cfg.best} ${up ? r.now : r.best}`, mid, top + 80);
    if (up) {
      ctx.font = font(12, true);
      const rw = ctx.measureText(cfg.updated).width + 16;
      ctx.fillStyle = c.ribbon;
      ctx.fillRect(mid - rw / 2, top - 10, rw, 20);
      ctx.fillStyle = c.ribbonText;
      ctx.fillText(cfg.updated, mid, top);
    }
  });
  ctx.restore();
  return top + h;
}

// タイトル画面の右上：最長生存・最多撃破・最高 Lv・クリア回数の小さなカード。記録がなければ「記録なし」
export function drawTitleRecords(ctx, viewW, rec) {
  const { w, h, gap, top, right } = cfg.titleCard;
  const c = cfg.colors;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!rec) {
    ctx.font = font(13);
    const nw = ctx.measureText(cfg.none).width + 28;
    card(ctx, viewW - right - nw, top, nw, h / 2 + 6, c.titleEdge, 1.5);
    ctx.fillStyle = c.label;
    ctx.fillText(cfg.none, viewW - right - nw / 2, top + (h / 2 + 6) / 2);
    ctx.restore();
    return;
  }
  const L = cfg.titleLabels;
  const items = [
    [L.time, formatTime(rec.time)],
    [L.kills, formatKills(rec.kills)],
    [L.level, String(rec.level)],
    [L.clears, `${rec.clears} 回`],
  ];
  const x0 = viewW - right - (w * items.length + gap * (items.length - 1));
  items.forEach(([label, value], i) => {
    const x = x0 + i * (w + gap);
    card(ctx, x, top, w, h, c.titleEdge, 1.5);
    ctx.font = font(11);
    ctx.fillStyle = c.label;
    ctx.fillText(label, x + w / 2, top + 15);
    ctx.font = font(18, true);
    ctx.fillStyle = c.gold;
    ctx.fillText(value, x + w / 2, top + 36);
  });
  ctx.restore();
}
