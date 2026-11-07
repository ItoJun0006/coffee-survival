import { CONFIG } from './config.js';
import { drawOwlDealer } from './entities/owl-dealer.js';
import { coins, addCoins, spendCoins } from './progress.js';
import { font } from './font.js';
import { sound } from './sound.js';
import { makeDeck, evaluate, payout, suggestHold } from './poker.js';
import { CardTable, CARD, fill, inRect } from './card-table.js';

// ビデオポーカー「珈琲ポーカー」（仕様 044）の画面。
// 賭ける → 5 枚配る → 残す札を選ぶ → 交換して役が決まる、を rounds 回くり返してまとめを出す。
// 豆コインは役が決まったときだけ動かす（交換の前にやめたら、その勝負は無かったことになる）
const cfg = () => CONFIG.poker;

export const minPokerBet = () => Math.min(...cfg().bets);
export const canEnterPoker = () => coins() >= minPokerBet();
export const pokerNotEnoughText = () => fill(cfg().texts.notEnough, { min: minPokerBet() });

const POS = { dealer: { x: 640, y: 118, scale: 0.85 }, bubble: { x: 760, y: 92 }, pay: { x: 40, y: 110, w: 300, h: 340 }, cards: { cx: 720, y: 420 }, tip: 340, buttonsY: 600, bet: { x: 420, y: 290 } };
const RAISE = 20;
const HAND_ORDER = ['royal', 'straightFlush', 'four', 'fullHouse', 'flush', 'straight', 'three', 'twoPair', 'jacks'];

export class VideoPoker extends CardTable {
  constructor() {
    super(cfg, 'coffee-survival.pokerHowto');
  }

  open() {
    this.round = 0;
    this.stats = { made: 0, none: 0, net: 0, best: null };
    this.betIndex = 0;
    this.#toBet();
    this.openTable();
  }

  // 戻るときは 'back' を返す
  update(input, viewW, viewH) {
    const view = this.view(viewW, viewH);
    const clicked = input.consumeClick();
    const pos = this.toBox(view, input, clicked);
    if (this.handleHowto(input, clicked)) return null;
    if (input.wasPressed('Escape')) return 'back';
    const button = pos ? this.#buttons().find((b) => inRect(pos, b)) : null;
    if (this.phase === 'bet') {
      if (input.wasPressed('ArrowLeft')) this.stepBet(-1);
      if (input.wasPressed('ArrowRight')) this.stepBet(1);
      if (button?.bet !== undefined && button.enabled) this.betIndex = button.bet;
      else if ((clicked && !pos) || button?.id === 'deal') this.#deal();
    } else if (this.phase === 'hold') {
      const key = [1, 2, 3, 4, 5].findIndex((n) => input.wasPressed(`Digit${n}`, `Numpad${n}`));
      const card = pos ? this.#cardLayouts().findIndex((d) => inRect(pos, d)) : -1;
      if (key >= 0) this.#toggle(key);
      else if (card >= 0) this.#toggle(card);
      else if ((clicked && !pos) || button?.id === 'draw') this.#drawCards();
    } else if (this.phase === 'result') {
      if (clicked) this.#afterResult();
    } else if (this.phase === 'summary') {
      if (clicked) return 'back';
    }
    return null;
  }

  // ---- 流れ ----

