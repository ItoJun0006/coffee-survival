import { CONFIG } from './config.js';
import { stage } from './stage.js';

// 決まった seed から毎回同じ並びを作る乱数
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 夜の暗さの絵に足す、マップの外側の余白（画面の端がマップの外に出ても暗くできるように）
const DARK_PAD = 1200;

// 0 以上 1 未満の決まった乱数。同じ数を渡せば毎回同じ値になる（石積みの壁の石の長さと色を選ぶ）
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// 色（#rrggbb）を明るさ 1 + amount 倍にする
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

// プレイ中の背景（夜の珈琲店の店内）。動かない壁・小物・ランプは 1 枚の絵にしておき、毎フレームは見えている部分だけ写す。
// 床は、木の床（floor.js）を使うときは描かず、使わないときだけタイルの床を描く。
// マップの広さはステージ（stage.js）ごとに違うので、広さが変わったら絵を作り直す
export class Background {
  constructor() {
    this.layer = document.createElement('canvas');
    this.dark = document.createElement('canvas');
    this.warm = document.createElement('canvas');
    this.builtFor = null;
  }

  #build() {
    const cfg = CONFIG.scenery;
    const { width, height } = stage.world;
    this.builtFor = `${width}x${height}`;
    // ドット絵にするときは、余白と絵の大きさをドットの大きさの倍数にして、ドットのマスをワールド座標の格子（木の床と同じ）にそろえる
    const n = this.#dotSize();
    this.margin = Math.ceil(cfg.wall.thickness / n) * n;
    this.rand = seededRandom(cfg.seed);
    this.lamps = this.#placeLamps();
    this.layer.width = Math.ceil((width + this.margin * 2) / n) * n;
    this.layer.height = Math.ceil((height + this.margin * 2) / n) * n;
    const ctx = this.layer.getContext('2d');
    ctx.translate(this.margin, this.margin);
    if (!CONFIG.floor.enabled) this.#drawFloor(ctx);
    this.#drawLampPools(ctx);
    this.#drawProps(ctx);
    this.#drawWall(ctx);
    this.#drawLampShades(ctx);
    if (n > 1) this.#pixelate(n);
    this.#buildDark();
  }

  // ほぼ透明なマスのうち、左上のマスが「はっきりした絵」のマスに影を落とす
  #addDotShadow(sctx, w, h) {
    const { solidAlpha, emptyAlpha } = CONFIG.pixelArt;
    const { color: [r, g, b], alpha } = CONFIG.scenery.dotShadow;
    const solid = solidAlpha * 255;
    const empty = emptyAlpha * 255;
    const img = sctx.getImageData(0, 0, w, h);
    const src = img.data;
    const out = new Uint8ClampedArray(src);
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] > empty || src[i - (w + 1) * 4 + 3] <= solid) continue;
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = Math.round(alpha * 255);
      }
    }
    sctx.putImageData(new ImageData(out, w, h), 0, 0);
  }

  // 背景をドット絵にするときのドットの大きさ。しないときは 1
  #dotSize() {
    return CONFIG.pixelArt.enabled && CONFIG.scenery.pixelate ? CONFIG.pixelArt.size : 1;
  }

  // 描いた絵を n px ごとに 1 点だけ拾って縮め（色を混ぜない）、右下 1 マスに影を付けて、ぼかさずに n 倍に戻す。
  // 拾い方はプレイ中の絵（pixel-layer.js）と同じ
  #pixelate(n) {
    const small = document.createElement('canvas');
    small.width = this.layer.width / n;
    small.height = this.layer.height / n;
    const sctx = small.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(this.layer, 0, 0, this.layer.width, this.layer.height, 0, 0, small.width, small.height);
    this.#addDotShadow(sctx, small.width, small.height);
    const ctx = this.layer.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.layer.width, this.layer.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, this.layer.width, this.layer.height);
  }

  #ensureBuilt() {
    const { width, height } = stage.world;
    if (this.builtFor !== `${width}x${height}`) this.#build();
  }

  // マップの外側を塗る。床より先に呼ぶ。ctx はワールド座標に合わせてある
  drawOutside(ctx, camera, viewW, viewH) {
    ctx.fillStyle = CONFIG.scenery.outside;
    ctx.fillRect(camera.x, camera.y, viewW, viewH);
  }

  // 壁・小物・ランプ（木の床を使わないときは床も）を描く。床のあとに呼ぶ。ctx はワールド座標に合わせてある
  draw(ctx, camera, viewW, viewH) {
    this.#ensureBuilt();
    const m = this.margin;
    // 見えている範囲と、絵の範囲の重なりだけを写す
    const sx = Math.max(0, Math.floor(camera.x + m));
    const sy = Math.max(0, Math.floor(camera.y + m));
    const ex = Math.min(this.layer.width, Math.ceil(camera.x + m + viewW));
    const ey = Math.min(this.layer.height, Math.ceil(camera.y + m + viewH));
    if (ex <= sx || ey <= sy) return;
    ctx.drawImage(this.layer, sx, sy, ex - sx, ey - sy, sx - m, sy - m, ex - sx, ey - sy);
  }

  // 夜の暗さを、ランプの周りだけ弱めて画面に重ねる。ランプは動かないので、
  // マップ全体の「暗さの濃さ」の絵を最初に 1 回だけ小さく作り（#buildDark）、毎フレームは見えている部分を alpha の濃さで写す
  drawDarkness(ctx, camera, viewW, viewH, alpha) {
    if (alpha <= 0) return;
    this.#ensureBuilt();
    const k = CONFIG.scenery.lamps.darkScale;
    const m = this.margin + DARK_PAD;
    ctx.save();
    ctx.globalAlpha = alpha;
    // ぼかさずに引き伸ばし、ドット絵と同じ 3px のマスにそろえる（ぼかすより軽い）
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.dark, (camera.x + m) * k, (camera.y + m) * k, viewW * k, viewH * k, 0, 0, viewW, viewH);
    // ランプの下を暖かい色で照らす。暗いほど強くする（色を足すので、暗い所を明るく塗り直す）
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * CONFIG.scenery.lamps.warm.rate;
    ctx.drawImage(this.warm, (camera.x + m) * k, (camera.y + m) * k, viewW * k, viewH * k, 0, 0, viewW, viewH);
    ctx.restore();
  }

  #buildDark() {
    const { lightRadius, strength, darkScale: k } = CONFIG.scenery.lamps;
    this.dark.width = Math.ceil((this.layer.width + DARK_PAD * 2) * k);
    this.dark.height = Math.ceil((this.layer.height + DARK_PAD * 2) * k);
    const d = this.dark.getContext('2d');
    d.setTransform(k, 0, 0, k, 0, 0);
    d.fillStyle = 'rgb(5, 3, 20)';
    d.fillRect(0, 0, this.layer.width + DARK_PAD * 2, this.layer.height + DARK_PAD * 2);
    d.globalCompositeOperation = 'destination-out';
    d.translate(this.margin + DARK_PAD, this.margin + DARK_PAD);
    for (const l of this.lamps) {
      const g = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, lightRadius);
      g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(l.x, l.y, lightRadius, 0, Math.PI * 2);
      d.fill();
    }
    this.#buildWarm();
  }

  // 夜にランプの下を照らす暖かい色の絵。夜の暗さの絵と同じ大きさ・同じ縮小率で作る
  #buildWarm() {
    const { darkScale: k, warm } = CONFIG.scenery.lamps;
    this.warm.width = this.dark.width;
    this.warm.height = this.dark.height;
    const d = this.warm.getContext('2d');
    d.setTransform(k, 0, 0, k, 0, 0);
    d.translate(this.margin + DARK_PAD, this.margin + DARK_PAD);
    for (const l of this.lamps) {
      const g = d.createRadialGradient(l.x, l.y, 0, l.x, l.y, warm.radius);
      g.addColorStop(0, warm.color);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(l.x, l.y, warm.radius, 0, Math.PI * 2);
      d.fill();
    }
  }

  #placeLamps() {
    const { spacing, jitter } = CONFIG.scenery.lamps;
    const { width, height } = stage.world;
    const lamps = [];
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        lamps.push({ x: x + (this.rand() - 0.5) * 2 * jitter, y: y + (this.rand() - 0.5) * 2 * jitter });
      }
    }
    return lamps;
  }

  // 色むらのあるタイルと目地、染み、ひび
  #drawFloor(ctx) {
    const f = CONFIG.scenery.floor;
    const { width, height } = stage.world;
    const r = this.rand;
    for (let y = 0; y < height; y += f.tileSize) {
      for (let x = 0; x < width; x += f.tileSize) {
        const base = f.tileColors[Math.floor(r() * f.tileColors.length)];
        ctx.fillStyle = shade(base, (r() - 0.5) * 2 * f.tileJitter);
        ctx.fillRect(x, y, f.tileSize, f.tileSize);
      }
    }
    ctx.fillStyle = f.stainColor;
    for (let i = 0; i < f.stains; i++) {
      const x = r() * width;
      const y = r() * height;
      const rx = 18 + r() * 50;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * (0.5 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = f.grout;
    ctx.lineWidth = f.groutWidth;
    ctx.beginPath();
    for (let x = 0; x <= width; x += f.tileSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += f.tileSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.strokeStyle = f.crackColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < f.cracks; i++) {
      let x = r() * width;
      let y = r() * height;
      let a = r() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        a += (r() - 0.5) * 1.2;
        x += Math.cos(a) * (8 + r() * 14);
        y += Math.sin(a) * (8 + r() * 14);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  #drawLampPools(ctx) {
    const { pool, poolRadius } = CONFIG.scenery.lamps;
    for (const l of this.lamps) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, poolRadius);
      g.addColorStop(0, pool);
      g.addColorStop(1, 'rgba(255, 190, 120, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, poolRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ランプは天井から下がっているので、小物と壁より上に描く
  #drawLampShades(ctx) {
    const { shadeRadius: r, shade: shadeColor, shadeRim } = CONFIG.scenery.lamps;
    for (const l of this.lamps) {
      ctx.fillStyle = shadeColor;
      ctx.beginPath();
      ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shadeRim;
      ctx.lineWidth = 2;
      ctx.stroke();
      // 笠を吊る 4 本の支え
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        ctx.moveTo(l.x + Math.cos(a) * r * 0.3, l.y + Math.sin(a) * r * 0.3);
        ctx.lineTo(l.x + Math.cos(a) * r, l.y + Math.sin(a) * r);
      }
      ctx.stroke();
    }
  }

  // 小物を、間隔をあけてばらばらに置く
  #drawProps(ctx) {
    const p = CONFIG.scenery.props;
    const { width, height } = stage.world;
    const r = this.rand;
    const types = Object.entries(p.types);
    const total = types.reduce((s, [, t]) => s + t.weight, 0);
    const placed = [];
    for (let tries = 0; placed.length < p.count && tries < p.count * 40; tries++) {
      const x = p.edgeMargin + r() * (width - p.edgeMargin * 2);
      const y = p.edgeMargin + r() * (height - p.edgeMargin * 2);
      if (Math.hypot(x - width / 2, y - height / 2) < p.clearRadius) continue;
      if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < p.minGap)) continue;
      let roll = r() * total;
      const [type] = types.find(([, t]) => (roll -= t.weight) <= 0) ?? types[0];
      placed.push({ x, y, type, angle: (r() - 0.5) * 0.5 });
    }
    for (const o of placed) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.angle);
      if (o.type === 'roaster') this.#roaster(ctx);
      else if (o.type === 'sacks') this.#sacks(ctx, 2 + Math.floor(r() * 3));
      else if (o.type === 'pallet') this.#pallet(ctx);
      else this.#cans(ctx, 1 + Math.floor(r() * 3));
      ctx.restore();
    }
  }

  // 焙煎機：丸いドラムと投入口、煙突。のぞき窓に火の色
  #roaster(ctx) {
    const c = CONFIG.scenery.props.colors;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-52, -34, 112, 82);
    ctx.fillStyle = c.ironDark;
    ctx.fillRect(-56, -40, 112, 80);
    ctx.fillStyle = c.iron;
    ctx.fillRect(-52, -36, 104, 72);
    ctx.fillStyle = c.ironLight;
    ctx.beginPath();
    ctx.arc(-8, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.ironDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = c.ember;
    ctx.beginPath();
    ctx.arc(-8, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // 投入口（じょうご）と煙突
    ctx.fillStyle = c.ironDark;
    ctx.beginPath();
    ctx.moveTo(26, -30);
    ctx.lineTo(48, -30);
    ctx.lineTo(42, -12);
    ctx.lineTo(32, -12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 22, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // 麻袋の山：縫い目の付いた袋をいくつか重ねる
  #sacks(ctx, n) {
    const c = CONFIG.scenery.props.colors;
    for (let i = 0; i < n; i++) {
      const x = (i % 2) * 34 - 17 + (i >= 2 ? 10 : 0);
      const y = Math.floor(i / 2) * 26 - 13;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 4, 22, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 ? c.burlapDark : c.burlap;
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.stitch;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 6);
      ctx.lineTo(x + 14, y - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 木のパレット：板を並べ、すき間を空ける
  #pallet(ctx) {
    const c = CONFIG.scenery.props.colors;
    ctx.fillStyle = c.woodDark;
    ctx.fillRect(-48, -38, 96, 76);
    ctx.fillStyle = c.wood;
    for (let i = 0; i < 5; i++) ctx.fillRect(-46, -36 + i * 15, 92, 10);
    ctx.fillStyle = c.woodDark;
    for (const x of [-40, -2, 36]) ctx.fillRect(x, -36, 4, 72);
  }

  // 豆の保存缶：上から見た丸い缶
  #cans(ctx, n) {
    const c = CONFIG.scenery.props.colors;
    for (let i = 0; i < n; i++) {
      const x = i * 30 - (n - 1) * 15;
      const y = (i % 2) * 10;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(x + 3, y + 3, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.canDark;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.can;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.canLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
    }
  }

  // 外周の石積みの壁（仕様 005 の FR-004）。マップの外側に、内側へ影を落として描く
  #drawWall(ctx) {
    const w = CONFIG.scenery.wall;
    const { width, height } = stage.world;
    const t = w.thickness;
    const rects = [
      [-t, -t, width + t * 2, t],
      [-t, height, width + t * 2, t],
      [-t, 0, t, height],
      [width, 0, t, height],
    ];
    for (const [x, y, rw, rh] of rects) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, rw, rh);
      ctx.clip();
      ctx.fillStyle = w.mortar;
      ctx.fillRect(x, y, rw, rh);
      // 石は段ごとに、長さと色を決まった乱数で選びながら左から並べる。段の始まりも少しずつずらす
      const gap = w.gap;
      for (let by = Math.floor(y / w.stoneH) * w.stoneH; by < y + rh; by += w.stoneH) {
        const row = Math.round(by / w.stoneH);
        const longest = Math.max(...w.stoneLens);
        let bx = Math.floor(x / longest) * longest - longest * 2 - Math.floor(hash(row, 1) * longest);
        for (let i = 0; bx < x + rw; i++) {
          const len = w.stoneLens[Math.floor(hash(row, i + bx) * w.stoneLens.length)];
          ctx.fillStyle = w.stones[Math.floor(hash(i + bx, row * 7) * w.stones.length)];
          ctx.fillRect(bx + gap, by + gap, len - gap * 2, w.stoneH - gap * 2);
          ctx.fillStyle = w.highlight;
          ctx.fillRect(bx + gap, by + gap, len - gap * 2, w.highlightH);
          bx += len;
        }
      }
      ctx.restore();
    }
    // 壁の上端（床との境目）と、床に落ちる影
    ctx.strokeStyle = w.top;
    ctx.lineWidth = 4;
    ctx.strokeRect(-2, -2, width + 4, height + 4);
    const s = 26;
    const edges = [
      [0, 0, width, s, 0, 0, 0, s],
      [0, height - s, width, s, 0, height, 0, height - s],
      [0, 0, s, height, 0, 0, s, 0],
      [width - s, 0, s, height, width, 0, width - s, 0],
    ];
    for (const [x, y, rw, rh, x0, y0, x1, y1] of edges) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, w.shadow);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, rw, rh);
    }
  }
}
