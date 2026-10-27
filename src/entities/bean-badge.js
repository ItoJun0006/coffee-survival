import { CONFIG } from '../config.js';
import { addBadges, badges } from '../progress.js';
import { stage } from '../stage.js';

// 豆の証（仕様 081）。1 面の手下がまれに落とし、拾った分はそのプレイをクリアしたときだけ自分のものになる。
// 持っている数だけ、結果画面でもらう豆コインが増える

const cfg = () => CONFIG.coins.badge;
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// 証の絵（青い盾に金のふちと豆）。大きさ s は盾の半分の幅。アイコンにも使う
export function drawBadgeIcon(ctx, x, y, s) {
  const { shield, rim, bean, crease } = cfg().colors;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = shield;
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, -s);
  ctx.lineTo(s * 0.9, -s);
  ctx.lineTo(s * 0.9, s * 0.1);
  ctx.quadraticCurveTo(s * 0.8, s * 0.8, 0, s * 1.15);
  ctx.quadraticCurveTo(-s * 0.8, s * 0.8, -s * 0.9, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = s * 0.16;
  ctx.stroke();
  // 真ん中の豆
  const b = s * 0.5;
  ctx.fillStyle = bean;
  ctx.beginPath();
  ctx.ellipse(0, 0, b * 0.7, b, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = crease;
  ctx.lineWidth = b * 0.25;
  ctx.beginPath();
  ctx.moveTo(0, -b * 0.8);
  ctx.quadraticCurveTo(b * 0.25, 0, 0, b * 0.8);
  ctx.stroke();
  ctx.restore();
}

// 1 回のプレイの間の、落ちている証と拾った証。game.js からは drop・update・draw・settle を呼ぶだけにする
export class BadgeField {
  constructor() {
    this.items = [];
    this.picked = 0;
    this.time = 0;
  }

  // 敵が倒れたときに呼ぶ。1 面の手下だけが落とす（ボスとエクストラステージでは落ちない）
  drop(enemy) {
    if (stage.id !== 'main' || Math.random() >= cfg().dropChance) return;
    this.items.push({ x: enemy.x, y: enemy.y });
  }

  // 拾った数を返す（拾ったときに知らせを出すため）
  update(dt, player) {
    this.time += dt;
    const reach = cfg().radius + player.radius;
    const before = this.items.length;
    this.items = this.items.filter((b) => Math.hypot(b.x - player.x, b.y - player.y) >= reach);
    const got = before - this.items.length;
    this.picked += got;
    return got;
  }

  // 落ちている証。上下にふわふわ揺れ、光の輪が付く（消えない）
  draw(ctx) {
    const r = cfg().radius;
    for (const b of this.items) {
      const y = b.y + Math.sin(this.time * 3) * 3;
      ctx.fillStyle = cfg().colors.glow;
      ctx.beginPath();
      ctx.arc(b.x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      drawBadgeIcon(ctx, b.x, y, r);
    }
  }

  // プレイが終わったときに呼ぶ。クリアなら拾った証を自分のものにし（max 個をこえた分は豆コインにする）、
  // 持っている証の数だけ、ほかの行の合計を増やす行を返す（結果画面の数え上げに足す）
  settle(cleared, rows) {
    const c = cfg();
    const extra = [];
    const over = cleared && this.picked ? addBadges(this.picked, c.max) : 0;
    const held = badges();
    const base = rows.reduce((sum, r) => sum + r.value, 0);
    if (held > 0) {
      extra.push({ label: fmt(c.texts.row, { n: held, p: Math.round(held * c.ratePer * 100) }), value: Math.floor(base * held * c.ratePer), badge: true });
    }
    if (over > 0) extra.push({ label: fmt(c.texts.overflow, { n: over, max: c.max }), value: over * c.overflowCoins, badge: true });
    return extra;
  }
}
