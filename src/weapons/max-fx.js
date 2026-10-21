// MAX の見た目で共有する描き方。重い光は作り置きした小さな絵を貼る

const glowCache = new Map();

// '#rrggbb' を [r, g, b] にする
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 中心が color で外へ向かって透明になる光の絵。色と半径（2px 刻み）ごとに 1 枚だけ作る
function glowSprite(color, radius) {
  const r = Math.max(2, Math.round(radius / 2) * 2);
  const key = `${color}:${r}`;
  let sprite = glowCache.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = r * 2;
    const g = sprite.getContext('2d');
    const [cr, cg, cb] = rgb(color);
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
    grad.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.45)`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, r * 2, r * 2);
    glowCache.set(key, sprite);
  }
  return sprite;
}

// ぼんやりした光を足し合わせて描く（重なるほど明るくなる）
export function drawGlow(ctx, x, y, radius, color, alpha = 1) {
  if (alpha <= 0 || radius <= 0) return;
  const sprite = glowSprite(color, radius);
  const r = sprite.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(sprite, x - r, y - r);
  ctx.restore();
}

// 0〜1 の決まった乱数（同じ seed なら毎回同じ値）
export function hash(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// 立ちのぼる湯気。time で動き、状態を持たない。
// count 個の湯気の玉が、spread の幅から height だけ昇りながら薄くなる
export function drawWisps(ctx, x, y, { count, height, spread, size, color, alpha, time, speed = 0.8, seed = 0 }) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const k = (time * speed + hash(seed + i)) % 1;
    const wx = x + (hash(seed + i * 7.3) - 0.5) * spread + Math.sin((k + i) * Math.PI * 2) * size;
    const wy = y - k * height;
    ctx.globalAlpha = alpha * Math.sin(k * Math.PI);
    ctx.beginPath();
    ctx.arc(wx, wy, size * (0.6 + k * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 円のパス
export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}
