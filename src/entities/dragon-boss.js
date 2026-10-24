import { CONFIG } from '../config.js';
import { drawCoin } from '../coin-ui.js';
import { addCoins, isUnlocked } from '../progress.js';
import { CONDITIONS, readyId } from '../characters.js';
import { font } from '../font.js';

const cfg = CONFIG.dragonBoss;

// 確認用：?dragon を付けて開くと、1 面のクリアのたびに必ず竜が目を覚ます（仕様 061 FR-009）
const debugDragon = new URLSearchParams(location.search).has('dragon');

// 1 面のクリアのあとに竜が目を覚ますかどうか。確率はキャラ係の characters.dragon.bossChance（まだなければ 0）
export function rollDragon() {
  return debugDragon || Math.random() < (CONFIG.characters.dragon?.bossChance ?? 0);
}

// 竜を倒したときの宝（仕様 061 FR-010）。ドラゴン豆がもう仕入れられる（2 回目以降に倒した）ときは豆コインを渡して、その枚数を返す。
// 1 回目なら 0 を返す（そのときは、game.js がドラゴン豆の条件 dragonDefeat を調べる）
export function takeDragonTreasure() {
  const group = CONDITIONS.find((c) => c.require.type === 'dragonDefeat')?.group;
  if (!group || !isUnlocked(readyId(group))) return 0;
  addCoins(cfg.treasureCoins);
  return cfg.treasureCoins;
}

