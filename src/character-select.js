import { CONFIG } from './config.js';
import { CHARACTERS, canWearSkin, describeStats, isAvailable, statBars, toggleSkin, varietyMembers, wearsSkin } from './characters.js';
import { buyVariety, coins } from './progress.js';
import { MENU_SIZE, coinText, drawCoin, drawMenuPopup } from './coin-ui.js';
import { drawCharacter } from './entities/player.js';
import { font } from './font.js';

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const COLS = 6;
const CARD_W = 88;
const CARD_H = 100;
const GAP = 10;
const PANEL_W = 300;
const PANEL_GAP = 30;
const TOP = 110;
// ホイールをこれだけ回すと 1 段スクロールする
const WHEEL_STEP = 100;

// キャラ選択画面。左に全キャラのマス（6 列、入りきらない段はスクロール）、右に選んでいるキャラの詳しい性能を出す。
// まだ解放していないキャラは影と鍵で出し、決定しようとすると、品種のキャラなら買うメニュー（仕様 016）、
// 条件で解放するキャラなら解放条件のポップアップを開く。onToast は、品種を買ったときの知らせを出す関数
export class CharacterSelect {
  constructor(onToast = () => {}) {
    this.index = 0;
    this.scrollRow = 0;
    this.wheel = 0;
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

  // 買うメニュー：←→ で選び、Space / Enter かクリックで決める。注文したら、その品種の中煎りを選ぶ
  #updateMenu(input, clicked) {
    const variety = this.popup.variety;
    const count = coins() >= variety.price ? 2 : 1;
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
    if (action === 'order') {
      const members = varietyMembers(variety);
      if (buyVariety(members.map((c) => c.id), variety.price)) {
        this.onToast(CONFIG.coins.texts.unlocked.replace('{name}', variety.name));
        this.index = CHARACTERS.indexOf(members[1] ?? members[0]);
      }
    }
    this.popup = null;
  }

  open(current) {
    this.index = Math.max(0, CHARACTERS.indexOf(current));
    this.popup = null;
    this.wheel = 0;
  }

  get selected() {
    return CHARACTERS[this.index];
  }

  // 決めたらそのキャラ、Esc なら 'back'、どちらでもなければ null を返す
  update(input, viewW, viewH) {
    const clicked = input.consumeClick();
    if (this.popup?.variety) {
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
      this.#keepSelectedVisible(viewH);
    };
    if (input.wasPressed('ArrowLeft', 'KeyA')) moveTo(this.index - 1);
    if (input.wasPressed('ArrowRight', 'KeyD')) moveTo(this.index + 1);
    if (input.wasPressed('ArrowUp', 'KeyW')) moveTo(this.index - COLS);
    if (input.wasPressed('ArrowDown', 'KeyS')) moveTo(this.index + COLS);
    if (input.wasPressed('KeyQ') && canWearSkin(this.selected)) toggleSkin();

    // ホイールは、選んでいるキャラを変えずに表示だけを動かす
    this.wheel += input.consumeWheel();
    while (Math.abs(this.wheel) >= WHEEL_STEP) {
      const d = Math.sign(this.wheel);
      this.wheel -= d * WHEEL_STEP;
      this.scrollRow = Math.min(this.#maxScroll(viewH), Math.max(0, this.scrollRow + d));
    }

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
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const left = (viewW - (gridW + PANEL_GAP + PANEL_W)) / 2;
    const visibleRows = Math.max(1, Math.floor((viewH - TOP - 70 + GAP) / (CARD_H + GAP)));
    const gridH = visibleRows * (CARD_H + GAP) - GAP;
    return { left, gridW, gridH, visibleRows, panelX: left + gridW + PANEL_GAP };
  }

  #rows() {
    return Math.ceil(CHARACTERS.length / COLS);
  }

  #maxScroll(viewH) {
    return Math.max(0, this.#rows() - this.#layout(0, viewH).visibleRows);
  }

