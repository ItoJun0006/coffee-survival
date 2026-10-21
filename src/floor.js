import { CONFIG } from './config.js';

// 珈琲店の木の床。ドット 1 マスずつ色を決めた小さな絵を作り、それを size 倍に引き伸ばした「床の柄」を
// 敷き詰めて描く。柄は最初に 1 回だけ作り、毎フレームは貼るだけなので軽い。
export class Floor {
  constructor() {
    const { size, periodDots } = CONFIG.floor;
    const small = document.createElement('canvas');
    small.width = periodDots;
    small.height = periodDots;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(periodDots, periodDots);
    for (let y = 0; y < periodDots; y++) {
      for (let x = 0; x < periodDots; x++) {
        const [r, g, b] = dotColor(plankAt(x, y));
        const i = (y * periodDots + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    sctx.putImageData(img, 0, 0);

    this.tile = document.createElement('canvas');
    this.tile.width = periodDots * size;
    this.tile.height = periodDots * size;
    const tctx = this.tile.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(small, 0, 0, this.tile.width, this.tile.height);
  }

  // ctx はワールド座標（カメラ分ずらした状態）で渡す。柄を必要な枚数だけ並べて貼り、マップの外にはみ出す分は切り取る
  draw(ctx, camera, viewW, viewH) {
    const { width, height } = CONFIG.world;
    const x0 = Math.max(0, camera.x);
    const y0 = Math.max(0, camera.y);
    const x1 = Math.min(width, camera.x + viewW);
    const y1 = Math.min(height, camera.y + viewH);
    if (x1 <= x0 || y1 <= y0) return;
    const t = this.tile.width;
    for (let ty = Math.floor(y0 / t) * t; ty < y1; ty += t) {
      for (let tx = Math.floor(x0 / t) * t; tx < x1; tx += t) {
        const sx = Math.max(x0, tx);
        const sy = Math.max(y0, ty);
        const w = Math.min(x1, tx + t) - sx;
        const h = Math.min(y1, ty + t) - sy;
        ctx.drawImage(this.tile, sx - tx, sy - ty, w, h, sx, sy, w, h);
      }
    }
  }
}

// 0 以上 1 未満の決まった乱数。同じ数を渡せば毎回同じ値になる
function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// 板 1 枚の中のどこにあるかを返す。id＝板ごとの番号、u＝長い方向の位置、v＝短い方向の位置、len＝板の長さ
// 横長の板を、継ぎ目を列ごとにずらして並べる
function plankAt(x, y) {
  const { width, length } = CONFIG.floor.planks;
  const row = Math.floor(y / width);
  const off = Math.floor(hash(row, 7) * length);
  const col = Math.floor((x + off) / length);
  // 柄のつなぎ目で同じ板が別の色にならないよう、番号を柄の幅でくり返す
  return { id: hash(row, col % (CONFIG.floor.periodDots / length)), u: (x + off) % length, v: y % width, len: length, wid: width };
}

// 板の中の位置から、そのドットの色を決める
function dotColor({ id, u, v, len, wid }) {
  const { base, tone, gap, grain, knot } = CONFIG.floor.colors;
  // 継ぎ目（板の端の 1 マス）
  if (u === 0 || v === 0) return gap;
  // 板ごとに少しずつ明るさを変える
  let k = 1 + (id - 0.5) * tone;
  // 木目：板の長い方向に流れる、ゆるく波打つ線
  const wave = Math.round(Math.sin(u * 0.35 + id * 20) * 0.8 + id * 3);
  if ((v + wave) % 3 === 0) k -= grain;
  // ときどき節（濃い点）を入れる
  if (id > 0.82 && Math.abs(u - Math.floor(len * id * 0.9)) <= 1 && Math.abs(v - Math.floor(wid / 2)) <= 0) k -= knot;
  return base.map((c) => Math.max(0, Math.min(255, Math.round(c * k))));
}