// ドラゴンのボス「まどろみ宝竜」（仕様 061）。ネムリーヌ（Boss）と同じ枠（game.boss）に入れて戦うので、
// 体力のバー・攻撃の当たり方・体に触れたときのダメージは、ネムリーヌと同じ仕組みを使う。
// 自分の攻撃（ねむけの息・豆コインの雨）は update の中で進め、プレイヤーに直接当てる
export class DragonBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = cfg.radius;
    this.hp = cfg.hp;
    this.name = cfg.name;
    // ネムリーヌの「目が開く」はない
    this.eyeOpen = false;
    this.flap = 0;
    // 息：wait（次まで）→ warn（予告）→ blow（吐く）
    this.breath = { stage: 'wait', timer: 0, angle: 0 };
    this.rainTimer = 0;
    // 降っている・落ちているコイン { x, y, t, landed }
    this.coins = [];
    // 拾った豆コインの数と、拾ったときのきらめき { x, y, t }
    this.picked = 0;
    this.sparkles = [];
  }

  get dead() {
    return this.hp <= 0;
  }

  get hpRatio() {
    return Math.max(0, this.hp / cfg.hp);
  }

  // ネムリーヌの特別な攻撃（あくび・呼び出し・とばりなど）は使わない
  has() {
    return false;
  }

  consume() {
    return false;
  }

  damage(amount) {
    this.hp -= amount;
  }

  update(dt, player) {
    this.flap += dt * 3;
    this.#updateBreath(dt, player);
    // 息を吐いている間は止まる
    if (this.breath.stage === 'wait') {
      const d = Math.hypot(player.x - this.x, player.y - this.y) || 1;
      this.x += ((player.x - this.x) / d) * cfg.speed * dt;
      this.y += ((player.y - this.y) / d) * cfg.speed * dt;
    }
    this.#updateCoinRain(dt, player);
  }

  #updateBreath(dt, player) {
    const b = this.breath;
    const c = cfg.breath;
    b.timer += dt;
    if (b.stage === 'wait' && b.timer >= c.intervalSec) {
      b.stage = 'warn';
      b.timer = 0;
      b.angle = Math.atan2(player.y - this.y, player.x - this.x);
    } else if (b.stage === 'warn' && b.timer >= c.warnSec) {
      b.stage = 'blow';
      b.timer = 0;
    } else if (b.stage === 'blow') {
      if (this.#inBreath(player)) player.hit(c.caffeine);
      if (b.timer >= c.blowSec) {
        b.stage = 'wait';
        b.timer = 0;
      }
    }
  }

  // 扇形の中にプレイヤーがいるか
  #inBreath(p) {
    const c = cfg.breath;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (d > c.range + p.radius) return false;
    const diff = Math.atan2(p.y - this.y, p.x - this.x) - this.breath.angle;
    const a = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
    return a <= ((c.angleDeg / 2) * Math.PI) / 180;
  }

  #updateCoinRain(dt, player) {
    const c = cfg.coinRain;
    this.rainTimer += dt;
    if (this.rainTimer >= c.intervalSec) {
      this.rainTimer = 0;
      for (let i = 0; i < c.count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * c.spreadRadius;
        this.coins.push({ x: player.x + Math.cos(a) * r, y: player.y + Math.sin(a) * r, t: 0, landed: false });
      }
    }
    for (const coin of this.coins) {
      coin.t += dt;
      const near = Math.hypot(player.x - coin.x, player.y - coin.y);
      if (!coin.landed && coin.t >= c.fallSec) {
        coin.landed = true;
        // 落ちた瞬間に当たったら痛い。当たったコインは消える
        if (near < c.hitRadius + player.radius) {
          player.hit(c.caffeine);
          coin.gone = true;
        }
      } else if (coin.landed && near < c.pickRadius + player.radius) {
        addCoins(c.coins);
        this.picked += c.coins;
        this.sparkles.push({ x: coin.x, y: coin.y, t: 0 });
        coin.gone = true;
      }
    }
    this.coins = this.coins.filter((coin) => !coin.gone && coin.t < c.fallSec + c.lifeSec);
    for (const s of this.sparkles) s.t += dt;
    this.sparkles = this.sparkles.filter((s) => s.t < 0.4);
  }

  draw(ctx) {
    this.#drawBreath(ctx);
    this.#drawCoins(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    this.#drawBody(ctx, this.radius);
    ctx.restore();
  }

  #drawBreath(ctx) {
    const b = this.breath;
    if (b.stage === 'wait') return;
    const c = cfg.breath;
    const half = ((c.angleDeg / 2) * Math.PI) / 180;
    // 予告は薄く、吐いている間は濃く、少し揺らす
    const r = b.stage === 'warn' ? c.range : c.range * (0.9 + 0.1 * Math.sin(b.timer * 40));
    ctx.fillStyle = b.stage === 'warn' ? c.warn : c.mist;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, r, b.angle - half, b.angle + half);
    ctx.closePath();
    ctx.fill();
  }

  #drawCoins(ctx) {
    const c = cfg.coinRain;
    for (const coin of this.coins) {
      if (!coin.landed) {
        // 落ちる場所の影は、落ちるにつれて大きく濃くなる
        const k = Math.min(1, coin.t / c.fallSec);
        ctx.fillStyle = cfg.colors.shadow;
        ctx.beginPath();
        ctx.ellipse(coin.x, coin.y, c.hitRadius * (0.4 + 0.6 * k), c.hitRadius * 0.45 * (0.4 + 0.6 * k), 0, 0, Math.PI * 2);
        ctx.fill();
        drawCoin(ctx, coin.x, coin.y - c.fallHeight * (1 - k), c.size);
      } else {
        // 消える前の 1 秒は点滅する
        const left = c.fallSec + c.lifeSec - coin.t;
        if (left < 1 && Math.floor(left * 8) % 2 === 0) continue;
        drawCoin(ctx, coin.x, coin.y, c.size);
      }
    }
    ctx.fillStyle = '#ffe9a8';
    for (const s of this.sparkles) {
      const d = 6 + s.t * 60;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.fillRect(s.x + Math.cos(a) * d - 2, s.y + Math.sin(a) * d - 2, 4, 4);
      }
    }
  }

  // うろこの竜（3 案の B）。濃い緑の体と翼、クリーム色の角とおなか。目を覚ました顔
  #drawBody(ctx, r) {
    const col = cfg.colors;
    // 足もとの豆コインの小山
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI;
      drawCoin(ctx, Math.cos(a) * r * 0.8, r * 0.75 + Math.sin(a) * r * 0.12 - (i % 3) * r * 0.08, r * 0.14);
    }
    // しっぽ
    ctx.strokeStyle = col.body;
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.5);
    ctx.quadraticCurveTo(-r * 1.3, r * 0.6, -r * 1.15, r * 0.05);
    ctx.stroke();
    // 翼は、ゆっくり羽ばたく
    const s = 1 + Math.sin(this.flap) * 0.06;
    this.#drawWing(ctx, -1, r, s);
    this.#drawWing(ctx, 1, r, s);
    // 体とおなか
    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.7, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.42, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col.bellyLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-r * 0.35, r * 0.05 + i * r * 0.16);
      ctx.lineTo(r * 0.35, r * 0.05 + i * r * 0.16);
    }
    ctx.stroke();
    // 頭と鼻先、角
    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.35, r * 0.32, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    this.#drawHorn(ctx, -r * 0.3, -r * 0.85, r * 0.4, -r * 0.15);
    this.#drawHorn(ctx, r * 0.3, -r * 0.85, r * 0.4, r * 0.15);
    // 目を覚ました、半分開いた目。息を予告している間は、大きく開く
    const open = this.breath.stage === 'wait' ? 0.55 : 1;
    for (const side of [-1, 1]) {
      const ex = side * r * 0.22;
      const ey = -r * 0.6;
      const w = r * 0.11;
      ctx.fillStyle = col.eye;
      ctx.beginPath();
      ctx.ellipse(ex, ey, w, w * 0.8 * open, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col.pupil;
      ctx.beginPath();
      ctx.arc(ex, ey + w * 0.1, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // 重いまぶた
      ctx.fillStyle = col.body;
      ctx.fillRect(ex - w * 1.2, ey - w * 1.3, w * 2.4, w * (1.3 - 0.8 * open));
      ctx.strokeStyle = col.line;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - w * 1.1, ey - w * 0.8 * open);
      ctx.lineTo(ex + w * 1.1, ey - w * 0.8 * open);
      ctx.stroke();
    }
    // 鼻の穴
    ctx.fillStyle = col.line;
    ctx.fillRect(-r * 0.12, -r * 0.38, r * 0.06, r * 0.04);
    ctx.fillRect(r * 0.06, -r * 0.38, r * 0.06, r * 0.04);
  }

  #drawWing(ctx, side, r, s) {
    const col = cfg.colors;
    const w = r * 1.0;
    ctx.save();
    ctx.translate(side * r * 0.45, -r * 0.35);
    ctx.scale(side * s, s);
    ctx.fillStyle = col.body;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.9, -w * 0.7);
    ctx.lineTo(w * 0.8, -w * 0.2);
    ctx.lineTo(w * 1.05, -w * 0.15);
    ctx.lineTo(w * 0.75, w * 0.15);
    ctx.lineTo(w * 0.9, w * 0.3);
    ctx.lineTo(w * 0.15, w * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col.bodyDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.8, -w * 0.2);
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.75, w * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  #drawHorn(ctx, x, y, h, lean) {
    ctx.fillStyle = cfg.colors.horn;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.22, y + h);
    ctx.lineTo(x + lean, y);
    ctx.lineTo(x + h * 0.22, y + h);
    ctx.closePath();
    ctx.fill();
  }
}

// クリアの画面に重ねる、竜の知らせ（挑む・やめる）と、戦いの結果の一言。dragon は game.dragon
export function drawDragonPanel(ctx, dragon, viewW, viewH) {
  const t = cfg.texts;
  const lines = dragon.offer
    ? [t.offerTitle, t.offerText]
    : [dragon.won ? t.win : t.lose, [dragon.treasure ? t.treasure.replace('{n}', dragon.treasure) : '', dragon.picked ? t.pickup.replace('{n}', dragon.picked) : ''].filter(Boolean).join('　')];
  const w = Math.min(640, viewW - 40);
  const h = 92;
  const x = (viewW - w) / 2;
  const y = dragon.offer ? viewH * 0.4 : viewH - h - 24;
  ctx.save();
  ctx.fillStyle = 'rgba(14, 42, 19, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = cfg.colors.horn;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = cfg.colors.belly;
  ctx.font = font(20, true);
  ctx.fillText(lines[0], viewW / 2, y + 32);
  ctx.font = font(15);
  ctx.fillText(lines[1], viewW / 2, y + 64);
  ctx.restore();
}
