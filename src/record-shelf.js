import { CONFIG } from './config.js';
import { sound } from './sound.js';
import { coins, spendCoins } from './progress.js';
import { coinText, drawCoin } from './coin-ui.js';
import { font } from './font.js';

// レコード棚（仕様 039）：豆コインで BGM を買い、遊ぶ曲を選ぶ。タイトルから入り、ポーズでは買った曲だけを切り替えられる。
// 買った曲と選んだ曲は、ブラウザに保存する（曲そのものは音楽係の sound.js が鳴らす）

const KEY = 'coffee-survival.bgm';
const cfg = () => CONFIG.recordShelf;
const tracks = () => CONFIG.audio.tracks;

// 保存してある { owned: [id…], track: id }。最初の曲（tracks の先頭）は、はじめから持っている
let saved = { owned: [], track: null };
try {
  saved = { ...saved, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
} catch {
  // 読めないときは、はじめの状態から
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // 保存できなくても、このプレイの間は覚えておく
  }
}

export const ownsTrack = (id) => id === tracks()[0] || saved.owned.includes(id);
export const ownedTracks = () => tracks().filter(ownsTrack);
export const currentTrack = () => (saved.track && ownsTrack(saved.track) ? saved.track : tracks()[0]);

// 起動したときに、保存してある曲を流す曲にする
export function applySavedTrack() {
  sound.setTrack(currentTrack());
}

export function selectTrack(id) {
  if (!ownsTrack(id)) return;
  saved.track = id;
  save();
  sound.setTrack(id);
}

// 持っている曲の中で、前（-1）か次（+1）の曲にする（ポーズメニュー）
export function stepTrack(d) {
  const list = ownedTracks();
  const i = list.indexOf(currentTrack());
  selectTrack(list[(i + d + list.length) % list.length]);
}

const trackName = (id) => CONFIG.audio.music[id].name;
export const currentTrackName = () => trackName(currentTrack());

