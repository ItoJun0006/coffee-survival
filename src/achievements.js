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
    this.#drawList(ctx, items, viewW, viewH);
    const b = this.#back(viewW, viewH);
    ctx.strokeStyle = s.colors.title;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = s.colors.title;
    ctx.font = font(14, true);
    ctx.fillText(s.back, b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }

  // 黒板の一覧（3 案から A）。左に★、名前、下に条件、右にごほうび
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
}
