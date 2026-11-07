import { CONFIG } from './config.js';
import { drawSheepDealer } from './entities/sheep-dealer.js';
import { coins, addCoins, spendCoins } from './progress.js';
import { font } from './font.js';
import { sound } from './sound.js';
import { makeShoe, handTotal, isBust, isNatural, dealerShouldHit, canSplitCards, settle } from './blackjack.js';
import { CardTable, BOX, CARD, fill, inRect } from './card-table.js';

// カードゲーム「珈琲ブラックジャック」（仕様 043）の画面。
// 賭ける → 配る → 自分の番（もう 1 枚・これで勝負・倍賭け・分ける）→ 親の番 → 結果、を rounds 回くり返してまとめを出す。
// 豆コインは勝負が決まったときだけ動かす（途中でやめたら、その勝負は無かったことになる）
const cfg = () => CONFIG.cardGame;

export const minBet = () => Math.min(...cfg().bets);
export const canEnterCardGame = () => coins() >= minBet();
export const notEnoughText = () => fill(cfg().texts.notEnough, { min: minBet() });

const POS = { dealer: { x: 600, y: 114, scale: 0.85 }, bubble: { x: 720, y: 90 }, dealerRow: 290, playerRow: 484, banner: 388, buttonsY: 608, bet: { x: 200, y: 484 } };

export class CardGame extends CardTable {
  constructor() {
    super(cfg, 'coffee-survival.cardGameHowto');
    this.shoe = [];
  }

  open() {
    this.round = 0;
    this.stats = { win: 0, lose: 0, push: 0, net: 0 };
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

  #toBet() {
    this.phase = 'bet';
    this.hands = [];
    this.dealer = [];
    this.holeOpen = false;
    this.results = null;
    this.line = 'bet';
    this.clampBet();
  }