  #toBet() {
    this.phase = 'bet';
    this.hand = [];
    this.held = [];
    this.result = null;
    this.clampBet();
  }

  #deal() {
    this.deck = makeDeck();
    this.hand = this.deck.splice(0, 5);
    this.held = [false, false, false, false, false];
    this.betNow = this.bet();
    this.phase = 'hold';
    sound.play('bean');
  }

  #toggle(i) {
    this.held[i] = !this.held[i];
    sound.play('hit');
  }

  // 残さなかった札を引き直して役を決め、豆コインを動かして保存する
  #drawCards() {
    this.hand = this.hand.map((c, i) => (this.held[i] ? c : this.deck.shift()));
    const made = evaluate(this.hand);
    const delta = payout(made.id, this.betNow);
    if (delta > 0) addCoins(delta);
    else if (delta < 0) spendCoins(-delta);
    if (made.id === 'none') this.stats.none++;
    else this.stats.made++;
    const rank = (id) => HAND_ORDER.indexOf(id);
    if (made.id !== 'none' && (this.stats.best === null || rank(made.id) < rank(this.stats.best))) this.stats.best = made.id;
    this.stats.net += delta;
    this.result = { ...made, delta };
    this.round++;
    sound.play(rank(made.id) >= 0 && rank(made.id) <= 5 ? 'levelUp' : delta > 0 ? 'bean' : delta < 0 ? 'fakeBean' : 'hit');
    this.phase = 'result';
  }

  #isLastRound() {
    return this.round >= cfg().rounds || coins() < minPokerBet();
  }

  #afterResult() {
    if (this.#isLastRound()) {
      this.phase = 'summary';
      return;
    }
    this.#toBet();
  }

  // ---- 並べ方 ----

  #cardLayouts() {
    const xs = this.row(this.hand.length, POS.cards.cx, 640);
    return this.hand.map((card, i) => {
      const up = this.phase === 'hold' && this.held[i];
      return { card, x: xs[i], y: POS.cards.y - (up ? RAISE : 0), w: CARD.w, h: CARD.h, held: up, made: this.phase === 'result' && this.result.idx.includes(i) };
    });
  }

  #buttons() {
    const t = cfg().texts;
    if (this.phase === 'bet') return this.betButtons(POS.buttonsY, POS.cards.cx);
    if (this.phase === 'hold') return this.buttonRow([{ id: 'draw', label: t.draw.label, sub: t.draw.sub, enabled: true, primary: true }], POS.buttonsY, POS.cards.cx);
    if (this.phase === 'result') return this.buttonRow([{ id: 'next', label: this.#isLastRound() ? 'まとめへ' : '次の勝負へ', sub: '［Enter］', enabled: true, primary: true }], POS.buttonsY, POS.cards.cx);
    return [];
  }

  // 役の表で光らせる役：交換の前は今の役、結果では決まった役
  #currentHand() {
    if (this.phase === 'hold') return evaluate(this.hand).id;
    if (this.phase === 'result') return this.result.id;
    return null;
  }

  // ---- 描き方 ----

  draw(ctx, viewW, viewH) {
    this.render(ctx, viewW, viewH);
  }

  drawShapes(p, t) {
    const c = this.colors();
    this.drawFloor(p);
    this.drawDealerShapes(p, t, drawOwlDealer, POS.dealer, POS.bubble, this.#bubbleLine());
    if (this.phase === 'summary') {
      this.drawSummaryShapes(p);
      return;
    }
    // 役の表
    const pay = POS.pay;
    this.box(p, pay.x, pay.y, pay.w, pay.h, c.card);
    const lit = HAND_ORDER.indexOf(this.#currentHand());
    if (lit >= 0) {
      p.fillStyle = c.highlight;
      p.fillRect(pay.x + 8, pay.y + 40 + lit * 32, pay.w - 16, 28);
    }
    this.drawBetStack(p, POS.bet.x, POS.bet.y, this.hand.length ? this.betNow : this.bet());
    // 手札と「残す」の札。結果では、役を作った札をふちで光らせる
    for (const d of this.#cardLayouts()) {
      this.cardFace(p, d.card, d.x, d.y);
      if (d.held) this.box(p, d.x, d.y - 34, CARD.w, 26, c.accent);
      if (d.made) {
        p.strokeStyle = c.accent;
        p.lineWidth = 6;
        p.strokeRect(d.x - 8, d.y - 8, CARD.w + 16, CARD.h + 16);
      }
    }
    if (this.phase === 'result') {
      const color = this.result.delta > 0 ? c.win : this.result.delta < 0 ? c.lose : c.push;
      this.box(p, POS.cards.cx - 260, POS.tip - 22, 520, 44, '#000', 5, color);
    }
    if (this.howto !== null) this.drawHowtoShapes(p);
    else this.drawButtonShapes(p, this.#buttons());
  }

  drawTexts(ctx) {
    const s = cfg();
    const c = this.colors();
    const t = s.texts;
    const round = fill(t.round, { n: Math.min(this.round + (this.phase === 'result' || this.phase === 'summary' ? 0 : 1), s.rounds), total: s.rounds });
    this.drawHudTexts(ctx, round, this.phase === 'summary' ? '' : fill(t.bet, { bet: this.hand.length ? this.betNow : this.bet() }));
    this.drawBubbleTexts(ctx, POS.bubble, this.#bubbleLine());
    if (this.howto !== null) {
      this.drawHowtoTexts(ctx);
      return;
    }
    if (this.phase === 'summary') {
      const sum = t.summary;
      const best = this.stats.best ? s.hands[this.stats.best].name : s.hands.none.name;
      const rows = [[sum.made, `${this.stats.made} 回`], [sum.none, `${this.stats.none} 回`], [sum.best, best]];
      this.drawSummaryTexts(ctx, sum.title, rows, sum.net, this.stats.net, t.back);
      return;
    }
    // 役の表
    const pay = POS.pay;
    ctx.textAlign = 'left';
    ctx.fillStyle = c.name;
    ctx.font = font(15, true);
    ctx.fillText(t.payTitle, pay.x + 12, pay.y + 20);
    ctx.font = font(14, true);
    HAND_ORDER.forEach((id, i) => {
      const y = pay.y + 54 + i * 32;
      ctx.fillStyle = c.ink;
      ctx.textAlign = 'left';
      ctx.fillText(s.hands[id].name, pay.x + 16, y);
      ctx.textAlign = 'right';
      ctx.fillText(`× ${s.hands[id].rate}`, pay.x + pay.w - 16, y);
    });
    // 賭けた豆コイン
    ctx.textAlign = 'center';
    ctx.fillStyle = c.text;
    ctx.font = font(15, true);
    ctx.fillText(fill(t.bet, { bet: this.hand.length ? this.betNow : this.bet() }), POS.bet.x, POS.bet.y - 24);
    // 手札：すみの数字、「残す」、キーの番号
    for (const [i, d] of this.#cardLayouts().entries()) {
      this.cardCorners(ctx, d.card, d.x, d.y);
      ctx.textAlign = 'center';
      if (d.held) {
        ctx.fillStyle = c.ink;
        ctx.font = font(15, true);
        ctx.fillText(t.held, d.x + CARD.w / 2, d.y - 21);
      }
      if (this.phase === 'hold') {
        ctx.fillStyle = c.sub;
        ctx.font = font(13, true);
        ctx.fillText(`［${i + 1}］`, d.x + CARD.w / 2, POS.cards.y + CARD.h + 14);
      }
    }
    // 真ん中の文：賭ける前はヒント、交換の前は今の役、結果は増えた（減った）豆コイン
    ctx.textAlign = 'center';
    if (this.phase === 'bet') {
      ctx.fillStyle = c.sub;
      ctx.font = font(15, true);
      ctx.fillText(s.help.betTip, POS.cards.cx, POS.tip);
    } else if (this.phase === 'hold') {
      ctx.fillStyle = c.accent;
      ctx.font = font(17, true);
      const id = this.#currentHand();
      ctx.fillText(fill(t.current, { hand: id === 'none' ? s.hands.none.name : `${s.hands[id].name} × ${s.hands[id].rate}` }), POS.cards.cx, POS.tip);
    } else if (this.phase === 'result') {
      const r = this.result;
      ctx.fillStyle = r.delta > 0 ? c.win : r.delta < 0 ? c.lose : c.push;
      ctx.font = font(22, true);
      ctx.fillText(`${s.hands[r.id].name}　${CONFIG.coins.name} ${r.delta > 0 ? '+' : ''}${r.delta} 枚`, POS.cards.cx, POS.tip + 1);
    }
    this.drawButtonTexts(ctx, this.#buttons());
    ctx.fillStyle = c.sub;
    ctx.font = font(13);
    ctx.fillText(this.phase === 'bet' ? t.betPick : t.help, 600, 684);
  }

  // ふきだしのせりふ。交換の前は残す札のおすすめを、結果ではどの札で何の役ができたかを話す
  #bubbleLine() {
    const s = cfg();
    if (this.phase === 'hold') {
      const { reason } = suggestHold(this.hand);
      const id = evaluate(this.hand).id;
      return fill(s.help.advice[reason], { hand: s.hands[id].name });
    }
    if (this.phase === 'result') {
      const r = this.result;
      const delta = `${r.delta > 0 ? '+' : ''}${r.delta}`;
      if (r.id === 'none') return fill(s.help.reasonNone, { delta });
      const cards = r.idx.map((i) => this.hand[i].rank).join('・');
      return fill(s.help.reasonMade, { cards, hand: s.hands[r.id].name, delta });
    }
    return s.dealer.lines[this.phase === 'summary' ? 'summary' : 'bet'];
  }
}
