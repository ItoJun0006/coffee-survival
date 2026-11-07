import { CONFIG } from './config.js';
import { CHARACTERS } from './characters.js';
import { drawCharacter } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { PixelLayer } from './pixel-layer.js';
import { coins } from './progress.js';
import { coinText, drawCoin } from './coin-ui.js';
import { font } from './font.js';
import { sound } from './sound.js';

// カードの卓の画面に共通の部品（ブラックジャック：仕様 043、ビデオポーカー：仕様 044）。
// 1200 × 720 の枠で並べ、画面がせまいときは枠ごと縮める。絵はドット絵の層に、文字はドットにせずその上に描く。
// 見た目の色と、カードに描く絵（キャラ・眠気の手下）は CONFIG.cardGame を共通で使う
const table = () => CONFIG.cardGame;
export const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
export const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export const BOX = { w: 1200, h: 720 };
export const CARD = { w: 104, h: 146, gap: 16 };
const BUTTON = { w: 170, h: 56, gap: 18 };
const CHARS = CHARACTERS.filter((c) => !c.placeholder);
// マーク（♠ ♥ ♦ ♣）。♥ と ♦ は赤
const RED_SUITS = [1, 2];

const isFace = (rank) => rank === 'J' || rank === 'Q' || rank === 'K';

// 遊び方のページを最後まで見たか（ブラウザに保存する。見たあとは、はじめに出さない）
function howtoSeen(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function saveHowtoSeen(key) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // 保存できなくても、このプレイの間は遊び方を閉じられる
  }
}

// ---- マークの絵 ----
function heart(p, x, y, s) {
  p.beginPath();
  p.moveTo(x, y + s * 0.9);
  p.bezierCurveTo(x - s * 1.2, y, x - s * 0.7, y - s * 0.9, x, y - s * 0.3);
  p.bezierCurveTo(x + s * 0.7, y - s * 0.9, x + s * 1.2, y, x, y + s * 0.9);
  p.fill();
}
function spade(p, x, y, s) {
  p.beginPath();
  p.moveTo(x, y - s * 0.9);
  p.bezierCurveTo(x - s * 1.2, y, x - s * 0.6, y + s * 0.8, x, y + s * 0.3);
  p.bezierCurveTo(x + s * 0.6, y + s * 0.8, x + s * 1.2, y, x, y - s * 0.9);
  p.fill();
  p.fillRect(x - s * 0.15, y, s * 0.3, s * 0.9);
}
function diamond(p, x, y, s) {
  p.beginPath();
  p.moveTo(x, y - s);
  p.lineTo(x + s * 0.7, y);
  p.lineTo(x, y + s);
  p.lineTo(x - s * 0.7, y);
  p.fill();
}
function club(p, x, y, s) {
  for (const [dx, dy] of [[0, -0.45], [-0.45, 0.15], [0.45, 0.15]]) {
    p.beginPath();
    p.arc(x + dx * s, y + dy * s, s * 0.42, 0, Math.PI * 2);
    p.fill();
  }
  p.fillRect(x - s * 0.15, y, s * 0.3, s * 0.95);
}
const SUIT_MARKS = [spade, heart, diamond, club];

export class CardTable {
  // game は、このゲームの設定（CONFIG.cardGame・CONFIG.poker）を返す関数。howtoKey は遊び方を見たかを保存する名前
  constructor(game, howtoKey) {
    this.game = game;
    this.howtoKey = howtoKey;
    this.pixel = new PixelLayer();
    this.pixelSize = { w: 0, h: 0 };
    this.enemyArt = {};
    this.betIndex = 0;
  }

  colors() {
    return table().colors;
  }

  // 入ったとき：はじめてなら遊び方のページを見せ、曲を流す
  openTable() {
    this.howto = howtoSeen(this.howtoKey) ? null : 0;
    this.openedAt = performance.now();
    sound.startMusic();
  }

  // 遊び方のページの操作。ページを開いているとき（開いたとき）は true を返し、ほかの操作はしない。Esc はページを閉じるだけ
  handleHowto(input, clicked) {
    const help = this.game().help;
    if (this.howto === null && input.wasPressed(`Key${help.key}`)) {
      this.howto = 0;
      return true;
    }
    if (this.howto === null) return false;
    if (input.wasPressed('ArrowLeft')) this.howto = Math.max(0, this.howto - 1);
    else if (input.wasPressed('ArrowRight') || clicked) this.howto += 1;
    if (this.howto >= help.pages.length || input.wasPressed('Escape')) {
      this.howto = null;
      saveHowtoSeen(this.howtoKey);
    }
    return true;
  }

  // ---- 並べ方 ----

