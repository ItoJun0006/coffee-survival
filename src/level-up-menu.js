import { CONFIG } from './config.js';
import { drawItemIcon } from './item-icons.js';
import { drawWeaponIcon } from './weapon-icons.js';
import { drawCoin } from './coin-ui.js';
import { font } from './font.js';
import { stage } from './stage.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const CARD_W = 220;
const CARD_H = 240;
const GAP = 24;
const ELEMENT_LABEL = { none: '', hot: '熱い', ice: '冷たい' };

const KIND_LABEL = { weapon: '攻撃', item: '強化アイテム', bonus: 'ボーナス', rare: 'レア強化', carry: '持っていく攻撃', coins: '豆コイン' };

// 攻撃とアイテムの Lv の表示。今のステージの最大 Lv は「MAX」と出す
export const levelLabel = (level) => (level >= stage.maxLevel ? 'Lv MAX' : `Lv ${level}`);

// レベルアップで出る候補を選ぶ画面。choices は { kind, name, desc, element, level, isNew } の配列
export class LevelUpMenu {
  // heading を渡すと、見出し（title）と説明（lead）をレベルアップ以外のものにする
  open(choices, level, heading = null) {
    // エナジードリンク（仕様 021・033）は、いちばん左に置く
    this.choices = [...choices.filter((c) => c.kind === 'drink'), ...choices.filter((c) => c.kind !== 'drink')];
    this.level = level;
    this.heading = heading;
    this.index = 0;
    this.openedAt = performance.now();
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
    const t = (performance.now() - (this.openedAt ?? 0)) / 1000;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);

    const cards = this.#cards(viewW, viewH);
    const headY = cards[0].y - 64;
    this.#drawHeadingSteam(ctx, viewW / 2, headY, t);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.xpBar;
    ctx.font = font(28, true);
    ctx.fillText(this.heading?.title ?? `レベル ${this.level}！`, viewW / 2, headY);
    ctx.fillStyle = c.text;
    ctx.font = font(15);
    const hasRare = this.choices.some((ch) => ch.kind === 'rare');
    const lead = this.choices[0].kind === 'bonus' ? 'すべて最大まで強化した！ ボーナスを 1 つ選ぶ' : '攻撃かアイテムを 1 つ選ぶ';
    ctx.fillText(this.heading?.lead ?? (hasRare ? `${lead}（レア強化が出た！）` : lead), viewW / 2, cards[0].y - 32);

