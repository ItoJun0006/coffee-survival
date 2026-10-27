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

  // 背表紙の並び。棚の飾りの分だけ、上下に余白をとる
  #items(viewW, viewH) {
    const { spine } = cfg();
    const n = tracks().length;
    const left = (viewW - (n * spine.w + (n - 1) * spine.gap)) / 2;
    const top = Math.max(200, viewH / 2 - spine.h / 2 + 10);
    return tracks().map((id, index) => ({ id, index, x: left + index * (spine.w + spine.gap), y: top, w: spine.w, h: spine.h }));
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
    ctx.fillText(s.title, viewW / 2, 104);
    // 持っている豆コイン（右上。音の表示の下）
    const have = `${CONFIG.coins.name} ${coinText(coins())}`;
    ctx.font = font(15);
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.fillText(have, viewW - 20, 56);
    drawCoin(ctx, viewW - 20 - ctx.measureText(have).width - 12, 56, 7);

    const items = this.#items(viewW, viewH);
    this.#drawShelf(ctx, items, t);

    // 選んでいる曲の説明
    const id = tracks()[this.index];
    const bottom = Math.max(...items.map((it) => it.y + it.h));
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = font(18, true);
    ctx.fillText(trackName(id), viewW / 2, bottom + 52);
    ctx.font = font(14);
    ctx.fillStyle = s.colors.sub;
    ctx.fillText(CONFIG.audio.music[id].mood, viewW / 2, bottom + 78);
    ctx.font = font(15, true);
    ctx.fillStyle = s.colors.accent;
    ctx.fillText(this.#statusText(id), viewW / 2, bottom + 106);
    if (this.message && performance.now() - this.message.at < 2000) {
      ctx.fillStyle = s.colors.warn;
      ctx.fillText(this.message.text, viewW / 2, bottom + 130);
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

  // アンティークの本棚（仕様 039）：彫りの入った冠と台、真鍮の金具、木目の側板。上の右端でレコード盤が回る。
  // 背表紙の装丁は spine.style（3 案）で描き分け、曲ごとに「シック」か「ポップ」の色を使う
  #drawShelf(ctx, items, t) {
    const s = cfg();
    const w = s.wood;
    const first = items[0];
    const last = items[items.length - 1];
    const x0 = first.x - 46;
    const x1 = last.x + last.w + 46;
    const y0 = first.y - 34;
    const y1 = first.y + first.h + 18;
    // 奥の板
    ctx.fillStyle = w.back;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let x = x0 + 18; x < x1; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
    // 側板（木目の線）
    for (const sx of [x0 - 22, x1]) {
      ctx.fillStyle = w.side;
      ctx.fillRect(sx, y0 - 10, 22, y1 - y0 + 34);
      ctx.strokeStyle = w.grain;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(sx + 4 + k * 3.5, y0 - 6);
        ctx.bezierCurveTo(sx + 2 + k * 3.5, y0 + 80, sx + 8 + k * 3.5, y1 - 80, sx + 4 + k * 3.5, y1 + 20);
        ctx.stroke();
      }
    }
    // 冠（上の飾り）：段のついた板と、波形の彫り
    ctx.fillStyle = w.top;
    ctx.fillRect(x0 - 34, y0 - 26, x1 - x0 + 68, 18);
    ctx.fillStyle = w.side;
    ctx.fillRect(x0 - 26, y0 - 10, x1 - x0 + 52, 12);
    ctx.fillStyle = w.dark;
    for (let x = x0 - 20; x < x1 + 20; x += 16) {
      ctx.beginPath();
      ctx.arc(x + 8, y0 + 2, 5, 0, Math.PI);
      ctx.fill();
    }
    // 台（下の飾り）と、真鍮の金具
    ctx.fillStyle = w.top;
    ctx.fillRect(x0 - 30, y1, x1 - x0 + 60, 16);
    ctx.fillStyle = w.side;
    ctx.fillRect(x0 - 24, y1 + 16, x1 - x0 + 48, 10);
    ctx.fillStyle = w.brass;
    for (const bx of [x0 - 18, x1 + 4]) {
      ctx.fillRect(bx, y0 - 4, 14, 14);
      ctx.fillRect(bx, y1 - 10, 14, 14);
    }
    ctx.fillStyle = w.dark;
    for (const bx of [x0 - 18, x1 + 4]) {
      ctx.fillRect(bx + 5, y0 + 1, 4, 4);
      ctx.fillRect(bx + 5, y1 - 5, 4, 4);
    }
    // 冠の上で回るレコード盤（流している曲のラベル色）
    const playing = currentTrack();
    this.#disc(ctx, x1 - 30, y0 - 58, 30, s.covers[playing].main, t, true);
    ctx.fillStyle = w.brass;
    ctx.fillRect(x1 - 4, y0 - 82, 4, 40);

    for (const it of items) this.#drawSpine(ctx, it, it.index === this.index);
  }

  // 背表紙 1 冊。選んでいる 1 冊は手前に引き出す（少し上にずらし、影を付ける）
  #drawSpine(ctx, it, on) {
    const s = cfg();
    const c = s.covers[it.id];
    const style = s.spine.style;
    const x = it.x;
    const y = it.y + (on ? -16 : 0);
    const { w, h } = it;
    ctx.save();
    if (on) {
      ctx.shadowColor = s.colors.accent;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = c.main;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // 丸みの陰影：左右の端を暗く、少し左を明るく
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    g.addColorStop(0.25, 'rgba(255, 255, 255, 0.12)');
    g.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    if (style === 'B') {
      // 布の装丁：細かい布目と、貼った紙のラベル
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;
      for (let yy = y + 2; yy < y + h; yy += 3) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
        ctx.stroke();
      }
      ctx.fillStyle = c.sub;
      ctx.fillRect(x, y + 10, w, 6);
      ctx.fillRect(x, y + h - 16, w, 6);
      this.#label(ctx, x + 10, y + 34, w - 20, h - 110, c, true);
    } else if (style === 'C') {
      // 古書の装丁：上下は革、まん中はマーブル模様の紙
      const mid = { y: y + 46, h: h - 112 };
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, mid.y, w, mid.h);
      ctx.clip();
      ctx.fillStyle = c.sub;
      ctx.fillRect(x, mid.y, w, mid.h);
      ctx.lineWidth = 3;
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = k % 2 ? c.main : c.accent;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        for (let yy = 0; yy <= mid.h; yy += 6) {
          const xx = x + ((k * 13) % w) + Math.sin(yy / 18 + k) * 10;
          if (yy === 0) ctx.moveTo(xx, mid.y + yy);
          else ctx.lineTo(xx, mid.y + yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = c.foil;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, mid.y);
      ctx.lineTo(x + w, mid.y);
      ctx.moveTo(x, mid.y + mid.h);
      ctx.lineTo(x + w, mid.y + mid.h);
      ctx.stroke();
      this.#label(ctx, x + 12, mid.y + 20, w - 24, mid.h - 40, c, true);
    } else {
      // 革と金箔の装丁：背の盛り上がり（バンド）と、金の枠の中の曲名
      for (const by of [y + 18, y + 44, y + h - 70, y + h - 44]) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, by + 4, w, 3);
        ctx.fillStyle = c.foil;
        ctx.fillRect(x + 4, by, w - 8, 2);
        ctx.fillRect(x + 4, by + 6, w - 8, 1);
      }
      this.#label(ctx, x + 8, y + 58, w - 16, h - 140, c, false);
    }
    // 下の札：値段か、持っている・再生中
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(12, true);
    ctx.fillStyle = c.foil;
    ctx.fillText(this.#tag(it.id), x + w / 2, y + h - 22);
    if (!ownsTrack(it.id)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(x, y, w, h - 36);
    }
    if (on) {
      ctx.strokeStyle = s.colors.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // 背表紙の曲名：縦に 1 文字ずつ。paper のときは紙のラベル、そうでなければ金の細い枠
  #label(ctx, x, y, w, h, c, paper) {
    if (paper) {
      ctx.fillStyle = c.paper;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = c.main;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    } else {
      ctx.strokeStyle = c.foil;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    }
    const name = trackName(this.#idOf(c)).replace(/[・ ]/g, '');
    const size = Math.min(15, (h - 16) / name.length);
    ctx.font = font(size, true);
    ctx.fillStyle = paper ? c.ink : c.foil;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const top = y + h / 2 - ((name.length - 1) * size) / 2;
    [...name].forEach((ch, i) => ctx.fillText(ch, x + w / 2, top + i * size));
  }

  #idOf(cover) {
    return Object.keys(cfg().covers).find((id) => cfg().covers[id] === cover);
  }
}