  view(viewW, viewH) {
    const k = Math.min(1, viewW / BOX.w, viewH / BOX.h);
    return { k, ox: (viewW - BOX.w * k) / 2, oy: (viewH - BOX.h * k) / 2 };
  }

  // クリックの位置を、枠の中の位置に直す
  toBox(view, input, clicked) {
    return clicked && input.clickPos ? { x: (input.clickPos.x - view.ox) / view.k, y: (input.clickPos.y - view.oy) / view.k } : null;
  }

  // 1 列に並べたカードの x。はみ出すときは重ねて詰める
  row(n, cx, maxW) {
    const step = n > 1 ? Math.min(CARD.w + CARD.gap, (maxW - CARD.w) / (n - 1)) : 0;
    const left = cx - (CARD.w + step * (n - 1)) / 2;
    return Array.from({ length: n }, (_, i) => left + i * step);
  }

  // ボタンを 1 列に並べる（cx を中心に、y の高さに）
  buttonRow(items, y, cx = BOX.w / 2) {
    let x = cx - (items.length * BUTTON.w + (items.length - 1) * BUTTON.gap) / 2;
    return items.map((b) => {
      const r = { ...b, x, y, w: BUTTON.w, h: BUTTON.h };
      x += BUTTON.w + BUTTON.gap;
      return r;
    });
  }

  // ---- 賭ける豆コインの段階 ----

  bets() {
    return this.game().bets;
  }

  bet() {
    return this.bets()[this.betIndex];
  }

  minBet() {
    return Math.min(...this.bets());
  }

  // 持っている豆コインで賭けられる、いちばん大きい段階までにおさめる
  clampBet() {
    const can = this.bets().filter((b) => b <= coins()).length;
    this.betIndex = Math.max(0, Math.min(this.betIndex, can - 1));
  }

  stepBet(d) {
    const can = this.bets().filter((b) => b <= coins()).length;
    this.betIndex = Math.max(0, Math.min(can - 1, this.betIndex + d));
  }

  betButtons(y, cx) {
    return this.buttonRow([
      ...this.bets().map((b, i) => ({ bet: i, label: `${b} 枚`, sub: i === this.betIndex ? '← 賭ける →' : '', enabled: b <= coins(), selected: i === this.betIndex })),
      { id: 'deal', label: '配る', sub: '［Enter］', enabled: true, primary: true },
    ], y, cx);
  }

  // ---- 描き方 ----

