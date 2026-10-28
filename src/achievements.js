import { CONFIG } from './config.js';
import { isUnlocked, unlock, badges } from './progress.js';
import { font } from './font.js';

// 実績（仕様 041）：隠し要素と、その解放の条件を一覧で見せる。まだのものは名前を「？？？」にして、条件だけ見せる。
// 解放したかどうかは、それぞれの仕組みが残している記録（解放の印・豆の証の数）から調べる

const cfg = () => CONFIG.achievements;

// 解放したかを調べる方法。kind は CONFIG.achievements.items の done
const DONE = {
  unlocked: (id) => isUnlocked(id),
  badges: () => badges() > 0,
};

export const isDone = (item) => DONE[item.done.kind](item.done.id);

// 隠しコマンドなど、ほかに記録が残らないものは、ここで解放の印を付ける
export const markDone = (id) => unlock(id);

// 幅に収まるように折り返す（日本語なので 1 文字ずつ測る）
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      lines.push(line);
      line = '';
    }
    line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export class AchievementScreen {
  open() {
    this.openedAt = performance.now();
  }

  // 戻るときは 'back' を返す
  update(input, viewW, viewH) {
    if (input.wasPressed('Escape', 'Backspace', 'KeyA', 'Enter', 'Space')) {
      input.consumeClick();
      return 'back';
    }
    if (input.consumeClick() && inRect(input.clickPos, this.#back(viewW, viewH))) return 'back';
    return null;
  }

  #back(viewW, viewH) {
    return { x: viewW / 2 - 90, y: viewH - 64, w: 180, h: 40 };
  }

  draw(ctx, viewW, viewH) {
    const s = cfg();
    const items = s.items;
    const done = items.filter(isDone).length;
    ctx.save();
    ctx.fillStyle = s.colors.backdrop;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.colors.title;
    ctx.font = font(28, true);
    ctx.fillText(s.title, viewW / 2, 112);
    ctx.font = font(15);
    ctx.fillStyle = s.colors.sub;
    ctx.fillText(s.count.replace('{done}', done).replace('{all}', items.length), viewW / 2, 144);
    if (s.style === 'B') this.#drawStampCard(ctx, items, viewW, viewH);
    else if (s.style === 'C') this.#drawMedals(ctx, items, viewW, viewH);
    else this.#drawList(ctx, items, viewW, viewH);
    const b = this.#back(viewW, viewH);
    ctx.strokeStyle = s.colors.title;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = s.colors.title;
    ctx.font = font(14, true);
    ctx.fillText(s.back, b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }

  // A：黒板の一覧。左に★、名前、下に条件、右にごほうび
  #drawList(ctx, items, viewW, viewH) {
    const s = cfg();
    const w = Math.min(620, viewW - 48);
    const x = (viewW - w) / 2;
    const rowH = Math.min(62, (viewH - 270) / items.length);
    const top = 176;
    ctx.fillStyle = s.colors.board;
    ctx.fillRect(x - 16, top - 12, w + 32, rowH * items.length + 24);
    ctx.strokeStyle = s.colors.frame;
    ctx.lineWidth = 6;
    ctx.strokeRect(x - 16, top - 12, w + 32, rowH * items.length + 24);
    items.forEach((it, i) => {
      const y = top + i * rowH;
      const ok = isDone(it);
      ctx.textAlign = 'left';
      ctx.font = font(22, true);
      ctx.fillStyle = ok ? s.colors.star : s.colors.dim;
      ctx.fillText(ok ? '★' : '☆', x + 4, y + rowH / 2);
      ctx.font = font(17, true);
      ctx.fillStyle = ok ? s.colors.text : s.colors.dim;
      ctx.fillText(ok ? it.name : s.hidden, x + 40, y + rowH * 0.32);
      ctx.font = font(13);
      ctx.fillStyle = s.colors.sub;
      ctx.fillText(it.hint, x + 40, y + rowH * 0.7);
      if (ok) {
        ctx.textAlign = 'right';
        ctx.fillStyle = s.colors.star;
        ctx.font = font(12, true);
        ctx.fillText(it.reward, x + w - 4, y + rowH * 0.32);
      }
      if (i < items.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + rowH);
        ctx.lineTo(x + w, y + rowH);
        ctx.stroke();
      }
    });
  }

  // B：喫茶店のスタンプカード。解放したマスには丸い判子を押す
  #drawStampCard(ctx, items, viewW, viewH) {
    const s = cfg();
    const cols = 3;
    const rows = Math.ceil(items.length / cols);
    const cw = Math.min(210, (viewW - 80) / cols);
    const ch = Math.min(170, (viewH - 280) / rows);
    const x0 = (viewW - cw * cols) / 2;
    const y0 = 180;
    ctx.fillStyle = s.colors.card;
    ctx.fillRect(x0 - 20, y0 - 16, cw * cols + 40, ch * rows + 32);
    ctx.strokeStyle = s.colors.cardLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 - 12, y0 - 8, cw * cols + 24, ch * rows + 16);
    items.forEach((it, i) => {
      const x = x0 + (i % cols) * cw;
      const y = y0 + Math.floor(i / cols) * ch;
      const ok = isDone(it);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = s.colors.cardLine;
      ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
      ctx.setLineDash([]);
      const cx = x + cw / 2;
      const cy = y + ch * 0.34;
      const r = Math.min(cw, ch) * 0.22;
      if (ok) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.2);
        ctx.strokeStyle = s.colors.stamp;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = s.colors.stamp;
        ctx.font = font(13, true);
        ctx.textAlign = 'center';
        ctx.fillText(it.stamp, 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = s.colors.cardLine;
        ctx.font = font(26, true);
        ctx.textAlign = 'center';
        ctx.fillText('？', cx, cy);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = s.colors.cardInk;
      ctx.font = font(14, true);
      ctx.fillText(ok ? it.name : s.hidden, cx, y + ch * 0.64);
      ctx.font = font(11);
      wrap(ctx, it.hint, cw - 28).slice(0, 2).forEach((l, k) => ctx.fillText(l, cx, y + ch * 0.82 + k * 14));
    });
  }

  // C：額に入ったメダルを並べる。まだのメダルは影だけ
  #drawMedals(ctx, items, viewW, viewH) {
    const s = cfg();
    const cols = 3;
    const rows = Math.ceil(items.length / cols);
    const cw = Math.min(210, (viewW - 80) / cols);
    const ch = Math.min(180, (viewH - 280) / rows);
    const x0 = (viewW - cw * cols) / 2;
    const y0 = 176;
    items.forEach((it, i) => {
      const x = x0 + (i % cols) * cw + 8;
      const y = y0 + Math.floor(i / cols) * ch + 6;
      const w = cw - 16;
      const h = ch - 12;
      const ok = isDone(it);
      ctx.fillStyle = s.colors.frame;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = s.colors.felt;
      ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
      const cx = x + w / 2;
      const cy = y + h * 0.36;
      // リボンとメダル
      ctx.fillStyle = ok ? s.colors.ribbon : 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(cx - 12, cy - 34, 10, 22);
      ctx.fillRect(cx + 2, cy - 34, 10, 22);
      ctx.fillStyle = ok ? s.colors.star : 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ok ? s.colors.frame : 'rgba(255, 255, 255, 0.15)';
      ctx.font = font(18, true);
      ctx.textAlign = 'center';
      ctx.fillText(ok ? '★' : '？', cx, cy + 1);
      ctx.fillStyle = ok ? s.colors.text : s.colors.dim;
      ctx.font = font(14, true);
      ctx.fillText(ok ? it.name : s.hidden, cx, y + h * 0.62);
      ctx.fillStyle = s.colors.sub;
      ctx.font = font(11);
      wrap(ctx, it.hint, w - 24).slice(0, 2).forEach((l, k) => ctx.fillText(l, cx, y + h * 0.8 + k * 14));
    });
  }
}