    // 選んでいるカードを最後に描き、ほかのカードより手前に出す
    const order = [...cards].sort((a, b) => (a.index === this.index) - (b.index === this.index));
    for (const card of order) this.#drawCardAnimated(ctx, card, card.index === this.index, t);

    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`←→ で選ぶ　Space / Enter / 1〜${this.choices.length} キー / クリックで決定`, viewW / 2, cards[0].y + CARD_H + 32);
  }

  // 見出しの上に、ゆらゆら立ちのぼる湯気
  #drawHeadingSteam(ctx, x, y, t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 248, 238, 0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sx = x + i * 26;
      const sway = Math.sin(t * 2.2 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(sx, y - 22);
      ctx.bezierCurveTo(sx - 8 + sway, y - 34, sx + 8 + sway, y - 46, sx + sway, y - 58);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 画面が開いてからの時間 t で、カードを 1 枚ずつめくって表に返す。選んでいるカードは少し大きくする
  #drawCardAnimated(ctx, card, selected, t) {
    const s = CONFIG.levelUpScreen;
    const p = Math.max(0, Math.min(1, (t - card.index * s.staggerSec) / s.appearSec));
    if (p <= 0) return;
    const ease = 1 - (1 - p) ** 3;
    const cx = card.x + card.w / 2;
    const cy = card.y + card.h / 2;
    const k = selected ? 1.05 : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.02, Math.cos((1 - ease) * Math.PI / 2)) * k, k);
    ctx.translate(-cx, -cy);
    if (card.choice.kind === 'drink') drawEnergyDrink(ctx, card, selected, t);
    else if (card.choice.kind === 'extra') drawExtraPickCard(ctx, card, selected, t);
    else this.#drawCard(ctx, card, selected);
    ctx.restore();
  }

  #drawCard(ctx, card, selected) {
    const s = CONFIG.levelUpScreen;
    const theme = s.card;
    const { kind, iconId, weaponId, name, desc, element, level, isNew } = card.choice;
    const cx = card.x + card.w / 2;
    const { camellia } = card.choice;
    const overCap = level >= CONFIG.weaponLevels.max;
    const toMax = (kind === 'weapon' || kind === 'item') && !isNew && level + 1 === stage.maxLevel;
    const accent = kind === 'rare' ? CONFIG.camellia.kinds[camellia].color : s.kindColors[kind] ?? s.kindColors.weapon;

    // 地と枠。選んでいるカードは種類の色で光らせる
    ctx.save();
    if (selected) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 18;
    }
    this.#drawCardBase(ctx, card, theme);
    ctx.restore();
    if (kind === 'rare') drawRareCardBack(ctx, card, camellia, selected);
    // 種類の帯
    ctx.fillStyle = accent;
    ctx.fillRect(card.x + 10, card.y + 8, card.w - 20, 18);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(12, true);
    ctx.fillStyle = '#2a1a10';
    ctx.fillText(KIND_LABEL[kind], cx, card.y + 17);
    ctx.textAlign = 'left';
    ctx.fillText(String(card.index + 1), card.x + 16, card.y + 17);
    ctx.textAlign = 'center';
    // 次で MAX になるカードは金の二重の縁
    if (toMax) {
      ctx.strokeStyle = s.maxEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x + 3, card.y + 3, card.w - 6, card.h - 6);
      ctx.lineWidth = 1;
      ctx.strokeRect(card.x + 8, card.y + 30, card.w - 16, card.h - 38);
    }
    if (selected) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
    }

    // NEW か、強化の段階。レア強化は「レア」
    ctx.font = font(14, true);
    if (kind === 'rare') {
      ctx.fillStyle = accent;
      ctx.fillText('★ レア ★', cx, card.y + 42);
    } else if (kind === 'carry') {
      ctx.fillStyle = theme.text;
      ctx.fillText(`Lv ${level}`, cx, card.y + 42);
    } else if (kind !== 'bonus' && kind !== 'coins') {
      // Lv 8 から先は限界突破（エクストラステージ）
      const next = level + 1 >= stage.maxLevel ? 'MAX' : level + 1;
      ctx.fillStyle = isNew ? s.elementColors.hot : toMax || overCap ? s.maxEdge : theme.text;
      ctx.fillText(isNew ? 'NEW' : `${overCap ? '限界突破 ' : ''}Lv ${level} → ${next}`, cx, card.y + 42);
    }

    // アイコンがあるカードは、アイコンの下に名前と説明を置く
    const hasIcon = Boolean(iconId || weaponId || kind === 'coins');
    const elementLabel = ELEMENT_LABEL[element];
    const nameY = card.y + (hasIcon ? 128 : 70);
    const descY = card.y + (hasIcon ? (elementLabel ? 168 : 154) : 122);
    if (kind === 'coins') drawCoin(ctx, cx, card.y + 84, 24);
    else if (iconId) drawItemIcon(ctx, iconId, cx, card.y + 84, 56);
    else if (weaponId) drawWeaponIcon(ctx, weaponId, cx, card.y + 84, 56);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.text;
    ctx.font = font(17, true);
    ctx.fillText(name, cx, nameY);
    if (elementLabel) {
      ctx.font = font(12, true);
      ctx.fillStyle = s.elementColors[element];
      ctx.fillText(`● ${elementLabel}`, cx, nameY + 22);
    }

    ctx.fillStyle = theme.sub;
    ctx.font = font(12);
    this.#wrap(ctx, desc, card.w - 28).forEach((line, i) => ctx.fillText(line, cx, descY + i * 17));
    if (kind === 'bonus' || kind === 'rare' || kind === 'coins') return;

    // 強化の段階を ● で見せる。限界突破は Lv 9〜16 を金色の ● で見せる
    const max = CONFIG.weaponLevels.max;
    const next = kind === 'carry' ? level : level + 1;
    const filled = overCap && kind !== 'carry' ? next - max : next;
    const dotColor = overCap && kind !== 'carry' ? s.maxEdge : accent;
    ctx.font = font(14);
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < filled ? dotColor : theme.muted;
      ctx.fillText('●', cx + (i - (max - 1) / 2) * 18, card.y + card.h - 22);
    }
  }

  // カードの地と枠：木の枠の黒板と、チョークでこすったような薄い跡
  #drawCardBase(ctx, card, theme) {
    const { x, y, w, h } = card;
    ctx.fillStyle = theme.edge;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(x + theme.edgeWidth, y + theme.edgeWidth, w - theme.edgeWidth * 2, h - theme.edgeWidth * 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 6;
    for (const [sx, sy] of [[0.2, 0.55], [0.6, 0.75]]) {
      ctx.beginPath();
      ctx.moveTo(x + w * sx, y + h * sy);
      ctx.lineTo(x + w * (sx + 0.25), y + h * (sy - 0.05));
      ctx.stroke();
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

// 椿の花のカードの下地。種類ごとに描き分ける
function drawRareCardBack(ctx, card, kind, selected) {
  const t = performance.now() / 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(card.x, card.y, card.w, card.h);
  ctx.clip();
  if (kind === 'yabu') {
    // 藪椿：椿の赤で下地を染め、上と下に帯を入れる
    ctx.fillStyle = selected ? 'rgba(224, 86, 106, 0.32)' : 'rgba(224, 86, 106, 0.18)';
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.fillStyle = 'rgba(224, 86, 106, 0.55)';
    ctx.fillRect(card.x, card.y, card.w, 6);
    ctx.fillRect(card.x, card.y + card.h - 6, card.w, 6);
  } else if (kind === 'coffee') {
    // 珈琲椿：金色の枠が、ゆっくり脈打つように光る
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(240, 213, 138, 0.9)';
    ctx.shadowBlur = 14 + Math.sin(t * 3) * 8;
    ctx.strokeStyle = 'rgba(240, 213, 138, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(card.x, card.y, card.w, card.h);
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
    g.addColorStop(0, 'rgba(240, 213, 138, 0.04)');
    g.addColorStop(0.5, 'rgba(240, 213, 138, 0.16)');
    g.addColorStop(1, 'rgba(240, 213, 138, 0.04)');
    ctx.fillStyle = g;
    ctx.fillRect(card.x, card.y, card.w, card.h);
  } else {
    // 落ち椿：淡い桃色の下地に、花びらがひらひら落ちる
    ctx.fillStyle = 'rgba(242, 167, 184, 0.12)';
    ctx.fillRect(card.x, card.y, card.w, card.h);
    for (let i = 0; i < 7; i++) {
      const fall = (t * 22 + i * 47) % (card.h + 20);
      const px = card.x + ((i * 61) % card.w) + Math.sin(t * 1.5 + i) * 10;
      const py = card.y - 10 + fall;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t + i);
      ctx.fillStyle = 'rgba(242, 167, 184, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

// エナジードリンク（仕様 033）：カードの代わりに、カードの 7 割ほどの大きさの緑の缶を描き、下に文を出す。
// 缶は水に浮かんだように上下にぷかぷか揺れ、開いた口から炭酸の泡が立ちのぼる。選んでいるときは缶のまわりを光らせる
function drawEnergyDrink(ctx, card, selected, t) {
  const d = CONFIG.levelUpScreen.drink;
  const h = CARD_H * d.sizeRate;
  const w = h * d.widthRate;
  const cx = card.x + card.w / 2;
  const bottom = card.y + h + 6;
  ctx.save();
  // 番号
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font(13, true);
  ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
  ctx.fillText(String(card.index + 1), card.x + 16, card.y + 14);

  ctx.translate(cx, bottom);
  ctx.translate(0, Math.sin(t * d.bobSpeed) * d.bobPx);
  ctx.rotate(Math.sin(t * d.bobSpeed / 2) * d.tiltRad);
  const c = d.colors;
  const x = -w / 2;
  const y = -h;
  const rim = 8;
  if (selected) {
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 22;
  }
  // 胴
  ctx.fillStyle = c.body;
  ctx.fillRect(x, y + rim, w, h - rim * 2);
  ctx.shadowBlur = 0;
  // 上と下のふち（銀）
  ctx.fillStyle = c.rim;
  ctx.fillRect(x + 4, y, w - 8, rim);
  ctx.fillRect(x + 4, y + h - rim, w - 8, rim);
  ctx.fillStyle = c.rimDark;
  ctx.fillRect(x + 4, y + rim - 2, w - 8, 2);
  ctx.fillRect(x + 4, y + h - rim, w - 8, 2);
  // 光の筋
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(x + w * 0.16, y + rim + 4, w * 0.1, h - rim * 2 - 8);
  // 稲妻
  ctx.fillStyle = c.bolt;
  const bx = 0;
  const by = y + h * 0.5;
  const s = h * 0.18;
  ctx.beginPath();
  ctx.moveTo(bx + s * 0.25, by - s * 1.2);
  ctx.lineTo(bx - s * 0.55, by + s * 0.1);
  ctx.lineTo(bx - s * 0.02, by + s * 0.1);
  ctx.lineTo(bx - s * 0.3, by + s * 1.2);
  ctx.lineTo(bx + s * 0.55, by - s * 0.15);
  ctx.lineTo(bx + s * 0.02, by - s * 0.15);
  ctx.closePath();
  ctx.fill();
  // 炭酸の泡：開いた口から立ちのぼり、上るほど薄くなる
  ctx.fillStyle = c.tab;
  ctx.fillRect(-w * 0.12, y - 3, w * 0.24, 4);
  for (let i = 0; i < d.bubbles; i++) {
    const p = (t * 0.8 + i / d.bubbles) % 1;
    const r = 3 + (i % 3) * 1.5;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = c.bubble;
    ctx.beginPath();
    ctx.arc(Math.sin(t * 3 + i * 2) * 10 + (i - (d.bubbles - 1) / 2) * 4, y - 8 - p * 40, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 文
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(17, true);
  ctx.fillStyle = selected ? d.colors.glow : d.colors.title;
  ctx.fillText(d.title, cx, bottom + 26);
  ctx.font = font(14, true);
  ctx.fillStyle = CONFIG.colors.text;
  ctx.fillText(d.text, cx, bottom + 50);
  ctx.restore();
}

// ドラゴン豆の「もう 1 つ選ぶ」（仕様 038）：4 枚目の「竜の宝」のカード。深い緑のうろこ模様と金の枠に、揺れる豆コインの山。
// choice.info は { price, left, enough, ok }。買えないとき（豆コインが足りない・回数を使い切った）は暗くして理由を出す
function drawExtraPickCard(ctx, card, selected, t) {
  const d = CONFIG.levelUpScreen.extraPick;
  const { price, left, ok, enough } = card.choice.info;
  const { x, y, w, h } = card;
  const cx = x + w / 2;
  const c = d.colors;
  ctx.save();
  if (selected) {
    ctx.shadowColor = c.gold;
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = c.gold;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = c.scaleBg;
  ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
  // うろこ：半円を互い違いに並べる
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 6, y + 6, w - 12, h - 12);
  ctx.clip();
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 2;
  for (let row = 0; row < Math.ceil(h / 18) + 1; row++) {
    for (let col = 0; col < Math.ceil(w / 22) + 1; col++) {
      ctx.beginPath();
      ctx.arc(x + col * 22 + (row % 2) * 11, y + row * 18, 11, 0, Math.PI);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = c.gold;
  ctx.font = font(12, true);
  ctx.textAlign = 'left';
  ctx.fillText(String(card.index + 1), x + 16, y + 20);
  ctx.textAlign = 'center';
  ctx.font = font(18, true);
  ctx.fillText(d.title, cx, y + 26);
  // 豆コインの山：下に 3 枚、その上に 2 枚、てっぺんに 1 枚
  const pile = [[-30, 0], [0, 0], [30, 0], [-15, -16], [15, -16], [0, -32]];
  for (const [dx, dy] of pile) drawCoin(ctx, cx + dx, y + 104 + dy + Math.sin(t * 3 + dx) * 1.5, 14);
  ctx.fillStyle = c.text;
  ctx.font = font(17, true);
  ctx.fillText(d.name, cx, y + 148);
  ctx.font = font(13);
  ctx.fillText(`豆コイン ${price} 枚`, cx, y + 174);
  ctx.fillStyle = c.gold;
  ctx.font = font(12);
  ctx.fillText(`このプレイで あと ${left} 回`, cx, y + h - 22);
  if (!ok) dimCard(ctx, card, enough ? d.usedUp : d.notEnough);
  ctx.restore();
}

function dimCard(ctx, card, reason) {
  const { x, y, w, h } = card;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x, y, w, h);
  // 理由は、下の文字と重ならないよう帯の上に出す
  ctx.fillStyle = 'rgba(20, 14, 10, 0.92)';
  ctx.fillRect(x, y + h / 2 - 18, w, 36);
  ctx.fillStyle = '#f3e6d8';
  ctx.font = font(14, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(reason, x + w / 2, y + h / 2);
}
