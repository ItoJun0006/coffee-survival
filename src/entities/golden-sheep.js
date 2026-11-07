import { CONFIG } from '../config.js';
import { Enemy } from './enemy.js';
import { stage } from '../stage.js';

const cfg = CONFIG.goldenSheep;

// 確認用：?goldenSheep を付けて開くと、3 秒間無傷で出る（仕様 066）
export const debugGolden = new URLSearchParams(location.search).has('goldenSheep');

// このフレームにダメージを受けたか。体当たりなどは無敵時間が新しく始まったことで、
// 吸い取り（まぶたスライム）は、吸い取る敵に触れていることで見分ける
export function tookDamage(player, enemies, lastInvincible) {
  if (player.invincibleTimer > lastInvincible + 1e-6) return true;
  return enemies.some((e) => e.config.drainPerSec && !e.frozen && Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius);
}

// レベル level で経験値を xp 持っているとき、ちょうど levels 回レベルアップできる経験値
export function xpForLevels(level, xp) {
  const { baseXp, xpGrowth, xpGrowthSq } = CONFIG.leveling;
  let sum = -xp;
  for (let i = 0; i < cfg.levels; i++) {
    const n = level - 1 + i;
    sum += baseXp + xpGrowth * n + xpGrowthSq * n * n;
  }
  // 粒に分けて足し直すと、小数の誤差でわずかに届かないことがあるので、少しだけ多めにする
  return sum + 0.001;
}

// 隠し要素「金色の羊」（仕様 066）。ふつうの敵（Enemy）と同じ枠（game.enemies）に入れるので、
// 攻撃の当たり方・凍る・足どめ・押し返し・触れたときのダメージは、ふつうの敵と同じ仕組みを使う。近づくと逃げる
export class GoldenSheep extends Enemy {
  constructor(x, y, strength, appearedAt) {
    super('sheep', x, y, strength);
    this.type = 'goldenSheep';
    // 落とす経験値（xp）は倒したときに決めるので、この羊だけの設定にする
    this.config = { ...cfg, xp: 0 };
    this.radius = cfg.radius;
    this.hp = CONFIG.enemies.sheep.hp * strength.hp * cfg.hpRate;
    this.appearedAt = appearedAt;
    this.leaving = false;
    this.escapeDir = 0;
    this.escapeTimer = 0;
    this.sparkle = 0;
  }

  update(dt, player) {
    const world = stage.world;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const flee = this.leaving || Math.hypot(dx, dy) < cfg.fleeDist;
    let dir;
    if (flee) {
      dir = this.leaving ? Math.atan2(dy, dx) : this.#fleeDir(Math.atan2(dy, dx), world, player, dt);
      this.speed = cfg.fleeSpeed;
    } else {
      dir = Math.atan2(-dy, -dx);
      this.speed = cfg.approachSpeed;
    }
    // 動きそのもの（凍る・足どめ・押し返し）はふつうの敵と同じ。向かう先として、決めた向きの遠くの点を渡す
    super.update(dt, { x: this.x + Math.cos(dir) * 1000, y: this.y + Math.sin(dir) * 1000 });
    this.sparkle += dt * 3;
    if (!this.leaving) {
      this.x = Math.min(world.width, Math.max(0, this.x));
      this.y = Math.min(world.height, Math.max(0, this.y));
    }
  }

  // 壁に向かうときは壁に沿ってよけ、角に追い詰められたら、プレイヤーとのずれが小さい方の壁に沿って escapeSec 走り抜ける
  #fleeDir(away, world, player, dt) {
    if (this.escapeTimer > 0) {
      this.escapeTimer -= dt;
      return this.escapeDir;
    }
    const m = this.radius * 2;
    let vx = Math.cos(away);
    let vy = Math.sin(away);
    if ((this.x < m && vx < 0) || (this.x > world.width - m && vx > 0)) vx = 0;
    if ((this.y < m && vy < 0) || (this.y > world.height - m && vy > 0)) vy = 0;
    if (vx === 0 && vy === 0) {
      const alongX = Math.abs(player.x - this.x) < Math.abs(player.y - this.y);
      this.escapeDir = alongX ? (this.x < world.width / 2 ? 0 : Math.PI) : (this.y < world.height / 2 ? Math.PI / 2 : -Math.PI / 2);
      this.escapeTimer = cfg.escapeSec;
      return this.escapeDir;
    }
    return Math.atan2(vy, vx);
  }

  // ふつうの羊と同じ形（6 つの丸の毛と顔）を金色で描き、まわりにきらめきを瞬かせる
  draw(ctx) {
    const r = this.radius;
    const l = cfg.look;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = l.wool;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = l.face;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = l.wool;
    ctx.lineWidth = Math.max(2, CONFIG.pixelArt.enabled ? CONFIG.pixelArt.size : 0);
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.18 - 4, r * 0.05);
      ctx.lineTo(side * r * 0.18 + 4, r * 0.05);
    }
    ctx.stroke();
    // 3 つのきらめきが、順に大きくなったり小さくなったりする
    ctx.fillStyle = l.spark;
    [[-0.9, -0.8], [1.0, -0.3], [0.5, 0.95]].forEach(([x, y], i) => {
      const s = r * 0.1 * (0.5 + 0.5 * Math.abs(Math.sin(this.sparkle + i * 2)));
      ctx.fillRect(r * x - s / 2, r * y - s * 1.5, s, s * 3);
      ctx.fillRect(r * x - s * 1.5, r * y - s / 2, s * 3, s);
    });
    if (this.frozen) {
      ctx.fillStyle = 'rgba(190, 230, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
