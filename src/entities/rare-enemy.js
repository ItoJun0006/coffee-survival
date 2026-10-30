import { CONFIG } from '../config.js';
import { Enemy } from './enemy.js';
import { stage } from '../stage.js';

const cfg = CONFIG.rareEnemy;

// 確認用：?rare を付けて開くと、1 面の 3 秒後に必ず出る（仕様 013 FR-009）
const debugRare = new URLSearchParams(location.search).has('rare');

// プレイを始めたときに、レア敵が出る時刻を決める。出ないプレイと、1 面以外は null（仕様 013 FR-002）
export function rollRareAt(stageId) {
  if (stageId !== 'main') return null;
  if (debugRare) return 3;
  if (Math.random() >= cfg.chance) return null;
  return cfg.appearFromSec + Math.random() * (cfg.appearToSec - cfg.appearFromSec);
}

// レア敵「まくらウサギ」（仕様 013）。ふつうの敵（Enemy）と同じ枠（game.enemies）に入れるので、
// 攻撃の当たり方・凍る・足どめ・押し返し・触れたときのダメージは、ふつうの敵と同じ仕組みを使う。
// 動き方だけ、プレイヤーとの距離で「近づく・うろうろ・逃げる」を切り替える
export class RareEnemy extends Enemy {
  // strength は出た時点の手下の強さの倍率（game の #enemyStrength）。体力は羊の体力 × hpRate
  constructor(x, y, strength, appearedAt) {
    super('sheep', x, y, strength);
    this.type = 'rare';
    this.config = cfg;
    this.radius = cfg.radius;
    this.hp = CONFIG.enemies.sheep.hp * strength.hp * cfg.hpRate;
    this.appearedAt = appearedAt;
    this.leaving = false;
    this.mode = 'approach';
    this.wanderDir = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.breath = 0;
    // 角から抜け出すときの向きと、残りの時間
    this.escapeDir = 0;
    this.escapeTimer = 0;
  }

  update(dt, player) {
    const world = stage.world;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    // 去っている途中は、いつもプレイヤーから離れる向きに走る
    this.mode = this.leaving || d < cfg.fleeDist ? 'flee' : d > cfg.approachDist ? 'approach' : 'wander';
    let dir;
    if (this.mode === 'approach') {
      dir = Math.atan2(-dy, -dx);
      this.speed = cfg.approachSpeed;
    } else if (this.mode === 'flee') {
      dir = this.leaving ? Math.atan2(dy, dx) : this.#fleeDir(Math.atan2(dy, dx), world, player, dt);
      this.speed = cfg.fleeSpeed;
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = cfg.wanderTurnSec;
        // 距離を保つよう、プレイヤーのまわりを回る向きに少しぶれを足す
        this.wanderDir = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2) + (Math.random() - 0.5);
      }
      dir = this.wanderDir;
      this.speed = cfg.wanderSpeed;
    }
    // 動きそのもの（凍る・足どめ・押し返し）はふつうの敵と同じ。向かう先として、決めた向きの遠くの点を渡す
    super.update(dt, { x: this.x + Math.cos(dir) * 1000, y: this.y + Math.sin(dir) * 1000 });
    this.breath += dt * 2;
    // 去っている途中でなければ、マップの外には出ない
    if (!this.leaving) {
      this.x = Math.min(world.width, Math.max(0, this.x));
      this.y = Math.min(world.height, Math.max(0, this.y));
    }
  }

  // 逃げる向き。壁に向かうときは、壁に沿ってよける（マップの外に出ない）。
  // 角に追い詰められたら、プレイヤーとのずれが小さい方の壁に沿って、escapeSec のあいだ走り抜ける（角で止まらない）
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
      this.escapeDir = alongX
        ? (this.x < world.width / 2 ? 0 : Math.PI)
        : (this.y < world.height / 2 ? Math.PI / 2 : -Math.PI / 2);
      this.escapeTimer = cfg.escapeSec;
      return this.escapeDir;
    }
    return Math.atan2(vy, vx);
  }

  draw(ctx) {
    const look = cfg.look;
    const r = this.radius;
    const s = 1 + Math.sin(this.breath) * look.breath;
    const w = r * look.bodyW * s;
    const h = (r * look.bodyH) / s;
    ctx.save();
    ctx.translate(this.x, this.y);
    // 長い 2 本の耳（内側は濃い水色）
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * w * 0.22, -h * 0.45);
      ctx.rotate(side * 0.18);
      ctx.fillStyle = look.ear;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.75, r * 0.28, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.earInner;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.7, r * 0.13, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // まくらの体（角の丸い横長の四角）と、内側の点線の縫い目
    ctx.fillStyle = look.body;
    roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.45);
    ctx.fill();
    ctx.strokeStyle = look.seam;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    roundRect(ctx, -w / 2 + r * 0.22, -h / 2 + r * 0.22, w - r * 0.44, h - r * 0.44, r * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
    // 眠そうな閉じた目と、ほんのり赤いほっぺ
    ctx.strokeStyle = look.eye;
    ctx.lineWidth = Math.max(2, CONFIG.pixelArt.enabled ? CONFIG.pixelArt.size : 0);
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * r * 0.42 - r * 0.18, -r * 0.05);
      ctx.quadraticCurveTo(side * r * 0.42, r * 0.1, side * r * 0.42 + r * 0.18, -r * 0.05);
    }
    ctx.stroke();
    ctx.fillStyle = look.cheek;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.7, r * 0.22, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.frozen) {
      ctx.fillStyle = 'rgba(190, 230, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// レア敵が画面の外にいる間、画面の端に向きを示す矢印を描く（HUD の層。仕様 013 research R6）
export function drawRareArrow(ctx, rare, player, viewW, viewH) {
  const dx = rare.x - player.x;
  const dy = rare.y - player.y;
  if (Math.abs(dx) < viewW / 2 && Math.abs(dy) < viewH / 2) return;
  const { size, margin } = cfg.look.arrow;
  const a = Math.atan2(dy, dx);
  // 向きの線と、画面の枠（少し内側）が交わる所
  const hw = viewW / 2 - margin;
  const hh = viewH / 2 - margin;
  const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
  ctx.save();
  ctx.translate(viewW / 2 + Math.cos(a) * k, viewH / 2 + Math.sin(a) * k);
  ctx.rotate(a);
  ctx.fillStyle = cfg.look.body;
  ctx.strokeStyle = cfg.look.eye;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, -size * 0.7);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.6, size * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
