import { CONFIG } from './config.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const CARD_W = 220;
const CARD_H = 210;
const GAP = 24;
const ELEMENT_LABEL = { none: '', hot: '熱い', ice: '冷たい' };

// レベルアップで出る攻撃の候補を選ぶ画面。choices は { weapon, isNew } の配列
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
    ctx.fillText('攻撃を 1 つ選ぶ', viewW / 2, cards[0].y - 32);

    for (const card of cards) this.#drawCard(ctx, card, card.index === this.index);

    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('←→ で選ぶ　Space / Enter / 1〜3 キー / クリックで決定', viewW / 2, cards[0].y + CARD_H + 32);
  }

  #drawCard(ctx, card, selected) {
    const c = CONFIG.colors;
    const { weapon, isNew } = card.choice;
    const cx = card.x + card.w / 2;
    ctx.fillStyle = selected ? 'rgba(217, 160, 102, 0.25)' : c.hudBg;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (selected) {
      ctx.strokeStyle = c.hudBar;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
    }

    ctx.fillStyle = 'rgba(243, 230, 216, 0.5)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(String(card.index + 1), card.x + 16, card.y + 16);

    // NEW か、強化の段階
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = isNew ? c.xpBar : c.hudBar;
    ctx.fillText(isNew ? 'NEW' : `Lv ${weapon.level} → ${weapon.level + 1}`, cx, card.y + 34);

    ctx.fillStyle = c.text;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(weapon.name, cx, card.y + 68);
    const element = ELEMENT_LABEL[weapon.config.element];
    if (element) {
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = weapon.config.element === 'hot' ? '#e8935a' : '#9cc7e8';
      ctx.fillText(`属性：${element}`, cx, card.y + 92);
    }

    ctx.fillStyle = 'rgba(243, 230, 216, 0.8)';
    ctx.font = '12px system-ui, sans-serif';
    this.#wrap(ctx, weapon.desc, card.w - 28).forEach((line, i) => ctx.fillText(line, cx, card.y + 122 + i * 18));

    // 強化の段階を ● で見せる
    const max = CONFIG.weaponLevels.max;
    const next = isNew ? 1 : weapon.level + 1;
    ctx.font = '14px system-ui, sans-serif';
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < next ? c.hudBar : 'rgba(255,255,255,0.15)';
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
