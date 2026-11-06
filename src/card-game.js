import { CONFIG } from './config.js';
import { CHARACTERS } from './characters.js';
import { drawCharacter } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { drawSheepDealer } from './entities/sheep-dealer.js';
import { PixelLayer } from './pixel-layer.js';
import { coins, addCoins, spendCoins } from './progress.js';
import { coinText, drawCoin } from './coin-ui.js';
import { font } from './font.js';
import { sound } from './sound.js';
import { makeShoe, handTotal, isBust, isNatural, isFace, dealerShouldHit, canSplitCards, settle } from './blackjack.js';

// カードゲーム「珈琲ブラックジャック」（仕様 043）の画面。
// 賭ける → 配る → 自分の番（もう 1 枚・これで勝負・倍賭け・分ける）→ 親の番 → 結果、を rounds 回くり返してまとめを出す。
// 豆コインは勝負が決まったときだけ動かす（途中でやめたら、その勝負は無かったことになる）
const cfg = () => CONFIG.cardGame;
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

export const minBet = () => Math.min(...cfg().bets);
export const canEnterCardGame = () => coins() >= minBet();
export const notEnoughText = () => fill(cfg().texts.notEnough, { min: minBet() });

// 1200 × 720 の枠で並べ、画面がせまいときは枠ごと縮める
const BOX = { w: 1200, h: 720 };
const CARD = { w: 104, h: 146, gap: 16 };
const POS = { dealer: { x: 600, y: 114, scale: 0.85 }, bubble: { x: 720, y: 90 }, dealerRow: 290, playerRow: 484, banner: 388, buttonsY: 608, bet: { x: 200, y: 484 } };
const BUTTON = { w: 170, h: 56, gap: 18 };

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const CHARS = CHARACTERS.filter((c) => !c.placeholder);

export class CardGame {
  constructor() {
    this.pixel = new PixelLayer();
    this.pixelSize = { w: 0, h: 0 };
    this.shoe = [];
    this.enemyArt = {};
  }

  open() {
    this.round = 0;
    this.stats = { win: 0, lose: 0, push: 0, net: 0 };
    this.betIndex = 0;
    this.#toBet();
    this.openedAt = performance.now();
    sound.startMusic();
  }

  // 戻るときは 'back' を返す
  update(input, viewW, viewH) {
    if (input.wasPressed('Escape')) return 'back';
    const view = this.#view(viewW, viewH);
    const clicked = input.consumeClick();
    const pos = clicked && input.clickPos ? { x: (input.clickPos.x - view.ox) / view.k, y: (input.clickPos.y - view.oy) / view.k } : null;
    const button = pos ? this.#buttons().find((b) => inRect(pos, b)) : null;
    if (this.phase === 'bet') {
      if (input.wasPressed('ArrowLeft')) this.#stepBet(-1);
      if (input.wasPressed('ArrowRight')) this.#stepBet(1);
      if (button?.bet !== undefined && button.enabled) this.betIndex = button.bet;
      else if ((clicked && !pos) || button?.id === 'deal') this.#deal();
    } else if (this.phase === 'play') {
      const keyed = ['hit', 'stand', 'double', 'split'].find((id) => input.wasPressed(`Key${cfg().texts.actions[id].key}`));
      const id = button?.enabled ? button.id : keyed;
      if (id) this.#act(id);
    } else if (this.phase === 'dealer') {
      this.#stepDealer(performance.now());
    } else if (this.phase === 'result') {
      if (clicked) this.#afterResult();
    } else if (this.phase === 'summary') {
      if (clicked) return 'back';
    }
    return null;
  }

  // ---- 流れ ----

