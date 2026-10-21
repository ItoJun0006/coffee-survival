import { CONFIG } from './config.js';
import { CHARACTERS, canBuy, canWearSkin, describeStats, groupMembers, isAvailable, statBars, toggleSkin, wearsSkin } from './characters.js';
import { buyVariety, coins } from './progress.js';
import { MENU_SIZE, coinText, drawCoin, drawMenuPopup } from './coin-ui.js';
import { drawCharacter } from './entities/player.js';
import { font } from './font.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// 66 体を 11 段 × 6 列で、スクロールせずに全部出す。マスは画面の高さに合わせて縮める
const COLS = 6;
const ROWS = 11;
const PANEL_W = 300;
const PANEL_H = 440;
const PANEL_GAP = 30;
const TOP = 96;
// 見た目の候補ごとのマスの大きさ（縮める前）。groupGap は 3 列目と 4 列目の間（品種の区切り）に足す間
const LOOKS = {
  A: { w: 88, h: 100, gap: 10, groupGap: 0 },
  B: { w: 64, h: 64, gap: 8, groupGap: 0 },
  C: { w: 64, h: 70, gap: 6, groupGap: 18 },
};

// キャラ選択画面。左に全キャラのマス（11 段 × 6 列）、右に選んでいるキャラの詳しい性能を出す。
// まだ解放していないキャラは影と鍵で出し、決定しようとすると、品種のキャラなら買うメニュー（仕様 016）、
// 条件で解放するキャラなら解放条件のポップアップを開く。onToast は、品種を買ったときの知らせを出す関数
export class CharacterSelect {
  constructor(onToast = () => {}) {
    this.index = 0;
    this.popup = null;
    this.onToast = onToast;
    // 買うメニューで選んでいるボタンと、押せるボタンの場所（描いたときに決まる）
    this.menuChoice = 0;
    this.menuButtons = [];
  }

