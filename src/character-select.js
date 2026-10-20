import { CONFIG } from './config.js';
import { CHARACTERS, describeStats } from './characters.js';
import { drawCharacter } from './entities/player.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const CARD_W = 160;
const CARD_H = 190;
const GAP = 24;

// キャラ選択画面。品種ごとに 1 行、焙煎度ごとに 1 列のカードを並べる
export class CharacterSelect {
  constructor() {
    this.index = 0;
  }

  open(current) {
    this.index = Math.max(0, CHARACTERS.indexOf(current));
  }

  get selected() {
    return CHARACTERS[this.index];
  }

  // 決めたらそのキャラ、Esc なら 'back'、どちらでもなければ null を返す
  update(input, viewW, viewH) {
    const cols = CONFIG.characters.roasts.length;
    const move = (d) => {
      this.index = (this.index + d + CHARACTERS.length) % CHARACTERS.length;
    };
    if (input.wasPressed('ArrowLeft', 'KeyA')) move(-1);
    if (input.wasPressed('ArrowRight', 'KeyD')) move(1);
    if (input.wasPressed('ArrowUp', 'KeyW') && this.index - cols >= 0) move(-cols);
    if (input.wasPressed('ArrowDown', 'KeyS') && this.index + cols < CHARACTERS.length) move(cols);
    const clicked = input.consumeClick();
    if (input.wasPressed('Escape')) return 'back';
    if (!clicked) return null;

    if (input.clickPos) {
      const card = this.#cards(viewW, viewH).find((c) => inRect(input.clickPos, c));
      if (!card) return null;
      this.index = card.index;
    }
    return this.selected.unlocked ? this.selected : null;
  }

  #cards(viewW, viewH) {
    const cols = CONFIG.characters.roasts.length;
    const rows = Math.ceil(CHARACTERS.length / cols);
    const gridW = cols * CARD_W + (cols - 1) * GAP;
    const gridH = rows * CARD_H + (rows - 1) * GAP;
    const left = (viewW - gridW) / 2;
    const top = (viewH - gridH) / 2;
    return CHARACTERS.map((character, index) => ({
      character,
      index,
      x: left + (index % cols) * (CARD_W + GAP),
      y: top + Math.floor(index / cols) * (CARD_H + GAP),
      w: CARD_W,
      h: CARD_H,
    }));
  }

  draw(ctx, viewW, viewH) {
    const c = CONFIG.colors;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);

    const cards = this.#cards(viewW, viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('キャラクターを選ぶ', viewW / 2, cards[0].y - 50);

    for (const card of cards) this.#drawCard(ctx, card, card.index === this.index);

    const last = cards[cards.length - 1];
    const infoY = last.y + last.h + 36;
    const sel = this.selected;
    ctx.fillStyle = c.text;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(sel.unlocked ? `${sel.name}：${describeStats(sel).join('・')}` : 'この品種はまだ解放されていません', viewW / 2, infoY);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('←→ で選ぶ　Space / Enter / クリックで決定　Esc でタイトルへ', viewW / 2, infoY + 28);
  }

  #drawCard(ctx, card, selected) {
    const c = CONFIG.colors;
    const { character } = card;
    ctx.fillStyle = selected ? 'rgba(217, 160, 102, 0.25)' : c.hudBg;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (selected) {
      ctx.strokeStyle = c.hudBar;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
    }

    const cx = card.x + card.w / 2;
    ctx.save();
    ctx.globalAlpha = character.unlocked ? 1 : 0.25;
    ctx.translate(cx, card.y + 70);
    drawCharacter(ctx, character, 36, { bob: selected ? Math.abs(Math.sin(performance.now() / 160)) : 0 });
    ctx.restore();

    ctx.fillStyle = c.text;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(character.unlocked ? character.name : '？？？', cx, card.y + 135);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText(character.unlocked ? character.roast.trait : '未解放', cx, card.y + 160);
  }
}
