import { CONFIG } from '../config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.player.radius;
    this.caffeine = CONFIG.player.maxCaffeine;
  }

  update(dt, dir) {
    const { speed, caffeineDecayPerSec, maxCaffeine } = CONFIG.player;
    const { width, height } = CONFIG.world;
    this.x = Math.min(width - this.radius, Math.max(this.radius, this.x + dir.x * speed * dt));
    this.y = Math.min(height - this.radius, Math.max(this.radius, this.y + dir.y * speed * dt));
    this.caffeine = Math.min(maxCaffeine, this.caffeine - caffeineDecayPerSec * dt);
  }

  get alive() {
    return this.caffeine > 0;
  }

  draw(ctx) {
    ctx.fillStyle = CONFIG.colors.player;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
