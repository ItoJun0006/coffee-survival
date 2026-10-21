import { CONFIG } from './config.js';

// プレイ中の絵（キャラ・敵・攻撃など）をドット絵にする層。
// 1. 絵を、画面と同じ大きさの見えない画用紙（full）に描く
// 2. size px ごとに 1 点だけ拾って小さな画用紙（small）に写す。色を混ぜないので、元の色がそのまま残る
// 3. はっきりした絵の外側 1 マスに縁取りを付ける
// 4. small を size 倍に引き伸ばして（ぼかさずに）画面に重ねる
export class PixelLayer {
  constructor() {
    this.full = document.createElement('canvas');
    this.fctx = this.full.getContext('2d');
    // small は縮めたあとの絵だけを読み出す（画面と同じ大きさの full を毎フレーム読み出すと重い）
    this.small = document.createElement('canvas');
    this.sctx = this.small.getContext('2d');
  }

  resize(viewW, viewH) {
    const n = CONFIG.pixelArt.size;
    this.w = Math.ceil(viewW / n);
    this.h = Math.ceil(viewH / n);
    this.full.width = this.w * n;
    this.full.height = this.h * n;
    this.small.width = this.w;
    this.small.height = this.h;
  }

  // 絵を描く前に呼ぶ。返した ctx に描く
  begin() {
    const { fctx } = this;
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, this.full.width, this.full.height);
    return fctx;
  }

  // 描いた絵をドットにして ctx に重ねる
  end(ctx) {
    const { sctx, w, h } = this;
    const { size, outline } = CONFIG.pixelArt;
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(this.full, 0, 0, w * size, h * size, 0, 0, w, h);
    if (outline) this.#addOutline();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.small, 0, 0, w, h, 0, 0, w * size, h * size);
    ctx.restore();
  }

  // ほぼ透明なマスのうち、上下左右のどれかが「はっきりした絵」のマスを縁取りの色にする
  #addOutline() {
    const { sctx, w, h } = this;
    const { outline, solidAlpha, emptyAlpha } = CONFIG.pixelArt;
    const solid = solidAlpha * 255;
    const empty = emptyAlpha * 255;
    const img = sctx.getImageData(0, 0, w, h);
    const src = img.data;
    const out = new Uint8ClampedArray(src);
    const [r, g, b] = outline;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > empty) continue;
        const near = (x > 0 && src[i - 1] > solid) || (x < w - 1 && src[i + 7] > solid)
          || (y > 0 && src[i - w * 4 + 3] > solid) || (y < h - 1 && src[i + w * 4 + 3] > solid);
        if (!near) continue;
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    }
    sctx.putImageData(new ImageData(out, w, h), 0, 0);
  }
}
