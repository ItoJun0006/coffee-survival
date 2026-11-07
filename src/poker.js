import { CONFIG } from './config.js';

// ビデオポーカー（仕様 044）の決まり。山札・役の判定・豆コインの増え方・残す札のおすすめを決める（画面とは分ける）
const cfg = () => CONFIG.poker;

const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// 強さ。1 はいちばん強い（14）。1・2・3・4・5 のストレートでは 1 として数える
const VALUE = { 1: 14, J: 11, Q: 12, K: 13 };
const value = (rank) => VALUE[rank] ?? Number(rank);

// 1 組 52 枚（マーク 0〜3 × 13 種類）を混ぜる
export function makeDeck() {
  const cards = [];
  for (let suit = 0; suit < 4; suit++) for (const rank of RANKS) cards.push({ rank, suit });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// 同じ数字の札をまとめる：[{ rank, idx: [手札の何枚目か…] }]（枚数の多い順、同じなら強い順）
function groups(cards) {
  const map = new Map();
  cards.forEach((c, i) => map.set(c.rank, [...(map.get(c.rank) ?? []), i]));
  return [...map.entries()].map(([rank, idx]) => ({ rank, idx })).sort((a, b) => b.idx.length - a.idx.length || value(b.rank) - value(a.rank));
}

function isStraight(cards) {
  const vs = [...new Set(cards.map((c) => value(c.rank)))].sort((a, b) => a - b);
  if (vs.length !== 5) return false;
  if (vs[4] - vs[0] === 4) return true;
  // 1・2・3・4・5
  return vs.join(',') === '2,3,4,5,14';
}

// 役：{ id, idx（役を作っている札が何枚目か） }。id は CONFIG.poker.hands のキー。役がなければ id は 'none'
export function evaluate(cards) {
  const all = [0, 1, 2, 3, 4];
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const straight = isStraight(cards);
  const g = groups(cards);
  if (straight && flush) {
    const royal = cards.every((c) => value(c.rank) >= 10);
    return { id: royal ? 'royal' : 'straightFlush', idx: all };
  }
  if (g[0].idx.length === 4) return { id: 'four', idx: g[0].idx };
  if (g[0].idx.length === 3 && g[1].idx.length === 2) return { id: 'fullHouse', idx: all };
  if (flush) return { id: 'flush', idx: all };
  if (straight) return { id: 'straight', idx: all };
  if (g[0].idx.length === 3) return { id: 'three', idx: g[0].idx };
  if (g[0].idx.length === 2 && g[1].idx.length === 2) return { id: 'twoPair', idx: [...g[0].idx, ...g[1].idx] };
  if (g[0].idx.length === 2) return { id: 'pair', idx: g[0].idx };
  return { id: 'none', idx: [] };
}

// 豆コインの増減：役の倍率 × 賭けた分 − 賭けた分（役がなければ、賭けた分が減る）
export function payout(id, bet) {
  const rate = cfg().hands[id]?.rate ?? 0;
  return bet * rate - bet;
}

// 交換する札のおすすめ：{ idx（交換するとよい札が何枚目か）, reason }。reason は CONFIG.poker.help.advice のキー
export function suggestExchange(cards) {
  const others = (keep) => [0, 1, 2, 3, 4].filter((i) => !keep.includes(i));
  const made = evaluate(cards);
  // 5 枚で作る役（ストレート以上・フルハウス）は、交換しない
  if (made.idx.length === 5) return { idx: [], reason: 'keepAll' };
  if (made.id !== 'none') return { idx: others(made.idx), reason: 'keepMade' };
  // 同じマークが 4 枚なら、ちがうマークの 1 枚を交換してフラッシュをねらう
  for (let suit = 0; suit < 4; suit++) {
    const keep = cards.map((c, i) => (c.suit === suit ? i : -1)).filter((i) => i >= 0);
    if (keep.length === 4) return { idx: others(keep), reason: 'flushDraw' };
  }
  return { idx: [0, 1, 2, 3, 4], reason: 'redraw' };
}
