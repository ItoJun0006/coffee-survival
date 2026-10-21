// 品種ごとの模様（仕様 016）。豆の上に描く模様を、豆の中心を (0, 0)、豆の大きさを r とした座標で描く。
// rx・ry は豆の輪郭（楕円）の半径。模様は輪郭の内側に切り抜くので、外にははみ出さない（当たる範囲も変えない）

const TAU = Math.PI * 2;

const circle = (ctx, x, y, rad) => {
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, TAU);
  ctx.fill();
};

function star(ctx, x, y, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const d = i % 2 ? inner : outer;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function flower(ctx, x, y, s, petal, center) {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5 - Math.PI / 2;
    circle(ctx, x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6, s * 0.5);
  }
  ctx.fillStyle = center;
  circle(ctx, x, y, s * 0.4);
}

// kind は模様の種類、color は模様の色
export function drawPattern(ctx, kind, color, r, rx, ry) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const band = (y, h) => ctx.fillRect(-rx, y, rx * 2, h);
  switch (kind) {
    case 'dots':
      for (const [x, y] of [[-0.5, -0.55], [0.5, -0.6], [-0.55, 0.7], [0.5, 0.72], [0, 0.88]]) circle(ctx, x * rx, y * ry, r * 0.15);
      break;
    case 'vstripe':
      for (const x of [-0.62, 0.62]) ctx.fillRect(x * rx - r * 0.1, -ry, r * 0.2, ry * 2);
      break;
    case 'hstripe':
      band(-ry * 0.68, r * 0.18);
      band(ry * 0.66, r * 0.18);
      break;
    case 'freckles':
      for (const [x, y] of [[-0.6, 0.3], [-0.42, 0.42], [0.6, 0.3], [0.42, 0.42], [-0.3, -0.7], [0.32, -0.62]]) ctx.fillRect(x * rx - r * 0.06, y * ry - r * 0.06, r * 0.13, r * 0.13);
      break;
    case 'belt':
      band(ry * 0.6, r * 0.26);
      break;
    case 'peak':
      ctx.beginPath();
      ctx.moveTo(-rx, -ry * 0.42);
      ctx.lineTo(-rx * 0.45, -ry * 0.6);
      ctx.lineTo(-rx * 0.2, -ry * 0.46);
      ctx.lineTo(rx * 0.15, -ry * 0.64);
      ctx.lineTo(rx * 0.5, -ry * 0.48);
      ctx.lineTo(rx, -ry * 0.6);
      ctx.lineTo(rx, -ry);
      ctx.lineTo(-rx, -ry);
      ctx.closePath();
      ctx.fill();
      break;
    case 'diag':
      ctx.lineWidth = r * 0.16;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(-rx + k * r * 0.55, ry);
        ctx.lineTo(rx + k * r * 0.55, -ry);
        ctx.stroke();
      }
      break;
    case 'checker': {
      const s = r * 0.24;
      for (let y = -ry; y < ry; y += s) {
        if (y > -ry * 0.5 && y < ry * 0.55) continue;
        for (let x = -rx; x < rx; x += s) if ((Math.round((x + rx) / s) + Math.round((y + ry) / s)) % 2 === 0) ctx.fillRect(x, y, s, s);
      }
      break;
    }
    case 'flower':
      flower(ctx, rx * 0.5, -ry * 0.58, r * 0.22, color, '#ffe066');
      break;
    case 'waves':
      ctx.lineWidth = r * 0.14;
      for (const y of [-0.66, 0.7]) {
        ctx.beginPath();
        for (let x = -rx; x <= rx; x += r * 0.1) ctx.lineTo(x, y * ry + Math.sin((x / r) * 6) * r * 0.08);
        ctx.stroke();
      }
      break;
    case 'star':
      star(ctx, -rx * 0.45, -ry * 0.6, r * 0.3, r * 0.13);
      break;
    case 'zigzag':
      ctx.lineWidth = r * 0.15;
      ctx.beginPath();
      for (let i = 0, x = -rx; x <= rx + 1; i++, x += r * 0.25) ctx.lineTo(x, ry * (i % 2 ? 0.6 : 0.78));
      ctx.stroke();
      break;
    case 'spots':
      for (const [x, y, s] of [[-0.5, -0.55, 0.2], [0.55, -0.4, 0.15], [0.4, 0.72, 0.2], [-0.5, 0.7, 0.12]]) circle(ctx, x * rx, y * ry, r * s);
      break;
    case 'cross':
      for (const [x, y] of [[-0.5 * rx, -0.75 * ry], [0.35 * rx, 0.58 * ry]]) {
        ctx.fillRect(x - r * 0.08, y, r * 0.16, r * 0.42);
        ctx.fillRect(x - r * 0.21, y + r * 0.13, r * 0.42, r * 0.16);
      }
      break;
    case 'ring':
      ctx.lineWidth = r * 0.13;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.82, ry * 0.86, 0, 0, TAU);
      ctx.stroke();
      break;
    case 'half':
      band(ry * 0.56, ry);
      break;
    case 'petals':
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * rx * 0.98, Math.sin(a) * ry * 0.98, r * 0.22, r * 0.12, a, 0, TAU);
        ctx.fill();
      }
      break;
    case 'chevron':
      ctx.lineWidth = r * 0.14;
      for (const y of [-0.78, -0.56]) {
        ctx.beginPath();
        ctx.moveTo(-rx, y * ry + r * 0.25);
        ctx.lineTo(0, y * ry - r * 0.05);
        ctx.lineTo(rx, y * ry + r * 0.25);
        ctx.stroke();
      }
      break;
    case 'mountains':
      ctx.beginPath();
      ctx.moveTo(-rx, ry);
      ctx.lineTo(-rx, ry * 0.75);
      ctx.lineTo(-rx * 0.4, ry * 0.5);
      ctx.lineTo(0, ry * 0.7);
      ctx.lineTo(rx * 0.45, ry * 0.45);
      ctx.lineTo(rx, ry * 0.72);
      ctx.lineTo(rx, ry);
      ctx.closePath();
      ctx.fill();
      break;
    case 'sparkle':
      for (const [x, y, s] of [[-0.5, -0.6, 0.26], [0.55, -0.35, 0.18], [0.4, 0.72, 0.22]]) star(ctx, x * rx, y * ry, r * s, r * s * 0.3, 4);
      break;
    default:
  }
  ctx.restore();
}