  // 鍵のキャラを決定しようとしたとき
  #openPopup(character) {
    this.popup = character;
    this.menuChoice = 0;
    this.menuButtons = [];
  }

  // 買うメニュー：←→ で選び、Space / Enter かクリックで決める。注文したら、品種ならその中煎りを選ぶ
  #updateMenu(input, clicked) {
    const { unlock } = this.popup;
    const count = canBuy(this.popup) && coins() >= unlock.price ? 2 : 1;
    if (input.wasPressed('Escape')) {
      this.popup = null;
      return;
    }
    if (input.wasPressed('ArrowLeft', 'KeyA')) this.menuChoice = Math.max(0, this.menuChoice - 1);
    if (input.wasPressed('ArrowRight', 'KeyD')) this.menuChoice = Math.min(count - 1, this.menuChoice + 1);
    if (!clicked) return;
    let action = this.menuButtons[this.menuChoice]?.action;
    if (input.clickPos) {
      const b = this.menuButtons.find((b) => inRect(input.clickPos, b));
      if (!b) return;
      action = b.action;
    }
    if (action === 'order' && canBuy(this.popup)) {
      const members = groupMembers(this.popup);
      if (buyVariety(members.map((c) => c.id), unlock.price)) {
        const t = CONFIG.coins.texts;
        this.onToast((members.length > 1 ? t.unlocked : t.unlockedOne).replace('{name}', unlock.name));
        this.index = CHARACTERS.indexOf(members[1] ?? members[0]);
      }
    }
    this.popup = null;
  }

  open(current) {
    this.index = Math.max(0, CHARACTERS.indexOf(current));
    this.popup = null;
  }

  get selected() {
    return CHARACTERS[this.index];
  }

  // 決めたらそのキャラ、Esc なら 'back'、どちらでもなければ null を返す
  update(input, viewW, viewH) {
    const clicked = input.consumeClick();
    if (this.popup?.unlock?.price) {
      this.#updateMenu(input, clicked);
      return null;
    }
    if (this.popup) {
      if (clicked || input.wasPressed('Escape')) this.popup = null;
      return null;
    }
    if (input.wasPressed('Escape')) return 'back';

    const last = CHARACTERS.length - 1;
    const moveTo = (i) => {
      this.index = Math.min(last, Math.max(0, i));
    };
    if (input.wasPressed('ArrowLeft', 'KeyA')) moveTo(this.index - 1);
    if (input.wasPressed('ArrowRight', 'KeyD')) moveTo(this.index + 1);
    if (input.wasPressed('ArrowUp', 'KeyW')) moveTo(this.index - COLS);
    if (input.wasPressed('ArrowDown', 'KeyS')) moveTo(this.index + COLS);
    if (input.wasPressed('KeyQ') && canWearSkin(this.selected)) toggleSkin();

    // 全部見えているのでスクロールしない。たまったホイールの量は捨てる
    input.consumeWheel();

    if (!clicked) return null;
    // クリックは「選ぶ」。選んでいるキャラをもう一度クリックすると決定する
    if (input.clickPos) {
      const card = this.#cards(viewW, viewH).find((c) => inRect(input.clickPos, c));
      if (!card) return null;
      if (card.index !== this.index) {
        this.index = card.index;
        if (!isAvailable(card.character)) this.#openPopup(card.character);
        return null;
      }
    }
    if (isAvailable(this.selected)) return this.selected;
    this.#openPopup(this.selected);
    return null;
  }

  // ---- 並べ方 ----

  #layout(viewW, viewH) {
    const base = LOOKS[CONFIG.characters.selectLook];
    const avail = viewH - TOP - 64;
    const k = Math.min(1, avail / (ROWS * base.h + (ROWS - 1) * base.gap));
    const w = base.w * k;
    const h = base.h * k;
    const gap = base.gap * k;
    const groupGap = base.groupGap * k;
    const gridW = COLS * w + (COLS - 1) * gap + groupGap;
    const gridH = ROWS * h + (ROWS - 1) * gap;
    const left = (viewW - (gridW + PANEL_GAP + PANEL_W)) / 2;
    return { left, gridW, gridH, k, w, h, gap, groupGap, panelX: left + gridW + PANEL_GAP };
  }

  #cards(viewW, viewH) {
    const { left, w, h, gap, groupGap, k } = this.#layout(viewW, viewH);
    return CHARACTERS.map((character, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      return { character, index, x: left + col * (w + gap) + (col >= 3 ? groupGap : 0), y: TOP + row * (h + gap), w, h, k };
    });
  }

  // ---- 描画 ----

  draw(ctx, viewW, viewH) {
    const c = CONFIG.colors;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, viewW, viewH);

    const L = this.#layout(viewW, viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = font(28, true);
    ctx.fillText('キャラクターを選ぶ', viewW / 2, TOP - 62);
    const unlocked = CHARACTERS.filter(isAvailable).length;
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText(`解放したキャラ ${unlocked} / ${CHARACTERS.length}`, viewW / 2, TOP - 30);

    const cards = this.#cards(viewW, viewH);
    if (CONFIG.characters.selectLook === 'C') this.#drawGroups(ctx, cards);
    for (const card of cards) this.#drawCard(ctx, card, card.index === this.index);
    this.#drawPanel(ctx, L);

    ctx.textAlign = 'center';
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    const bottom = TOP + Math.max(L.gridH, PANEL_H);
    ctx.fillText('←→↑↓ で選ぶ　Space / Enter で決定　Esc でタイトルへ', viewW / 2, bottom + 22);
    ctx.fillText('クリックで選び、もう一度クリックで決定', viewW / 2, bottom + 42);

    if (this.popup) this.#drawPopup(ctx, viewW, viewH);
  }

  // マスは縮める前の大きさで描き、k 倍に縮める
  #drawCard(ctx, screenCard, selected) {
    const c = CONFIG.colors;
    const look = CONFIG.characters.selectLook;
    const base = LOOKS[look];
    ctx.save();
    ctx.translate(screenCard.x, screenCard.y);
    ctx.scale(screenCard.k, screenCard.k);
    const card = { x: 0, y: 0, w: base.w, h: base.h };
    const { character } = screenCard;
    const open = isAvailable(character);
    ctx.fillStyle = selected ? 'rgba(217, 160, 102, 0.25)' : c.hudBg;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (selected) {
      ctx.strokeStyle = c.hudBar;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
    }

    const cx = card.x + card.w / 2;
    // A は名前を下に出すので上寄せ、B・C は名前を出さないので真ん中
    const cy = card.y + (look === 'A' ? 40 : look === 'B' ? card.h / 2 - 4 : card.h / 2 + 4);
    if (open) {
      ctx.save();
      ctx.translate(cx, cy);
      const scale = character.growth ? character.growth.scaleFrom : (character.drawScale ?? 1);
      drawCharacter(ctx, character, 22 * scale, { bob: selected ? Math.abs(Math.sin(performance.now() / 160)) : 0, skin: wearsSkin(character) });
      ctx.restore();
    } else {
      this.#drawSilhouette(ctx, cx, cy, 22, character.placeholder ? 0.07 : 0.14);
      const price = character.unlock?.price;
      drawLock(ctx, cx, cy + 4, 10, price && canBuy(character) && coins() >= price ? CONFIG.coins.affordableLock : undefined);
    }

    if (look !== 'A') {
      // B は鍵のマスの下に値段だけを小さく出す。C は値段を品種の枠の見出しに出す
      if (look === 'B' && !open && character.unlock?.price) this.#drawPrice(ctx, character, cx, card.h - 8);
      ctx.restore();
      return;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(11, true);
    ctx.fillStyle = open ? c.text : 'rgba(243, 230, 216, 0.4)';
    const name = open ? character.name : '？？？';
    if (ctx.measureText(name).width > card.w - 6 && name.includes(' ')) {
      // マスに入りきらない名前（「ブルーマウンテン 浅煎り」など）は、品種名と焙煎度の 2 行にする
      const [first, second] = [name.slice(0, name.lastIndexOf(' ')), name.slice(name.lastIndexOf(' ') + 1)];
      if (ctx.measureText(first).width > card.w - 4) ctx.font = font(10, true);
      ctx.fillText(first, cx, card.y + 76);
      ctx.font = font(10);
      ctx.fillText(second, cx, card.y + 90);
    } else {
      ctx.fillText(name, cx, card.y + 80);
    }
    // 買って解放する品種は、名前の下に値段を出す
    if (!open && character.unlock?.price) this.#drawPrice(ctx, character, cx, card.y + 93);
    ctx.restore();
  }

  #drawPrice(ctx, character, cx, y) {
    drawCoin(ctx, cx - 22, y, 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(10);
    ctx.fillStyle = canBuy(character) && coins() >= character.unlock.price ? CONFIG.coins.affordableLock : 'rgba(243, 230, 216, 0.55)';
    ctx.fillText(coinText(character.unlock.price), cx + 4, y);
  }

  // C：3 マスずつ（品種ごと）を枠で囲み、枠の上に品種の名前と値段を出す
  #drawGroups(ctx, cards) {
    for (let i = 0; i < cards.length; i += 3) {
      const group = cards.slice(i, i + 3);
      const first = group[0];
      const last = group[group.length - 1];
      const k = first.k;
      const x = first.x - 3 * k;
      const y = first.y - 3 * k;
      const w = last.x + last.w - first.x + 6 * k;
      const h = first.h + 6 * k;
      ctx.strokeStyle = 'rgba(217, 160, 102, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      const ch = first.character;
      const open = group.some((g) => isAvailable(g.character));
      const label = ch.variety ? (open ? ch.variety.name : '？？？') : '特別な豆';
      ctx.save();
      ctx.translate(x + 4 * k, y + 9 * k);
      ctx.scale(k, k);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = font(10, true);
      ctx.fillStyle = open ? CONFIG.colors.text : 'rgba(243, 230, 216, 0.5)';
      ctx.fillText(label, 0, 0);
      if (ch.variety && !open && ch.unlock?.price) {
        const tw = ctx.measureText(label).width;
        ctx.translate(tw + 30, 0);
        this.#drawPrice(ctx, ch, 0, 0);
      }
      ctx.restore();
    }
  }

  // まだ解放していないキャラの、うっすら見える影
  #drawSilhouette(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f3e6d8';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 右側の詳しい性能。まだ解放していないときは、影と解放条件を出す
  #drawPanel(ctx, L) {
    const c = CONFIG.colors;
    const sel = this.selected;
    const open = isAvailable(sel);
    const x = L.panelX;
    const cx = x + PANEL_W / 2;
    ctx.fillStyle = c.hudBg;
    ctx.fillRect(x, TOP, PANEL_W, Math.max(L.gridH, PANEL_H));

    const cy = TOP + 70;
    if (open) {
      ctx.save();
      ctx.translate(cx, cy);
      const scale = sel.growth ? sel.growth.scaleFrom : (sel.drawScale ?? 1);
      drawCharacter(ctx, sel, 42 * scale, { bob: Math.abs(Math.sin(performance.now() / 160)), skin: wearsSkin(sel) });
      ctx.restore();
    } else {
      this.#drawSilhouette(ctx, cx, cy, 42, sel.placeholder ? 0.07 : 0.14);
      drawLock(ctx, cx, cy + 6, 18);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = font(20, true);
    ctx.fillText(open ? sel.name : '？？？', cx, TOP + 140);
    if (!open) {
      ctx.font = font(13);
      ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
      ctx.fillText('まだ解放されていない', cx, TOP + 170);
      ctx.fillText(sel.unlock?.price ? `Space / Enter でメニューを見る（${coinText(sel.unlock.price)}）` : 'Space / Enter で解放条件を見る', cx, TOP + 194);
      return;
    }
    ctx.font = font(13);
    ctx.fillStyle = c.hudBar;
    ctx.fillText(sel.variety ? `${sel.variety.trait}・${sel.roast.trait}` : sel.roast.trait, cx, TOP + 166);

    // 性能のバー。成長するキャラは、育ちきった長さを薄く重ねる
    const barX = x + 80;
    const barW = PANEL_W - 104;
    statBars(sel).forEach((bar, i) => {
      const y = TOP + 196 + i * 22;
      ctx.textAlign = 'left';
      ctx.font = font(12);
      ctx.fillStyle = 'rgba(243, 230, 216, 0.75)';
      ctx.fillText(bar.label, x + 22, y);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(barX, y - 5, barW, 10);
      if (bar.grownValue !== null) {
        ctx.fillStyle = 'rgba(217, 160, 102, 0.3)';
        ctx.fillRect(barX, y - 5, barW * bar.grownValue, 10);
      }
      ctx.fillStyle = c.hudBar;
      ctx.fillRect(barX, y - 5, barW * bar.value, 10);
    });

    ctx.textAlign = 'center';
    ctx.font = font(12);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.8)';
    const lines = describeStats(sel);
    // 品種の特別な力（仕様 016）
    if (sel.power) lines.push(`特別な力「${sel.power.name}」`, sel.power.desc);
    lines.forEach((line, i) => ctx.fillText(line, cx, TOP + 300 + i * 18));
    // スキンを付けられるキャラは、付け外しの案内を出す
    if (canWearSkin(sel)) {
      ctx.fillStyle = CONFIG.camellia.kinds.yabu.color;
      ctx.fillText(`Q：スキン「${CONFIG.camellia.skin.name}」を${wearsSkin(sel) ? 'はずす' : 'つける'}`, cx, TOP + 312 + lines.length * 18);
    }
  }

  #drawPopup(ctx, viewW, viewH) {
    const c = CONFIG.colors;
    if (this.popup.unlock?.price) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, viewW, viewH);
      const cy = Math.max(MENU_SIZE.h / 2 + 10, viewH / 2);
      this.menuButtons = drawMenuPopup(ctx, viewW / 2, cy, menuOffer(this.popup), coins(), this.menuChoice);
      ctx.textAlign = 'center';
      ctx.font = font(12);
      ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
      ctx.fillText('←→ で選ぶ　Space / Enter かクリックで決定　Esc でとじる', viewW / 2, cy + MENU_SIZE.h / 2 + 20);
      return;
    }
    const w = 380;
    const h = 200;
    const x = (viewW - w) / 2;
    const y = (viewH - h) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#20140d';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.hudBar;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    drawLock(ctx, viewW / 2, y + 42, 16);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = font(15, true);
    ctx.fillText('解放条件', viewW / 2, y + 82);
    ctx.font = font(17, true);
    ctx.fillStyle = c.xpBar;
    this.popup.unlock.text.split('\n').forEach((line, i) => ctx.fillText(line, viewW / 2, y + 114 + i * 24));
    ctx.font = font(12);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.6)';
    ctx.fillText('Esc / Space / Enter / クリックで閉じる', viewW / 2, y + h - 22);
  }
}

