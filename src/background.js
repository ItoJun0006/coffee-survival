import { CONFIG } from './config.js';

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

// 色（#rrggbb）を明るさ 1 + amount 倍にする
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

// プレイ中の背景（夜の焙煎工房）。動かない床・壁・小物は最初に 1 枚の絵にしておき、毎フレームは見えている部分だけ写す
export class Background {
  constructor() {
    const cfg = CONFIG.stage;
    this.margin = cfg.wall.thickness;
    this.rand = seededRandom(cfg.seed);
    this.lamps = this.#placeLamps();
    this.layer = document.createElement('canvas');
    this.layer.width = CONFIG.world.width + this.margin * 2;
    this.layer.height = CONFIG.world.height + this.margin * 2;
    const ctx = this.layer.getContext('2d');
    ctx.translate(this.margin, this.margin);
    this.#drawFloor(ctx);
    this.#drawLampPools(ctx);
    this.#drawProps(ctx);
    this.#drawWall(ctx);
    this.#drawLampShades(ctx);
    this.dark = document.createElement('canvas');
  }

  // 床・壁・小物を描く。ctx はワールド座標に合わせてある
  draw(ctx, camera, viewW, viewH) {
    const m = this.margin;
    ctx.fillStyle = CONFIG.stage.outside;
    ctx.fillRect(camera.x, camera.y, viewW, viewH);
    // 見えている範囲と、絵の範囲の重なりだけを写す
    const sx = Math.max(0, Math.floor(camera.x + m));
    const sy = Math.max(0, Math.floor(camera.y + m));
    const ex = Math.min(this.layer.width, Math.ceil(camera.x + m + viewW));
    const ey = Math.min(this.layer.height, Math.ceil(camera.y + m + viewH));
    if (ex <= sx || ey <= sy) return;
    ctx.drawImage(this.layer, sx, sy, ex - sx, ey - sy, sx - m, sy - m, ex - sx, ey - sy);
  }

  // 夜の暗さを、ランプの周りだけ弱めて画面に重ねる
  drawDarkness(ctx, camera, viewW, viewH, alpha) {
    if (alpha <= 0) return;
    const { lightRadius, strength } = CONFIG.stage.lamps;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(viewW * dpr);
    const h = Math.floor(viewH * dpr);
    if (this.dark.width !== w || this.dark.height !== h) {
      this.dark.width = w;
      this.dark.height = h;
    }
    const d = this.dark.getContext('2d');
    d.setTransform(dpr, 0, 0, dpr, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, viewW, viewH);
    d.fillStyle = `rgba(5, 3, 20, ${alpha})`;
    d.fillRect(0, 0, viewW, viewH);
    d.globalCompositeOperation = 'destination-out';
    for (const l of this.lamps) {
      const x = l.x - camera.x;
      const y = l.y - camera.y;
      if (x < -lightRadius || y < -lightRadius || x > viewW + lightRadius || y > viewH + lightRadius) continue;
      const g = d.createRadialGradient(x, y, 0, x, y, lightRadius);
      g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(x, y, lightRadius, 0, Math.PI * 2);
      d.fill();
    }
    ctx.drawImage(this.dark, 0, 0, viewW, viewH);
  }

  #placeLamps() {
    const { spacing, jitter } = CONFIG.stage.lamps;
    const { width, height } = CONFIG.world;
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
    const f = CONFIG.stage.floor;
    const { width, height } = CONFIG.world;
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
    const { pool, poolRadius } = CONFIG.stage.lamps;
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
    const { shadeRadius: r, shade: shadeColor, shadeRim } = CONFIG.stage.lamps;
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
    const p = CONFIG.stage.props;
    const { width, height } = CONFIG.world;
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
    const c = CONFIG.stage.props.colors;
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
    const c = CONFIG.stage.props.colors;
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
    const c = CONFIG.stage.props.colors;
    ctx.fillStyle = c.woodDark;
    ctx.fillRect(-48, -38, 96, 76);
    ctx.fillStyle = c.wood;
    for (let i = 0; i < 5; i++) ctx.fillRect(-46, -36 + i * 15, 92, 10);
    ctx.fillStyle = c.woodDark;
    for (const x of [-40, -2, 36]) ctx.fillRect(x, -36, 4, 72);
  }

  // 豆の保存缶：上から見た丸い缶
  #cans(ctx, n) {
    const c = CONFIG.stage.props.colors;
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

  // 外周のレンガの壁。マップの外側に、内側へ影を落として描く
  #drawWall(ctx) {
    const w = CONFIG.stage.wall;
    const { width, height } = CONFIG.world;
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
      for (let by = Math.floor(y / w.brickH) * w.brickH, row = 0; by < y + rh; by += w.brickH, row++) {
        const offset = (Math.floor(by / w.brickH) % 2) * (w.brickW / 2);
        for (let bx = Math.floor(x / w.brickW) * w.brickW - offset; bx < x + rw; bx += w.brickW) {
          ctx.fillStyle = (Math.floor(bx / w.brickW) + row) % 3 ? w.brick : w.brickAlt;
          ctx.fillRect(bx + 1, by + 1, w.brickW - 2, w.brickH - 2);
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