  // 背景をぬり、drawShapes(p, t) をドット絵の層に、drawTexts(ctx) をその上に描く
  render(ctx, viewW, viewH) {
    const view = this.view(viewW, viewH);
    const t = (performance.now() - (this.openedAt ?? 0)) / 1000;
    ctx.save();
    ctx.fillStyle = this.colors().bg;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
    if (this.pixelSize.w !== viewW || this.pixelSize.h !== viewH) {
      this.pixel.resize(viewW, viewH);
      this.pixelSize = { w: viewW, h: viewH };
    }
    const p = this.pixel.begin();
    p.setTransform(view.k, 0, 0, view.k, view.ox, view.oy);
    this.drawShapes(p, t);
    this.pixel.end(ctx);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.k, view.k);
    ctx.textBaseline = 'middle';
    this.drawTexts(ctx);
    ctx.restore();
  }

  box(ctx, x, y, w, h, fillColor, line = 4, lineColor = this.colors().line) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
    if (line) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = line;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // 床と、金のわく
  drawFloor(p) {
    const c = this.colors();
    p.fillStyle = c.floor;
    p.fillRect(20, 20, BOX.w - 40, BOX.h - 40);
    p.fillStyle = c.grid;
    for (let x = 20; x < BOX.w - 20; x += 48) p.fillRect(x, 20, 3, BOX.h - 40);
    for (let y = 20; y < BOX.h - 20; y += 48) p.fillRect(20, y, BOX.w - 40, 3);
    p.strokeStyle = c.frame;
    p.lineWidth = 6;
    p.strokeRect(20, 20, BOX.w - 40, BOX.h - 40);
  }

  // 親（drawDealer で pos に描く）と、ふきだし（bubble の位置に、名前と line）
  bubbleRect(ctx, pos, line) {
    ctx.font = font(15, true);
    const w = Math.max(ctx.measureText(line).width, ctx.measureText(`親：${this.game().dealer.name}`).width) + 32;
    return { x: pos.x, y: pos.y, w, h: 64 };
  }

  drawDealerShapes(p, t, drawDealer, dealerPos, bubblePos, line) {
    const c = this.colors();
    p.save();
    p.translate(dealerPos.x, dealerPos.y);
    p.scale(dealerPos.scale, dealerPos.scale);
    drawDealer(p, 0, 0, t);
    p.restore();
    const b = this.bubbleRect(p, bubblePos, line);
    this.box(p, b.x, b.y, b.w, b.h, c.bubble);
    p.fillStyle = c.bubble;
    p.beginPath();
    p.moveTo(b.x, b.y + 24);
    p.lineTo(b.x - 16, b.y + 32);
    p.lineTo(b.x, b.y + 40);
    p.fill();
    p.stroke();
    // 持っている豆コインの印（右上）
    p.font = font(18, true);
    const have = `${CONFIG.coins.name} ${coinText(coins())}`;
    drawCoin(p, BOX.w - 50 - p.measureText(have).width - 14, 56, 9);
  }

  drawBubbleTexts(ctx, bubblePos, line) {
    const c = this.colors();
    const b = this.bubbleRect(ctx, bubblePos, line);
    ctx.textAlign = 'left';
    ctx.fillStyle = c.name;
    ctx.fillText(`親：${this.game().dealer.name}`, b.x + 16, b.y + 20);
    ctx.fillStyle = c.ink;
    ctx.fillText(line, b.x + 16, b.y + 44);
  }

  // 左上：題名と勝負の数。右上：豆コインと賭け（betText が空なら出さない）
  drawHudTexts(ctx, roundText, betText) {
    const c = this.colors();
    ctx.fillStyle = c.text;
    ctx.textAlign = 'left';
    ctx.font = font(18, true);
    ctx.fillText(this.game().title, 50, 56);
    ctx.font = font(15);
    ctx.fillText(roundText, 50, 84);
    ctx.textAlign = 'right';
    ctx.font = font(18, true);
    ctx.fillText(`${CONFIG.coins.name} ${coinText(coins())}`, BOX.w - 50, 56);
    ctx.font = font(15);
    if (betText) ctx.fillText(betText, BOX.w - 50, 84);
  }

  // 賭けた豆コインの山（10 枚ごとに 1 枚、いちばん多くて 10 枚）
  drawBetStack(p, x, y, bet) {
    const stack = Math.min(10, Math.ceil(bet / 10));
    for (let i = 0; i < stack; i++) drawCoin(p, x, y + 40 - i * 7, 14);
  }

  drawButtonShapes(p, buttons) {
    const c = this.colors();
    for (const btn of buttons) {
      p.fillStyle = '#000';
      p.fillRect(btn.x + 6, btn.y + 6, btn.w, btn.h);
      this.box(p, btn.x, btn.y, btn.w, btn.h, btn.enabled ? c.button : c.buttonOff, 5, (btn.primary || btn.selected) && btn.enabled ? c.accent : c.line);
    }
  }

  drawButtonTexts(ctx, buttons) {
    const c = this.colors();
    ctx.textAlign = 'center';
    for (const btn of buttons) {
      ctx.fillStyle = btn.enabled ? c.ink : 'rgba(150, 140, 130, 0.9)';
      ctx.font = font(19, true);
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 - (btn.sub ? 8 : 0));
      if (btn.sub) {
        ctx.font = font(12);
        ctx.fillText(btn.sub, btn.x + btn.w / 2, btn.y + btn.h / 2 + 14);
      }
    }
  }

  // ---- カード ----

  cardBack(p, x, y) {
    const c = this.colors();
    this.box(p, x, y, CARD.w, CARD.h, c.cardBack, 6, c.cardBackInk);
    p.fillStyle = c.cardBackInk;
    for (let yy = y + 18; yy < y + CARD.h - 8; yy += 26) {
      for (let xx = x + 18 + ((yy - y) / 26 % 2) * 13; xx < x + CARD.w - 8; xx += 26) {
        p.beginPath();
        p.ellipse(xx, yy, 6, 8, 0.5, 0, Math.PI * 2);
        p.fill();
      }
    }
  }

  // カードの絵。数字の札は珈琲豆のキャラ、絵札は眠気の手下。suit があれば、すみの数字の反対側にマークを描く
  cardFace(p, card, x, y) {
    const c = this.colors();
    const suited = card.suit !== undefined;
    p.fillStyle = 'rgba(0, 0, 0, 0.45)';
    p.fillRect(x + 6, y + 6, CARD.w, CARD.h);
    this.box(p, x, y, CARD.w, CARD.h, c.card, 6);
    const face = isFace(card.rank);
    p.fillStyle = face ? c.enemyPanel : c.beanPanel;
    if (suited) p.fillRect(x + 14, y + 46, CARD.w - 28, CARD.h - 92);
    else p.fillRect(x + 14, y + 40, CARD.w - 28, CARD.h - 80);
    if (suited) {
      p.fillStyle = RED_SUITS.includes(card.suit) ? c.red : c.ink;
      SUIT_MARKS[card.suit](p, x + CARD.w - 24, y + 24, 13);
      SUIT_MARKS[card.suit](p, x + 24, y + CARD.h - 22, 13);
    }
    const cx = x + CARD.w / 2;
    const cy = y + CARD.h / 2 + (suited ? 0 : 6);
    p.save();
    p.translate(cx, cy);
    if (face) {
      const type = table().faceEnemies[card.rank];
      this.enemyArt[type] ??= new Enemy(type, 0, 0);
      p.scale(suited ? 1.4 : 1.6, suited ? 1.4 : 1.6);
      this.enemyArt[type].draw(p);
    } else {
      drawCharacter(p, CHARS[table().rankCharacters[Number(card.rank) - 1] % CHARS.length], suited ? 19 : 22);
    }
    p.restore();
  }

  // すみの数字。マークのある札は赤か黒、ない札は絵札だけ紫
  cardCorners(ctx, card, x, y) {
    const c = this.colors();
    const suited = card.suit !== undefined;
    ctx.fillStyle = suited ? (RED_SUITS.includes(card.suit) ? c.red : c.ink) : isFace(card.rank) ? c.enemyInk : c.ink;
    ctx.font = font(suited ? 26 : 30, true);
    ctx.textAlign = 'left';
    ctx.fillText(card.rank, x + 12, y + (suited ? 22 : 24));
    ctx.textAlign = 'right';
    ctx.fillText(card.rank, x + CARD.w - 12, y + CARD.h - (suited ? 20 : 22));
  }

  // ---- 遊び方のページ ----

  // ページの例のカード。'J' のような文字か、['J', 1]（数字とマーク）
  howtoCards(page) {
    const xs = this.row(page.cards.length, BOX.w / 2, 600);
    return page.cards.map((c, i) => ({ card: typeof c === 'string' ? { rank: c } : { rank: c[0], suit: c[1] }, x: xs[i], y: 420 }));
  }

  drawHowtoShapes(p) {
    const page = this.game().help.pages[this.howto];
    p.fillStyle = 'rgba(0, 0, 0, 0.55)';
    p.fillRect(20, 20, BOX.w - 40, BOX.h - 40);
    this.box(p, 200, 150, 800, 470, this.colors().card, 6);
    for (const d of this.howtoCards(page)) this.cardFace(p, d.card, d.x, d.y);
  }

  drawHowtoTexts(ctx) {
    const help = this.game().help;
    const c = this.colors();
    const page = help.pages[this.howto];
    ctx.textAlign = 'center';
    ctx.fillStyle = c.name;
    ctx.font = font(14, true);
    ctx.fillText(`遊び方 ${this.howto + 1} / ${help.pages.length}`, BOX.w / 2, 186);
    ctx.fillStyle = c.ink;
    ctx.font = font(26, true);
    ctx.fillText(page.title, BOX.w / 2, 222);
    ctx.font = font(17, true);
    ctx.textAlign = 'left';
    page.lines.forEach((line, i) => ctx.fillText(line, 250, 272 + i * (page.cards.length ? 34 : 50)));
    for (const d of this.howtoCards(page)) this.cardCorners(ctx, d.card, d.x, d.y);
    ctx.textAlign = 'center';
    ctx.fillStyle = c.name;
    ctx.font = font(13);
    ctx.fillText(help.pageHelp, BOX.w / 2, 600);
  }

  // ---- まとめ ----

  drawSummaryShapes(p) {
    this.box(p, 340, 230, 520, 330, this.colors().card, 6);
  }

  // rows は [名前, 値] の並び、net は増えた（減った）豆コイン
  drawSummaryTexts(ctx, title, rows, netLabel, net, backText) {
    const c = this.colors();
    ctx.textAlign = 'center';
    ctx.fillStyle = c.ink;
    ctx.font = font(26, true);
    ctx.fillText(title, BOX.w / 2, 280);
    ctx.font = font(20, true);
    rows.forEach(([k, v], i) => {
      ctx.textAlign = 'left';
      ctx.fillText(k, 430, 338 + i * 38);
      ctx.textAlign = 'right';
      ctx.fillText(v, 770, 338 + i * 38);
    });
    ctx.textAlign = 'left';
    ctx.fillText(netLabel, 430, 468);
    ctx.textAlign = 'right';
    ctx.fillStyle = net > 0 ? '#2f8a3a' : net < 0 ? '#b0402a' : c.ink;
    ctx.fillText(`${net > 0 ? '+' : ''}${net} 枚`, 770, 468);
    ctx.textAlign = 'center';
    ctx.fillStyle = c.ink;
    ctx.font = font(14);
    ctx.fillText(backText, BOX.w / 2, 528);
  }
}
