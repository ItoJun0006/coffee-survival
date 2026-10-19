export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);

// 点 p と線分 (x1, y1)-(x2, y2) の距離
export function distToSegment(p, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / len2));
  return Math.hypot(p.x - (x1 + dx * t), p.y - (y1 + dy * t));
}

// 攻撃の基底クラス。game は Game のインスタンス
export class Weapon {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.timer = 0;
  }

  get name() {
    return this.config.name;
  }

  // 発動間隔が経過していれば true。発動したら this.timer = 0 に戻す
  tick(dt) {
    this.timer += dt;
    return this.timer >= this.config.intervalSec;
  }

  hit(target, damage = this.config.damage) {
    this.game.dealDamage(target, damage, this.config.element);
  }

  update() {}

  // 敵より下に描くもの（床に広がる範囲など）
  drawBelow() {}

  draw() {}
}

// 同じ相手には cooldownSec ごとに 1 回だけ当たる
export class HitTracker {
  constructor(cooldownSec) {
    this.cooldownSec = cooldownSec;
    this.last = new WeakMap();
  }

  tryHit(target, now) {
    const t = this.last.get(target);
    if (t !== undefined && now - t < this.cooldownSec) return false;
    this.last.set(target, now);
    return true;
  }
}

// まっすぐ飛ぶ弾。range だけ進むと消える
export class Projectile {
  constructor(x, y, angle, speed, radius, range) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = radius;
    this.remaining = range;
    this.spent = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.remaining -= Math.hypot(this.vx, this.vy) * dt;
    if (this.remaining <= 0) this.spent = true;
  }
}