  #draw() {
    return this.shoe.pop();
  }

  #deal() {
    if (this.shoe.length < cfg().reshuffleBelow) this.shoe = makeShoe();
    const bet = this.bet();
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
    this.natural = natural;
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

  #dealerCards() {
    const xs = this.row(this.dealer.length, POS.dealer.x, 640);
    return this.dealer.map((card, i) => ({ card, x: xs[i], y: POS.dealerRow - CARD.h / 2, back: i === 1 && !this.holeOpen }));
  }

  #handLayouts() {
    const split = this.hands.length > 1;
    return this.hands.map((h, i) => {
      const cx = split ? (i === 0 ? 390 : 810) : POS.dealer.x;
      const xs = this.row(h.cards.length, cx, split ? 380 : 640);
      const cards = h.cards.map((card, j) => ({ card, x: xs[j], y: POS.playerRow - CARD.h / 2 }));
      return { hand: h, cards, cx, active: split && i === this.active, result: this.results?.[i] };
    });
  }

  #buttons() {
    const t = cfg().texts;
    if (this.phase === 'bet') return this.betButtons(POS.buttonsY);
    if (this.phase === 'play') {
      const h = this.hands[this.active];
      const a = t.actions;
      // 選べないときは、札の形が合わないのか、豆コインが足りないのかを出す
      const sub = (id, shapeOk, can) => (can ? `［${a[id].key}］${cfg().help.actions[id]}` : shapeOk ? a.noCoins : a[id].off);
      const doubleShape = !!h && h.cards.length === 2 && !h.doubled;
      const splitShape = !!h && this.hands.length === 1 && canSplitCards(h.cards);
      const canDouble = this.#canDouble(h);
      const canSplit = this.#canSplit(h);
      return this.buttonRow([
        { id: 'hit', label: a.hit.label, sub: sub('hit', true, true), enabled: true, primary: true },
        { id: 'stand', label: a.stand.label, sub: sub('stand', true, true), enabled: true },
        { id: 'double', label: a.double.label, sub: sub('double', doubleShape, canDouble), enabled: canDouble },
        { id: 'split', label: a.split.label, sub: sub('split', splitShape, canSplit), enabled: canSplit },
      ], POS.buttonsY);
    }
    if (this.phase === 'result') {
      return this.buttonRow([{ id: 'next', label: this.#isLastRound() ? 'まとめへ' : '次の勝負へ', sub: '［Enter］', enabled: true, primary: true }], POS.buttonsY);
    }
    return [];
  }

  // ---- 描き方 ----

  draw(ctx, viewW, viewH) {
    this.render(ctx, viewW, viewH);
  }

  drawShapes(p, t) {
    const c = this.colors();
    this.drawFloor(p);
    this.drawDealerShapes(p, t, drawSheepDealer, POS.dealer, POS.bubble, this.#bubbleLine());
    if (this.phase === 'summary') {
      this.drawSummaryShapes(p);
      return;
    }
    // カード
    for (const d of this.#dealerCards()) (d.back ? this.cardBack(p, d.x, d.y) : this.cardFace(p, d.card, d.x, d.y));
    if (this.dealer.length) {
      const db = this.#dealerBadge();
      this.box(p, db.x, db.y, db.w, 36, '#000', 4, c.accent);
    }
    for (const hl of this.#handLayouts()) {
      if (hl.active) {
        const l = hl.cards[0].x - 10;
        const r = hl.cards[hl.cards.length - 1].x + CARD.w + 10;
        p.strokeStyle = c.accent;
        p.lineWidth = 6;
        p.strokeRect(l, POS.playerRow - CARD.h / 2 - 10, r - l, CARD.h + 20);
      }
      for (const d of hl.cards) this.cardFace(p, d.card, d.x, d.y);
      const badge = this.#handBadge(hl);
      this.box(p, badge.x, badge.y, badge.w, 36, '#000', 4, badge.color);
    }
    this.drawBetStack(p, POS.bet.x, POS.bet.y, this.hands.length ? this.#committed() : this.bet());
    // 結果の帯
    if (this.phase === 'result') {
      const color = this.delta > 0 ? c.win : this.delta < 0 ? c.lose : c.push;
      this.box(p, 380, POS.banner - 22, 440, 44, '#000', 5, color);
    }
    if (this.howto !== null) this.drawHowtoShapes(p);
    else this.drawButtonShapes(p, this.#buttons());
  }

  #dealerBadge() {
    const cards = this.#dealerCards();
    const right = cards.length ? cards[cards.length - 1].x + CARD.w : POS.dealer.x;
    return { x: right + 20, y: POS.dealerRow - 18, w: 130, text: this.holeOpen ? `合計 ${handTotal(this.dealer).total}` : `${handTotal([this.dealer[0]]).total} ＋ ？` };
  }

  #handBadge(hl) {
    const c = this.colors();
    const r = hl.result;
    const total = handTotal(hl.hand.cards).total;
    const text = r ? `${cfg().texts.results[r.result]}${r.delta ? `  ${r.delta > 0 ? '+' : ''}${r.delta}` : ''}` : `合計 ${total}${hl.hand.doubled ? '（倍賭け）' : ''}`;
    const color = !r ? c.accent : r.delta > 0 ? c.win : r.delta < 0 ? c.lose : c.push;
    const w = 220;
    return { x: hl.cx - w / 2, y: POS.playerRow + CARD.h / 2 + 8, w, text, color };
  }

  drawTexts(ctx) {
    const s = cfg();
    const c = this.colors();
    const t = s.texts;
    const round = fill(t.round, { n: Math.min(this.round + (this.phase === 'result' || this.phase === 'summary' ? 0 : 1), s.rounds), total: s.rounds });
    this.drawHudTexts(ctx, round, this.phase === 'summary' ? '' : fill(t.bet, { bet: this.hands.length ? this.#committed() : this.bet() }));
    this.drawBubbleTexts(ctx, POS.bubble, this.#bubbleLine());
    if (this.howto !== null) {
      this.drawHowtoTexts(ctx);
      return;
    }
    if (this.phase === 'summary') {
      const sum = t.summary;
      const rows = [[sum.win, `${this.stats.win} 回`], [sum.lose, `${this.stats.lose} 回`], [sum.push, `${this.stats.push} 回`]];
      this.drawSummaryTexts(ctx, sum.title, rows, sum.net, this.stats.net, t.back);
      return;
    }
    // カードのすみの数字
    for (const d of this.#dealerCards()) if (!d.back) this.cardCorners(ctx, d.card, d.x, d.y);
    const hls = this.#handLayouts();
    for (const hl of hls) for (const d of hl.cards) this.cardCorners(ctx, d.card, d.x, d.y);
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
    ctx.fillText(fill(t.bet, { bet: this.hands.length ? this.#committed() : this.bet() }), POS.bet.x, POS.bet.y - 24);
    // 真ん中の文：賭ける前はヒント、自分の番は見込み、結果は増えた（減った）豆コイン
    if (this.phase === 'bet') {
      ctx.fillStyle = c.sub;
      ctx.font = font(15, true);
      ctx.fillText(s.help.betTip, BOX.w / 2, POS.banner);
    } else if (this.phase === 'play') {
      ctx.fillStyle = c.accent;
      ctx.font = font(14, true);
      ctx.fillText(this.#playTip(), BOX.w / 2, POS.banner);
    } else if (this.phase === 'result') {
      const head = this.delta > 0 ? (this.natural ? t.results.natural : t.results.win) : this.delta < 0 ? t.results.lose : t.results.push;
      ctx.fillStyle = this.delta > 0 ? c.win : this.delta < 0 ? c.lose : c.push;
      ctx.font = font(22, true);
      const sign = this.delta > 0 ? '+' : '';
      ctx.fillText(`${head}　${CONFIG.coins.name} ${sign}${this.delta} 枚`, BOX.w / 2, POS.banner + 1);
    }
    this.drawButtonTexts(ctx, this.#buttons());
    ctx.fillStyle = c.sub;
    ctx.font = font(13);
    ctx.fillText(this.phase === 'bet' ? t.betPick : t.help, BOX.w / 2, 684);
  }

  // ふきだしのせりふ。自分の番ではおすすめを、結果では勝ち負けの理由を話す
  #bubbleLine() {
    if (this.phase === 'result') return this.#reason();
    if (this.phase === 'play') return this.#advice();
    return cfg().dealer.lines[this.line];
  }

  #upCard() {
    return handTotal([this.dealer[0]]).total;
  }

  // 次の 1 枚で 21 をこえる見込み（%）。1 を 11 と数えている手は、1 枚ではこえない
  #bustChance(cards) {
    const { total, soft } = handTotal(cards);
    if (soft) return 0;
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
    return Math.round((values.filter((v) => total + v > 21).length / values.length) * 100);
  }

  #playTip() {
    const h = cfg().help;
    const hand = this.hands[this.active];
    if (!hand) return '';
    const up = this.#upCard();
    return fill(h.playTip, { me: handTotal(hand.cards).total, bust: this.#bustChance(hand.cards), up, upKind: up <= 6 ? h.upKinds.weak : h.upKinds.strong });
  }

  #advice() {
    const a = cfg().help.advice;
    const hand = this.hands[this.active];
    if (!hand) return '';
    const me = handTotal(hand.cards).total;
    if (me <= 11) return a.safe;
    if (me >= 17) return a.stop;
    return this.#upCard() <= 6 ? a.weakUp : a.strongUp;
  }

  #reason() {
    const h = cfg().help;
    const r = this.results?.[0];
    if (!r) return '';
    const dealer = handTotal(this.dealer).total;
    const dealerText = dealer > 21 ? fill(h.dealerBust, { n: dealer }) : String(dealer);
    const me = this.hands.map((hand) => handTotal(hand.cards).total).join(' と ');
    return fill(h.reason, { me, dealer: dealerText, result: cfg().texts.results[r.result] });
  }
}