const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export class RecordShelf {
  // toast は、買えたときなどの知らせを出す関数
  constructor(toast) {
    this.toast = toast;
    this.index = 0;
  }

  open() {
    this.index = Math.max(0, tracks().indexOf(currentTrack()));
    this.message = null;
    this.openedAt = performance.now();
    sound.startMusic();
  }

  // 戻るときは 'back' を返す
  update(input, viewW, viewH) {
    const n = tracks().length;
    if (input.wasPressed('Escape', 'Backspace', 'KeyR')) return 'back';
    if (input.wasPressed('ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW')) this.index = (this.index + n - 1) % n;
    if (input.wasPressed('ArrowRight', 'KeyD', 'ArrowDown', 'KeyS')) this.index = (this.index + 1) % n;
    if (!input.consumeClick()) return null;
    if (input.clickPos) {
      const hit = this.#items(viewW, viewH).find((it) => inRect(input.clickPos, it));
      if (!hit) return null;
      this.index = hit.index;
    }
    this.#choose(tracks()[this.index]);
    return null;
  }

  // 持っていれば選ぶ。持っていなければ、豆コインが足りるときに買って選ぶ
  #choose(id) {
    if (ownsTrack(id)) {
      selectTrack(id);
      return;
    }
    const { price, texts } = cfg();
    if (!spendCoins(price)) {
      this.message = { text: texts.notEnough, at: performance.now() };
      return;
    }
    saved.owned.push(id);
    selectTrack(id);
    this.toast(texts.bought.replace('{name}', trackName(id)));
  }

  #items(viewW, viewH) {
    const s = cfg();
    const n = tracks().length;
    if (s.style === 'C') {
      const w = Math.min(520, viewW - 64);
      const h = 64;
      const top = viewH / 2 - 40;
      return tracks().map((id, index) => ({ id, index, x: (viewW - w) / 2, y: top + index * (h + 10), w, h }));
    }
    const size = s.style === 'B' ? { w: 70, h: 240 } : { w: 170, h: 170 };
    const gap = s.style === 'B' ? 14 : 28;
    const left = (viewW - (n * size.w + (n - 1) * gap)) / 2;
    const top = viewH / 2 - size.h / 2 + 30;
    return tracks().map((id, index) => ({ id, index, x: left + index * (size.w + gap), y: top, ...size }));
  }

  draw(ctx, viewW, viewH) {
    const s = cfg();
    const t = (performance.now() - (this.openedAt ?? 0)) / 1000;
    ctx.save();
    ctx.fillStyle = s.colors.bg;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.colors.title;
    ctx.font = font(30, true);
    // 上の端は知らせと音の表示が出るので、見出しは少し下げる
    ctx.fillText(s.title, viewW / 2, 116);
    // 持っている豆コイン（見出しの下）
    const have = `${CONFIG.coins.name} ${coinText(coins())}`;
    ctx.font = font(15);
    ctx.fillStyle = CONFIG.colors.text;
    ctx.fillText(have, viewW / 2 + 9, 150);
    drawCoin(ctx, viewW / 2 - ctx.measureText(have).width / 2 - 6, 150, 7);

    const items = this.#items(viewW, viewH);
    if (s.style === 'B') this.#drawShelf(ctx, items, t);
    else if (s.style === 'C') this.#drawJukebox(ctx, items, viewW, t);
    else this.#drawJackets(ctx, items, t);

    // 選んでいる曲の説明
    const id = tracks()[this.index];
    const bottom = Math.max(...items.map((it) => it.y + it.h));
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = font(18, true);
    if (s.style !== 'C') {
      ctx.fillText(trackName(id), viewW / 2, bottom + 44);
      ctx.font = font(14);
      ctx.fillStyle = s.colors.sub;
      ctx.fillText(CONFIG.audio.music[id].mood, viewW / 2, bottom + 70);
    }
    ctx.font = font(15, true);
    ctx.fillStyle = s.colors.accent;
    ctx.fillText(this.#statusText(id), viewW / 2, bottom + (s.style === 'C' ? 40 : 100));
    if (this.message && performance.now() - this.message.at < 2000) {
      ctx.fillStyle = s.colors.warn;
      ctx.fillText(this.message.text, viewW / 2, bottom + (s.style === 'C' ? 66 : 126));
    }
    ctx.font = font(13);
    ctx.fillStyle = s.colors.sub;
    ctx.fillText(s.texts.help, viewW / 2, viewH - 28);
    ctx.restore();
  }

  #statusText(id) {
    const { texts, price } = cfg();
    if (id === currentTrack()) return texts.playing;
    if (ownsTrack(id)) return texts.owned;
    return texts.buy.replace('{price}', coinText(price));
  }

  // 値段か「再生中」の小さな札
  #tag(id) {
    if (id === currentTrack()) return '♪ 再生中';
    if (ownsTrack(id)) return '持っている';
    return `${coinText(cfg().price)}`;
  }

  // 回るレコード盤
  #disc(ctx, x, y, r, label, t, spinning) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinning ? t * 3 : 0);
    ctx.fillStyle = '#141010';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let k = 0.45; k < 0.95; k += 0.12) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = label;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(r * 0.08, -r * 0.24, r * 0.06, r * 0.12);
    ctx.fillStyle = '#141010';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A：正方形のジャケットを横に並べる。選んでいるジャケットからは、レコード盤が上に出てくる
  #drawJackets(ctx, items, t) {
    const s = cfg();
    for (const it of items) {
      const sel = it.index === this.index;
      const color = s.jackets[it.id];
      if (sel) this.#disc(ctx, it.x + it.w / 2, it.y - 10, it.w * 0.42, color, t, it.id === currentTrack());
      ctx.save();
      if (sel) {
        ctx.shadowColor = s.colors.accent;
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = color;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.restore();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(it.x, it.y + it.h - 34, it.w, 34);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff8ee';
      ctx.font = font(13, true);
      ctx.fillText(this.#tag(it.id), it.x + it.w / 2, it.y + it.h - 17);
      // ジャケットの絵：曲ごとの丸い模様
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(it.x + it.w / 2, it.y + it.h * 0.42, it.w * 0.24, 0, Math.PI * 2);
      ctx.fill();
      if (!ownsTrack(it.id)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(it.x, it.y, it.w, it.h - 34);
      }
      if (sel) {
        ctx.strokeStyle = s.colors.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(it.x, it.y, it.w, it.h);
      }
    }
  }

  // B：木の棚に背表紙が並ぶ。選んでいる 1 枚は手前に少し引き出され、上でレコード盤が回る
  #drawShelf(ctx, items, t) {
    const s = cfg();
    const first = items[0];
    const last = items[items.length - 1];
    const shelfX = first.x - 30;
    const shelfW = last.x + last.w - first.x + 60;
    ctx.fillStyle = s.colors.wood;
    ctx.fillRect(shelfX, first.y + first.h, shelfW, 16);
    ctx.fillRect(shelfX, first.y - 20, 12, first.h + 36);
    ctx.fillRect(shelfX + shelfW - 12, first.y - 20, 12, first.h + 36);
    const sel = items[this.index];
    this.#disc(ctx, sel.x + sel.w / 2, sel.y - 60, 46, s.jackets[sel.id], t, sel.id === currentTrack());
    for (const it of items) {
      const on = it.index === this.index;
      const dy = on ? -18 : 0;
      ctx.save();
      if (on) {
        ctx.shadowColor = s.colors.accent;
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = s.jackets[it.id];
      ctx.fillRect(it.x, it.y + dy, it.w, it.h);
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(it.x + 6, it.y + dy, 4, it.h);
      // 背表紙の曲名（縦に 1 文字ずつ）
      ctx.fillStyle = '#fff8ee';
      ctx.font = font(13, true);
      ctx.textAlign = 'center';
      const name = trackName(it.id).replace(/[・ ]/g, '').slice(0, 10);
      [...name].forEach((ch, i) => ctx.fillText(ch, it.x + it.w / 2, it.y + dy + 18 + i * 17));
      ctx.font = font(11, true);
      ctx.fillText(this.#tag(it.id), it.x + it.w / 2, it.y + dy + it.h - 14);
      if (!ownsTrack(it.id)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(it.x, it.y + dy, it.w, it.h - 28);
      }
    }
  }

  // C：ジュークボックス：上にアーチと回る盤、下に曲名の札が縦に並ぶ
  #drawJukebox(ctx, items, viewW, t) {
    const s = cfg();
    const first = items[0];
    const boxX = first.x - 24;
    const boxW = first.w + 48;
    const top = first.y - 150;
    ctx.fillStyle = s.colors.wood;
    ctx.beginPath();
    ctx.moveTo(boxX, first.y + items.length * (first.h + 10) + 10);
    ctx.lineTo(boxX, top + boxW / 2);
    ctx.arc(boxX + boxW / 2, top + boxW / 2, boxW / 2, Math.PI, 0);
    ctx.lineTo(boxX + boxW, first.y + items.length * (first.h + 10) + 10);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
    ctx.strokeStyle = s.colors.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    const id = tracks()[this.index];
    this.#disc(ctx, viewW / 2, top + 110, 54, s.jackets[id], t, id === currentTrack());
    for (const it of items) {
      const on = it.index === this.index;
      ctx.fillStyle = on ? s.jackets[it.id] : 'rgba(255, 248, 238, 0.08)';
      ctx.fillRect(it.x, it.y, it.w, it.h);
      if (on) {
        ctx.strokeStyle = s.colors.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(it.x, it.y, it.w, it.h);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = ownsTrack(it.id) ? '#fff8ee' : 'rgba(255, 248, 238, 0.55)';
      ctx.font = font(12, true);
      ctx.fillText(`${it.index + 1}`, it.x + 14, it.y + it.h / 2);
      ctx.font = font(16, true);
      ctx.fillText(trackName(it.id), it.x + 40, it.y + 22);
      ctx.font = font(12);
      ctx.fillText(CONFIG.audio.music[it.id].mood, it.x + 40, it.y + 46);
      ctx.textAlign = 'right';
      ctx.font = font(13, true);
      ctx.fillText(this.#tag(it.id), it.x + it.w - 14, it.y + it.h / 2);
    }
  }
}