  #bets() {
    return cfg().bets;
  }

  #bet() {
    return this.#bets()[this.betIndex];
  }

  // 持っている豆コインで賭けられる、いちばん大きい段階までにおさめる
  #clampBet() {
    const can = this.#bets().filter((b) => b <= coins()).length;
    this.betIndex = Math.max(0, Math.min(this.betIndex, can - 1));
  }

  #stepBet(d) {
    const can = this.#bets().filter((b) => b <= coins()).length;
    this.betIndex = Math.max(0, Math.min(can - 1, this.betIndex + d));
  }

  #toBet() {
    this.phase = 'bet';
    this.hands = [];
    this.dealer = [];
    this.holeOpen = false;
    this.results = null;
    this.line = 'bet';
    this.#clampBet();
  }

  #draw() {
    return this.shoe.pop();
  }

  #deal() {
    if (this.shoe.length < cfg().reshuffleBelow) this.shoe = makeShoe();
    const bet = this.#bet();
    this.hands = [{ cards: [this.#draw()], bet, fromSplit: false, doubled: false, done: false }];
    this.dealer = [this.#draw()];
    this.hands[0].cards.push(this.#draw());
    this.dealer.push(this.#draw());
    this.active = 0;
    this.line = 'play';
    this.phase = 'play';
    sound.play('bean');
    // どちらかがちょうどいい一杯なら、引かずにすぐくらべる
    if (isNatural(this.hands[0].cards) || isNatural(this.dealer)) {
      this.hands[0].done = true;
      this.#toDealer();
    }
  }

  #committed() {
    return this.hands.reduce((sum, h) => sum + h.bet, 0);
  }

  #canDouble(h) {
    return !!h && h.cards.length === 2 && !h.doubled && coins() >= this.#committed() + h.bet;
  }

  #canSplit(h) {
    return !!h && this.hands.length === 1 && canSplitCards(h.cards) && coins() >= this.#committed() + h.bet;
  }

  #act(id) {
    const h = this.hands[this.active];
    if (!h || h.done) return;
    if (id === 'hit') {
      h.cards.push(this.#draw());
      if (handTotal(h.cards).total >= 21) h.done = true;
    } else if (id === 'stand') {
      h.done = true;
    } else if (id === 'double') {
      if (!this.#canDouble(h)) return;
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(this.#draw());
      h.done = true;
    } else if (id === 'split') {
      if (!this.#canSplit(h)) return;
      const [a, b] = h.cards;
      // 1 を分けたら、それぞれ 1 枚だけ引いて終わる
      const ones = a.rank === '1';
      this.hands = [a, b].map((c) => {
        const cards = [c, this.#draw()];
        return { cards, bet: h.bet, fromSplit: true, doubled: false, done: ones || handTotal(cards).total === 21 };
      });
      this.active = 0;
    }
    sound.play('bean');
    this.#nextHand();
  }

  #nextHand() {
    const next = this.hands.findIndex((h) => !h.done);
    if (next >= 0) {
      this.active = next;
      return;
    }
    this.#toDealer();
  }

  // 親の番：裏のカードを開き、引く必要があれば dealerStepSec ごとに 1 枚ずつ引く
  #toDealer() {
    this.phase = 'dealer';
    this.holeOpen = true;
    this.active = -1;
    const alive = this.hands.some((h) => !isBust(h.cards));
    const onlyNatural = this.hands.length === 1 && isNatural(this.hands[0].cards);
    this.dealerDraws = alive && !onlyNatural && !isNatural(this.dealer);
    this.nextStepAt = performance.now() + cfg().dealerStepSec * 1000;
  }

  #stepDealer(now) {
    if (now < this.nextStepAt) return;
    if (this.dealerDraws && dealerShouldHit(this.dealer)) {
      this.dealer.push(this.#draw());
      this.nextStepAt = now + cfg().dealerStepSec * 1000;
      return;
    }
    this.#finishRound();
  }

  // 勝負が決まった：豆コインを動かして保存し、結果を出す
  #finishRound() {
    this.results = this.hands.map((h) => settle(h, this.dealer));
    const delta = this.results.reduce((sum, r) => sum + r.delta, 0);
    if (delta > 0) addCoins(delta);
    else if (delta < 0) spendCoins(-delta);
    for (const r of this.results) {
      if (r.delta > 0) this.stats.win++;
      else if (r.delta < 0) this.stats.lose++;
      else this.stats.push++;
    }
    this.stats.net += delta;
    this.delta = delta;
    this.round++;
    const natural = this.results.some((r) => r.result === 'natural');
    this.line = delta > 0 ? (natural ? 'natural' : 'win') : delta < 0 ? 'lose' : 'push';
    sound.play(natural ? 'levelUp' : delta > 0 ? 'bean' : delta < 0 ? 'fakeBean' : 'hit');
    this.phase = 'result';
  }

  #isLastRound() {
    return this.round >= cfg().rounds || coins() < minBet();
  }

  #afterResult() {
    if (this.#isLastRound()) {
      this.phase = 'summary';
      this.line = 'summary';
      return;
    }
    this.#toBet();
  }

  // ---- 並べ方 ----

  #view(viewW, viewH) {
    const k = Math.min(1, viewW / BOX.w, viewH / BOX.h);
    return { k, ox: (viewW - BOX.w * k) / 2, oy: (viewH - BOX.h * k) / 2 };
  }

  // 1 列に並べたカードの x。はみ出すときは重ねて詰める
  #row(n, cx, maxW) {
    const step = n > 1 ? Math.min(CARD.w + CARD.gap, (maxW - CARD.w) / (n - 1)) : 0;
    const left = cx - (CARD.w + step * (n - 1)) / 2;
    return Array.from({ length: n }, (_, i) => left + i * step);
  }

  #dealerCards() {
    const xs = this.#row(this.dealer.length, POS.dealer.x, 640);
    return this.dealer.map((card, i) => ({ card, x: xs[i], y: POS.dealerRow - CARD.h / 2, back: i === 1 && !this.holeOpen }));
  }

  #handLayouts() {
    const split = this.hands.length > 1;
    return this.hands.map((h, i) => {
      const cx = split ? (i === 0 ? 390 : 810) : POS.dealer.x;
      const xs = this.#row(h.cards.length, cx, split ? 380 : 640);
      const cards = h.cards.map((card, j) => ({ card, x: xs[j], y: POS.playerRow - CARD.h / 2 }));
      return { hand: h, cards, cx, active: split && i === this.active, result: this.results?.[i] };
    });
  }

  #buttons() {
    const t = cfg().texts;
    const row = (items) => {
      let x = BOX.w / 2 - (items.length * BUTTON.w + (items.length - 1) * BUTTON.gap) / 2;
      return items.map((b) => {
        const r = { ...b, x, y: POS.buttonsY, w: BUTTON.w, h: BUTTON.h };
        x += BUTTON.w + BUTTON.gap;
        return r;
      });
    };
    if (this.phase === 'bet') {
      return row([
        ...this.#bets().map((b, i) => ({ bet: i, label: `${b} 枚`, sub: i === this.betIndex ? '← 賭ける →' : '', enabled: b <= coins(), selected: i === this.betIndex })),
        { id: 'deal', label: '配る', sub: '［Enter］', enabled: true, primary: true },
      ]);
    }
    if (this.phase === 'play') {
      const h = this.hands[this.active];
      const a = t.actions;
      // 選べないときは、札の形が合わないのか、豆コインが足りないのかを出す
      const sub = (id, shapeOk, can) => (can ? `［${a[id].key}］` : shapeOk ? a.noCoins : a[id].off);
      const doubleShape = !!h && h.cards.length === 2 && !h.doubled;
      const splitShape = !!h && this.hands.length === 1 && canSplitCards(h.cards);
      const canDouble = this.#canDouble(h);
      const canSplit = this.#canSplit(h);
      return row([
        { id: 'hit', label: a.hit.label, sub: `［${a.hit.key}］`, enabled: true, primary: true },
        { id: 'stand', label: a.stand.label, sub: `［${a.stand.key}］`, enabled: true },
        { id: 'double', label: a.double.label, sub: sub('double', doubleShape, canDouble), enabled: canDouble },
        { id: 'split', label: a.split.label, sub: sub('split', splitShape, canSplit), enabled: canSplit },
      ]);
    }
    if (this.phase === 'result') {
      return row([{ id: 'next', label: this.#isLastRound() ? 'まとめへ' : '次の勝負へ', sub: '［Enter］', enabled: true, primary: true }]);
    }
    return [];
  }

  // ---- 描き方 ----

  draw(ctx, viewW, viewH) {
    const c = cfg().colors;
    const view = this.#view(viewW, viewH);
    const t = (performance.now() - (this.openedAt ?? 0)) / 1000;
    ctx.save();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
    // 絵はドット絵の層に、文字はドットにせずその上に描く
    if (this.pixelSize.w !== viewW || this.pixelSize.h !== viewH) {
      this.pixel.resize(viewW, viewH);
      this.pixelSize = { w: viewW, h: viewH };
    }
    const p = this.pixel.begin();
    p.setTransform(view.k, 0, 0, view.k, view.ox, view.oy);
    this.#drawShapes(p, t);
    this.pixel.end(ctx);
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.k, view.k);
    this.#drawTexts(ctx);
    ctx.restore();
  }

  #box(ctx, x, y, w, h, fillColor, line = 4, lineColor = cfg().colors.line) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, w, h);
    if (line) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = line;
      ctx.strokeRect(x, y, w, h);
    }
  }

  #bubbleRect(ctx) {
    const d = cfg().dealer;
    ctx.font = font(15, true);
    const w = Math.max(ctx.measureText(d.lines[this.line]).width, ctx.measureText(`親：${d.name}`).width) + 32;
    return { x: POS.bubble.x, y: POS.bubble.y, w, h: 64 };
  }

  #drawShapes(p, t) {
    const c = cfg().colors;
    // 床とわく
    p.fillStyle = c.floor;
    p.fillRect(20, 20, BOX.w - 40, BOX.h - 40);
    p.fillStyle = c.grid;
    for (let x = 20; x < BOX.w - 20; x += 48) p.fillRect(x, 20, 3, BOX.h - 40);
    for (let y = 20; y < BOX.h - 20; y += 48) p.fillRect(20, y, BOX.w - 40, 3);
    p.strokeStyle = c.frame;
    p.lineWidth = 6;
    p.strokeRect(20, 20, BOX.w - 40, BOX.h - 40);
    // 親とふきだし
    p.save();
    p.translate(POS.dealer.x, POS.dealer.y);
    p.scale(POS.dealer.scale, POS.dealer.scale);
    drawSheepDealer(p, 0, 0, t);
    p.restore();
    const b = this.#bubbleRect(p);
    this.#box(p, b.x, b.y, b.w, b.h, c.bubble);
    p.fillStyle = c.bubble;
    p.beginPath();
    p.moveTo(b.x, b.y + 24);
    p.lineTo(b.x - 16, b.y + 32);
    p.lineTo(b.x, b.y + 40);
    p.fill();
    p.stroke();
    // 持っている豆コインの印
    p.font = font(18, true);
    const have = `${CONFIG.coins.name} ${coinText(coins())}`;
    drawCoin(p, BOX.w - 50 - p.measureText(have).width - 14, 56, 9);
    if (this.phase === 'summary') {
      this.#box(p, 340, 230, 520, 330, c.card, 6);
      return;
    }
    // カード
    for (const d of this.#dealerCards()) (d.back ? this.#cardBack(p, d.x, d.y) : this.#cardFace(p, d.card, d.x, d.y));
    if (this.dealer.length) this.#box(p, this.#dealerBadge().x, this.#dealerBadge().y, this.#dealerBadge().w, 36, '#000', 4, c.accent);
    for (const hl of this.#handLayouts()) {
      if (hl.active) {
        const l = hl.cards[0].x - 10;
        const r = hl.cards[hl.cards.length - 1].x + CARD.w + 10;
        p.strokeStyle = c.accent;
        p.lineWidth = 6;
        p.strokeRect(l, POS.playerRow - CARD.h / 2 - 10, r - l, CARD.h + 20);
      }
      for (const d of hl.cards) this.#cardFace(p, d.card, d.x, d.y);
      const badge = this.#handBadge(hl);
      this.#box(p, badge.x, badge.y, badge.w, 36, '#000', 4, badge.color);
    }
    // 賭けた豆コインの山
    const bet = this.hands.length ? this.#committed() : this.#bet();
    const stack = Math.min(10, Math.ceil(bet / 10));
    for (let i = 0; i < stack; i++) drawCoin(p, POS.bet.x, POS.bet.y + 40 - i * 7, 14);
    // 結果の帯
    if (this.phase === 'result') {
      const color = this.delta > 0 ? c.win : this.delta < 0 ? c.lose : c.push;
      this.#box(p, 380, POS.banner - 22, 440, 44, '#000', 5, color);
    }
    for (const btn of this.#buttons()) {
      p.fillStyle = '#000';
      p.fillRect(btn.x + 6, btn.y + 6, btn.w, btn.h);
      this.#box(p, btn.x, btn.y, btn.w, btn.h, btn.enabled ? c.button : c.buttonOff, 5, (btn.primary || btn.selected) && btn.enabled ? c.accent : c.line);
    }
  }

  #dealerBadge() {
    const cards = this.#dealerCards();
    const right = cards.length ? cards[cards.length - 1].x + CARD.w : POS.dealer.x;
    return { x: right + 20, y: POS.dealerRow - 18, w: 130, text: this.holeOpen ? `合計 ${handTotal(this.dealer).total}` : `${handTotal([this.dealer[0]]).total} ＋ ？` };
  }

  #handBadge(hl) {
    const c = cfg().colors;
    const r = hl.result;
    const total = handTotal(hl.hand.cards).total;
    const text = r ? `${cfg().texts.results[r.result]}${r.delta ? `  ${r.delta > 0 ? '+' : ''}${r.delta}` : ''}` : `合計 ${total}${hl.hand.doubled ? '（倍賭け）' : ''}`;
    const color = !r ? c.accent : r.delta > 0 ? c.win : r.delta < 0 ? c.lose : c.push;
    const w = 220;
    return { x: hl.cx - w / 2, y: POS.playerRow + CARD.h / 2 + 8, w, text, color };
  }

  #cardBack(p, x, y) {
    const c = cfg().colors;
    this.#box(p, x, y, CARD.w, CARD.h, c.cardBack, 6, c.cardBackInk);
    p.fillStyle = c.cardBackInk;
    for (let yy = y + 18; yy < y + CARD.h - 8; yy += 26) {
      for (let xx = x + 18 + ((yy - y) / 26 % 2) * 13; xx < x + CARD.w - 8; xx += 26) {
        p.beginPath();
        p.ellipse(xx, yy, 6, 8, 0.5, 0, Math.PI * 2);
        p.fill();
      }
    }
  }

  #cardFace(p, card, x, y) {
    const c = cfg().colors;
    p.fillStyle = 'rgba(0, 0, 0, 0.45)';
    p.fillRect(x + 6, y + 6, CARD.w, CARD.h);
    this.#box(p, x, y, CARD.w, CARD.h, c.card, 6);
    const face = isFace(card.rank);
    p.fillStyle = face ? c.enemyPanel : c.beanPanel;
    p.fillRect(x + 14, y + 40, CARD.w - 28, CARD.h - 80);
    const cx = x + CARD.w / 2;
    const cy = y + CARD.h / 2 + 6;
    if (face) {
      const type = cfg().faceEnemies[card.rank];
      this.enemyArt[type] ??= new Enemy(type, 0, 0);
      p.save();
      p.translate(cx, cy);
      p.scale(1.6, 1.6);
      this.enemyArt[type].draw(p);
      p.restore();
    } else {
      const index = cfg().rankCharacters[Number(card.rank) - 1] % CHARS.length;
      p.save();
      p.translate(cx, cy);
      drawCharacter(p, CHARS[index], 22);
      p.restore();
    }
  }

  #drawTexts(ctx) {
    const s = cfg();
    const c = s.colors;
    const t = s.texts;
    ctx.textBaseline = 'middle';
    // 左上：題名と勝負の数。右上：豆コインと賭け
    ctx.fillStyle = c.text;
    ctx.textAlign = 'left';
    ctx.font = font(18, true);
    ctx.fillText(s.title, 50, 56);
    ctx.font = font(15);
    ctx.fillText(fill(t.round, { n: Math.min(this.round + (this.phase === 'result' || this.phase === 'summary' ? 0 : 1), s.rounds), total: s.rounds }), 50, 84);
    ctx.textAlign = 'right';
    ctx.font = font(18, true);
    ctx.fillText(`${CONFIG.coins.name} ${coinText(coins())}`, BOX.w - 50, 56);
    ctx.font = font(15);
    if (this.phase !== 'summary') ctx.fillText(fill(t.bet, { bet: this.hands.length ? this.#committed() : this.#bet() }), BOX.w - 50, 84);
    // ふきだし
    const b = this.#bubbleRect(ctx);
    ctx.textAlign = 'left';
    ctx.fillStyle = c.name;
    ctx.fillText(`親：${s.dealer.name}`, b.x + 16, b.y + 20);
    ctx.fillStyle = c.ink;
    ctx.fillText(s.dealer.lines[this.line], b.x + 16, b.y + 44);
    ctx.textAlign = 'center';
    if (this.phase === 'summary') {
      this.#drawSummaryTexts(ctx);
      return;
    }
    // カードのすみの数字
    ctx.font = font(30, true);
    const corner = (card, x, y) => {
      ctx.fillStyle = isFace(card.rank) ? c.enemyInk : c.ink;
      ctx.textAlign = 'left';
      ctx.fillText(card.rank, x + 12, y + 24);
      ctx.textAlign = 'right';
      ctx.fillText(card.rank, x + CARD.w - 12, y + CARD.h - 22);
    };
    for (const d of this.#dealerCards()) if (!d.back) corner(d.card, d.x, d.y);
    const hls = this.#handLayouts();
    for (const hl of hls) for (const d of hl.cards) corner(d.card, d.x, d.y);
    // 合計の札
    ctx.font = font(18, true);
    ctx.textAlign = 'center';
    if (this.dealer.length) {
      const db = this.#dealerBadge();
      ctx.fillStyle = c.accent;
      ctx.fillText(db.text, db.x + db.w / 2, db.y + 19);
    }
    for (const hl of hls) {
      const badge = this.#handBadge(hl);
      ctx.fillStyle = badge.color;
      ctx.fillText(badge.text, badge.x + badge.w / 2, badge.y + 19);
    }
    // 賭けた豆コイン
    ctx.fillStyle = c.text;
    ctx.font = font(15, true);
    ctx.fillText(fill(t.bet, { bet: this.hands.length ? this.#committed() : this.#bet() }), POS.bet.x, POS.bet.y - 24);
    // 真ん中の文：賭ける前は決まり、結果のときは増えた（減った）豆コイン
    if (this.phase === 'bet') {
      ctx.fillStyle = c.sub;
      ctx.font = font(15, true);
      ctx.fillText(t.rules, BOX.w / 2, POS.banner);
    } else if (this.phase === 'result') {
      const head = this.delta > 0 ? (this.line === 'natural' ? t.results.natural : t.results.win) : this.delta < 0 ? t.results.lose : t.results.push;
      ctx.fillStyle = this.delta > 0 ? c.win : this.delta < 0 ? c.lose : c.push;
      ctx.font = font(22, true);
      const sign = this.delta > 0 ? '+' : '';
      ctx.fillText(`${head}　${CONFIG.coins.name} ${sign}${this.delta} 枚`, BOX.w / 2, POS.banner + 1);
    }
    // ボタン
    for (const btn of this.#buttons()) {
      ctx.fillStyle = btn.enabled ? c.ink : 'rgba(150, 140, 130, 0.9)';
      ctx.font = font(19, true);
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 - (btn.sub ? 8 : 0));
      if (btn.sub) {
        ctx.font = font(12);
        ctx.fillText(btn.sub, btn.x + btn.w / 2, btn.y + btn.h / 2 + 14);
      }
    }
    ctx.fillStyle = c.sub;
    ctx.font = font(13);
    ctx.fillText(this.phase === 'bet' ? t.betPick : t.help, BOX.w / 2, 684);
  }

  #drawSummaryTexts(ctx) {
    const s = cfg();
    const c = s.colors;
    const t = s.texts.summary;
    ctx.fillStyle = c.ink;
    ctx.font = font(26, true);
    ctx.fillText(t.title, BOX.w / 2, 280);
    ctx.font = font(20, true);
    const rows = [[t.win, `${this.stats.win} 回`], [t.lose, `${this.stats.lose} 回`], [t.push, `${this.stats.push} 回`]];
    rows.forEach(([k, v], i) => {
      ctx.textAlign = 'left';
      ctx.fillText(k, 430, 338 + i * 38);
      ctx.textAlign = 'right';
      ctx.fillText(v, 770, 338 + i * 38);
    });
    const net = this.stats.net;
    ctx.textAlign = 'left';
    ctx.fillText(t.net, 430, 468);
    ctx.textAlign = 'right';
    ctx.fillStyle = net > 0 ? '#2f8a3a' : net < 0 ? '#b0402a' : c.ink;
    ctx.fillText(`${net > 0 ? '+' : ''}${net} 枚`, 770, 468);
    ctx.textAlign = 'center';
    ctx.fillStyle = c.ink;
    ctx.font = font(14);
    ctx.fillText(s.texts.back, BOX.w / 2, 528);
  }
}
