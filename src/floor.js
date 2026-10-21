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
    const plankAt = PLANKS[CONFIG.floor.style];
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
    this.pattern = null;
  }

  // ctx はワールド座標（カメラ分ずらした状態）で渡す
  draw(ctx, camera, viewW, viewH) {
    this.pattern ??= ctx.createPattern(this.tile, 'repeat');
    const { width, height } = CONFIG.world;
    const x0 = Math.max(0, camera.x);
    const y0 = Math.max(0, camera.y);
    const x1 = Math.min(width, camera.x + viewW);
    const y1 = Math.min(height, camera.y + viewH);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.fillStyle = this.pattern;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
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
const PLANKS = {
  // 板張り：横長の板を、継ぎ目をずらして並べる
  planks(x, y) {
    const { width, length } = CONFIG.floor.planks;
    const row = Math.floor(y / width);
    const off = Math.floor(hash(row, 7) * length);
    const col = Math.floor((x + off) / length);
    // 柄のつなぎ目で同じ板が別の色にならないよう、番号を柄の幅でくり返す
    return { id: hash(row, col % (CONFIG.floor.periodDots / length)), u: (x + off) % length, v: y % width, len: length, wid: width };
  },
  // 寄木：短い板を数枚まとめた四角を、向きを交互に変えて並べる
  parquet(x, y) {
    const { block, count } = CONFIG.floor.parquet;
    const bx = Math.floor(x / block);
    const by = Math.floor(y / block);
    const lx = x % block;
    const ly = y % block;
    const wid = block / count;
    const flat = (bx + by) % 2 === 0;
    const across = flat ? ly : lx;
    const k = Math.floor(across / wid);
    return { id: hash(bx, by, k), u: flat ? lx : ly, v: across % wid, len: block, wid };
  },
  // ヘリンボーン：短い板を、縦と横で階段のように組み合わせる
  herringbone(x, y) {
    const w = CONFIG.floor.herringbone.width;
    const a = Math.floor(x / w);
    const b = Math.floor(y / w);
    const d = a - b;
    // 柄 1 枚の中で階段が n 段くり返す。つなぎ目で同じ板が別の色にならないよう、番号を n でくり返す
    const n = CONFIG.floor.periodDots / (4 * w);
    const id = (k, j, t) => hash(((k % (2 * n)) + 2 * n) % (2 * n), ((j % n) + n) % n, t);
    const m = ((d % 4) + 4) % 4;
    if (m === 0 || m === 3) {
      const j = Math.floor((d + 1) / 4);
      const k = a - 2 * j;
      return { id: id(k, j, 1), u: (b + 2 * j - k) * w + (y % w), v: x % w, len: w * 2, wid: w };
    }
    const j = Math.floor((d - 1) / 4);
    const k = b + 2 * j;
    return { id: id(k, j, 2), u: (a - 2 * j - k - 1) * w + (x % w), v: y % w, len: w * 2, wid: w };
  },
};

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
