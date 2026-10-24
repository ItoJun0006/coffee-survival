import { CONFIG } from '../config.js';

const cfg = CONFIG.boss;

// ラスボス：眠気の化身。HP が減るほど使える攻撃が増え、攻撃間隔も短くなる
export class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = cfg.radius;
    this.hp = cfg.hp;
    this.eyeTimer = 0;
    this.timers = { yawn: 0, summon: 0 };
    this.puffAngle = 0;
  }

  // ボスの体力のバーに出す名前（まどろみ宝竜と同じ枠で使う。仕様 061）
  get name() {
    return cfg.name;
  }

  get dead() {
    return this.hp <= 0;
  }

  get hpRatio() {
    return Math.max(0, this.hp / cfg.hp);
  }

  // 1 始まりの形態番号
  get phase() {
    return cfg.phases.findIndex((p) => this.hpRatio > p.minHpRatio || p.minHpRatio === 0) + 1;
  }

  has(ability) {
    return cfg.phases[this.phase - 1].abilities.includes(ability);
  }

  get eyeOpen() {
    return this.eyeTimer % cfg.eyeCycleSec > cfg.eyeCycleSec - cfg.eyeOpenSec;
  }

  damage(amount) {
    this.hp -= this.eyeOpen ? amount * cfg.eyeOpenMultiplier : amount;
  }

  update(dt, target) {
    const d = Math.hypot(target.x - this.x, target.y - this.y) || 1;
    this.x += ((target.x - this.x) / d) * cfg.speed * dt;
    this.y += ((target.y - this.y) / d) * cfg.speed * dt;
    this.eyeTimer += dt;
    this.puffAngle += dt * 0.5;
    for (const k of Object.keys(this.timers)) this.timers[k] += dt;
  }

  // 攻撃の発動タイミングになったら true を返してタイマーを戻す
  consume(ability) {
    if (!this.has(ability)) return false;
    const interval = cfg[ability].intervalSec / (1 + 0.3 * (this.phase - 1));
    if (this.timers[ability] < interval) return false;
    this.timers[ability] = 0;
    return true;
  }

  draw(ctx) {
    const r = this.radius;
    const shade = [ '#8c7fb0', '#6e5f99', '#54447f' ][this.phase - 1];
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.eyeOpen) {
      ctx.fillStyle = 'rgba(255, 220, 150, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = shade;
    for (let i = 0; i < 9; i++) {
      const a = this.puffAngle + (i / 9) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
    ctx.fill();

    // 半分閉じた大きな目。開いている間だけ瞳が見える
    const open = this.eyeOpen ? 1 : 0.15;
    ctx.fillStyle = '#f4efe6';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.45, r * 0.3 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.eyeOpen) {
      ctx.fillStyle = '#2a1f3d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a1f3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.45, r * 0.3 * open, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
