import { CONFIG } from './config.js';

// カードゲーム（仕様 043）の決まり。山札・手札の合計・親の引き方・勝ち負けと豆コインの増え方を決める（画面とは分ける）
const cfg = () => CONFIG.cardGame;

export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const isFace = (rank) => rank === 'J' || rank === 'Q' || rank === 'K';
const rankValue = (rank) => (isFace(rank) ? 10 : Number(rank));

// 1 組は 13 種類 × 4 枚。decks 組をまとめて混ぜる
export function makeShoe() {
  const cards = [];
  for (let d = 0; d < cfg().decks * 4; d++) for (const rank of RANKS) cards.push({ rank });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// 手札の合計。1 は 11 として数えても 21 を超えないときだけ 11 にする
export function handTotal(cards) {
  let total = 0;
  let ones = 0;
  for (const c of cards) {
    total += rankValue(c.rank);
    if (c.rank === '1') ones++;
  }
  const soft = ones > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

export const isBust = (cards) => handTotal(cards).total > 21;

// 最初の 2 枚で 21（ちょうどいい一杯）。分けた手札ではそうならない
export const isNatural = (cards, fromSplit = false) => !fromSplit && cards.length === 2 && handTotal(cards).total === 21;

// 親は合計が dealerStand 以上になるまで引く
export const dealerShouldHit = (cards) => handTotal(cards).total < cfg().dealerStand;

// 分けられるのは、同じ札の 2 枚だけ
export const canSplitCards = (cards) => cards.length === 2 && cards[0].rank === cards[1].rank;

// 1 つの手札の勝ち負けと、豆コインの増減。hand は { cards, bet, fromSplit }
export function settle(hand, dealerCards) {
  const { bet } = hand;
  const me = handTotal(hand.cards).total;
  const dealer = handTotal(dealerCards).total;
  const myNatural = isNatural(hand.cards, hand.fromSplit);
  const dealerNatural = isNatural(dealerCards);
  if (me > 21) return { result: 'bust', delta: -bet };
  if (dealerNatural) return myNatural ? { result: 'push', delta: 0 } : { result: 'lose', delta: -bet };
  if (myNatural) return { result: 'natural', delta: Math.floor(bet * cfg().naturalRate) };
  if (dealer > 21 || me > dealer) return { result: 'win', delta: bet };
  if (me < dealer) return { result: 'lose', delta: -bet };
  return { result: 'push', delta: 0 };
}