// 買うメニューに出す中身。品種は 3 体と特別な力、特別なキャラは 1 体と特徴
function menuOffer(c) {
  const { unlock } = c;
  const members = groupMembers(c);
  const v = c.variety;
  const power = v ? CONFIG.characters.powers[v.power] : null;
  return {
    name: unlock.name,
    origin: v ? v.origin : c.origin,
    members,
    labels: members.map((m) => (v ? m.roast.name : '')),
    trait: v ? `${v.trait}　特別な力「${power.name}」` : c.roast.trait,
    desc: v ? power.desc : c.desc,
    price: unlock.price,
    requireText: canBuy(c) ? null : unlock.require.text,
  };
}

// 鍵マーク。(x, y) は鍵の本体の中心、s は大きさ、color は色（買える品種は金色）
function drawLock(ctx, x, y, s, color = 'rgba(243, 230, 216, 0.75)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.22);
  ctx.beginPath();
  ctx.arc(x, y - s * 0.35, s * 0.45, Math.PI, 0);
  ctx.lineTo(x + s * 0.45, y);
  ctx.moveTo(x - s * 0.45, y - s * 0.35);
  ctx.lineTo(x - s * 0.45, y);
  ctx.stroke();
  ctx.fillRect(x - s * 0.7, y - s * 0.1, s * 1.4, s * 1.05);
  ctx.fillStyle = '#20140d';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.35, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
