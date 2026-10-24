import { CONFIG } from './config.js';

// 攻撃の見え方（仕様 035）：攻撃の絵をまとめて薄くする割合。遊ぶ人がポーズメニューで変え、ブラウザに保存する
const STORAGE_KEY = 'coffee-survival.weaponAlpha';

function load() {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY));
    if (CONFIG.weaponAlpha.steps.includes(v)) return v;
  } catch {
    // 保存領域が使えないときは、初期値で遊べるようにする
  }
  return CONFIG.weaponAlpha.default;
}

export const weaponAlpha = {
  value: load(),

  // 段階を 1 つ動かす。d は −1（濃く）か ＋1（薄く）。端では止まる
  change(d) {
    const { steps } = CONFIG.weaponAlpha;
    const i = Math.max(0, Math.min(steps.length - 1, steps.indexOf(this.value) + d));
    this.value = steps[i];
    try {
      localStorage.setItem(STORAGE_KEY, String(this.value));
    } catch {
      // 保存できなくても、このページを開いている間は効く
    }
  },
};

// 攻撃の絵を、別の画用紙にまとめて描いてから、決めた濃さで ctx に重ねる。
// 1 つずつ薄くすると重なった所だけ濃く見えるので、まとめて薄くする。100% のときはそのまま描く
export class WeaponLayer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.lctx = this.canvas.getContext('2d');
  }

  draw(ctx, drawFn) {
    const alpha = weaponAlpha.value / 100;
    if (alpha >= 1) {
      drawFn(ctx);
      return;
    }
    const { canvas, lctx } = this;
    if (canvas.width !== ctx.canvas.width || canvas.height !== ctx.canvas.height) {
      canvas.width = ctx.canvas.width;
      canvas.height = ctx.canvas.height;
    }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, canvas.width, canvas.height);
    lctx.setTransform(ctx.getTransform());
    drawFn(lctx);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }
}