  #keepSelectedVisible(viewH) {
    const { visibleRows } = this.#layout(0, viewH);
    const row = Math.floor(this.index / COLS);
    if (row < this.scrollRow) this.scrollRow = row;
    if (row >= this.scrollRow + visibleRows) this.scrollRow = row - visibleRows + 1;
  }

  // 今見えている段のマスだけを返す
  #cards(viewW, viewH) {
    const { left, visibleRows } = this.#layout(viewW, viewH);
    this.scrollRow = Math.min(this.scrollRow, this.#maxScroll(viewH));
    const cards = [];
    for (let row = this.scrollRow; row < this.scrollRow + visibleRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const index = row * COLS + col;
        if (index >= CHARACTERS.length) break;
        cards.push({
          character: CHARACTERS[index],
          index,
          x: left + col * (CARD_W + GAP),
          y: TOP + (row - this.scrollRow) * (CARD_H + GAP),
          w: CARD_W,
          h: CARD_H,
        });
      }
    }
    return cards;
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

    for (const card of this.#cards(viewW, viewH)) this.#drawCard(ctx, card, card.index === this.index);
    this.#drawScrollBar(ctx, L);
    this.#drawPanel(ctx, L);

    ctx.textAlign = 'center';
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('←→↑↓ で選ぶ　Space / Enter で決定　Esc でタイトルへ', viewW / 2, TOP + L.gridH + 26);
    ctx.fillText('クリックで選び、もう一度クリックで決定　ホイールでスクロール', viewW / 2, TOP + L.gridH + 46);

    if (this.popup) this.#drawPopup(ctx, viewW, viewH);
  }

  #drawCard(ctx, card, selected) {
    const c = CONFIG.colors;
    const { character } = card;
    const open = isAvailable(character);
    ctx.fillStyle = selected ? 'rgba(217, 160, 102, 0.25)' : c.hudBg;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (selected) {
      ctx.strokeStyle = c.hudBar;
      ctx.lineWidth = 3;
      ctx.strokeRect(card.x, card.y, card.w, card.h);
    }

    const cx = card.x + card.w / 2;
    const cy = card.y + 40;
    if (open) {
      ctx.save();
      ctx.translate(cx, cy);
      const scale = character.growth ? character.growth.scaleFrom : (character.drawScale ?? 1);
      drawCharacter(ctx, character, 22 * scale, { bob: selected ? Math.abs(Math.sin(performance.now() / 160)) : 0, skin: wearsSkin(character) });
      ctx.restore();
    } else {
      this.#drawSilhouette(ctx, cx, cy, 22, character.placeholder ? 0.07 : 0.14);
      const price = character.unlock?.price;
      drawLock(ctx, cx, cy + 4, 10, price && coins() >= price ? CONFIG.coins.affordableLock : undefined);
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
    if (!open && character.unlock?.price) {
      drawCoin(ctx, cx - 22, card.y + 93, 4);
      ctx.font = font(10);
      ctx.fillStyle = coins() >= character.unlock.price ? CONFIG.coins.affordableLock : 'rgba(243, 230, 216, 0.55)';
      ctx.fillText(coinText(character.unlock.price), cx + 4, card.y + 93);
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

  #drawScrollBar(ctx, L) {
    const rows = this.#rows();
    if (rows <= L.visibleRows) return;
    const x = L.left + L.gridW + 10;
    const h = (L.gridH * L.visibleRows) / rows;
    const y = TOP + (L.gridH - h) * (this.scrollRow / (rows - L.visibleRows));
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, TOP, 4, L.gridH);
    ctx.fillStyle = CONFIG.colors.hudBar;
    ctx.fillRect(x, y, 4, h);
  }

  // 右側の詳しい性能。まだ解放していないときは、影と解放条件を出す
  #drawPanel(ctx, L) {
    const c = CONFIG.colors;
    const sel = this.selected;
    const open = isAvailable(sel);
    const x = L.panelX;
    const cx = x + PANEL_W / 2;
    ctx.fillStyle = c.hudBg;
    ctx.fillRect(x, TOP, PANEL_W, L.gridH);

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
    if (this.popup.variety) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, viewW, viewH);
      const cy = Math.max(MENU_SIZE.h / 2 + 10, viewH / 2);
      this.menuButtons = drawMenuPopup(ctx, viewW / 2, cy, this.popup.variety, varietyMembers(this.popup.variety), coins(), this.menuChoice);
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
