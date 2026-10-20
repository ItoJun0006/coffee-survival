import { CONFIG } from './config.js';
import { drawItemIcon } from './item-icons.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const CARD_W = 220;
const CARD_H = 240;
const GAP = 24;
const ELEMENT_LABEL = { none: '', hot: '熱い', ice: '冷たい' };

const KIND_LABEL = { weapon: '攻撃', item: '強化アイテム', bonus: 'ボーナス' };

// レベルアップで出る候補を選ぶ画面。choices は { kind, name, desc, element, level, isNew } の配列
export class LevelUpMenu {
  open(choices, level) {
    this.choices = choices;
    this.level = level;
    this.index = 0;
  }

  // 選んだ候補を返す。まだ選んでいなければ null
  update(input, viewW, viewH) {
    const n = this.choices.length;
    if (input.wasPressed('ArrowLeft', 'KeyA')) this.index = (this.index + n - 1) % n;
    if (input.wasPressed('ArrowRight', 'KeyD')) this.index = (this.index + 1) % n;
    for (let i = 0; i < n; i++) {
      if (input.wasPressed(`Digit${i + 1}`, `Numpad${i + 1}`)) return this.choices[i];
    }
    if (!input.consumeClick()) return null;
    if (!input.clickPos) return this.choices[this.index];
    const card = this.#cards(viewW, viewH).find((c) => inRect(input.clickPos, c));
    return card ? this.choices[card.index] : null;
  }

  #cards(viewW, viewH) {
    const n = this.choices.length;
    const left = (viewW - (n * CARD_W + (n - 1) * GAP)) / 2;
    const top = viewH / 2 - CARD_H / 2 + 20;
    return this.choices.map((choice, index) => ({ choice, index, x: left + index * (CARD_W + GAP), y: top, w: CARD_W, h: CARD_H }));
  }

  draw(ctx, viewW, viewH) {
    const c = CONFIG.colors;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);

    const cards = this.#cards(viewW, viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.xpBar;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(`レベル ${this.level}！`, viewW / 2, cards[0].y - 64);
    ctx.fillStyle = c.text;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(this.choices[0].kind === 'bonus' ? 'すべて最大まで強化した！ ボーナスを 1 つ選ぶ' : '攻撃かアイテムを 1 つ選ぶ', viewW / 2, cards[0].y - 32);

    for (const card of cards) this.#drawCard(ctx, card, card.index === this.index);

    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('←→ で選ぶ　Space / Enter / 1〜3 キー / クリックで決定', viewW / 2, cards[0].y + CARD_H + 32);
  }

  #drawCard(ctx, card, selected) {
    const c = CONFIG.colors;
    const { kind, iconId, name, desc, element, level, isNew } = card.choice;
    const cx = card.x + card.w / 2;
    // 攻撃は茶色、アイテムは緑の枠で見分ける
    const accent = kind === 'item' ? c.itemCard : c.hudBar;
    ctx.fillStyle = selected ? 'rgba(217, 160, 102, 0.25)' : c.hudBg;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = selected ? 3 : 1;
    ctx.globalAlpha = selected ? 1 : 0.5;
    ctx.strokeRect(card.x, card.y, card.w, card.h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(243, 230, 216, 0.5)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(String(card.index + 1), card.x + 16, card.y + 16);
    ctx.fillStyle = accent;
    ctx.fillText(KIND_LABEL[kind], cx, card.y + 16);

    // NEW か、強化の段階
    if (kind !== 'bonus') {
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = isNew ? c.xpBar : accent;
      ctx.fillText(isNew ? 'NEW' : `Lv ${level} → ${level + 1}`, cx, card.y + 40);
    }

    // アイコンがあるカードは、アイコンの下に名前と説明を置く
    const nameY = card.y + (iconId ? 128 : 70);
    const descY = card.y + (iconId ? 154 : 122);
    if (iconId) drawItemIcon(ctx, iconId, cx, card.y + 82, 56);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(name, cx, nameY);
    const elementLabel = ELEMENT_LABEL[element];
    if (elementLabel) {
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = element === 'hot' ? '#e8935a' : '#9cc7e8';
      ctx.fillText(`属性：${elementLabel}`, cx, nameY + 24);
    }

    ctx.fillStyle = 'rgba(243, 230, 216, 0.8)';
    ctx.font = '12px system-ui, sans-serif';
    this.#wrap(ctx, desc, card.w - 28).forEach((line, i) => ctx.fillText(line, cx, descY + i * 17));
    if (kind === 'bonus') return;

    // 強化の段階を ● で見せる
    const max = CONFIG.weaponLevels.max;
    const next = level + 1;
    ctx.font = '14px system-ui, sans-serif';
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < next ? accent : 'rgba(255,255,255,0.15)';
      ctx.fillText('●', cx + (i - (max - 1) / 2) * 18, card.y + card.h - 24);
    }
  }

  // 説明文の改行（\n）で分け、さらにカードの幅に収まるように折り返す
  #wrap(ctx, text, maxWidth) {
    return text.split('\n').flatMap((part) => this.#wrapLine(ctx, part, maxWidth));
  }

  #wrapLine(ctx, text, maxWidth) {
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
}
