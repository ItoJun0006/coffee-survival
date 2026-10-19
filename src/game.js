import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player } from './entities/player.js';
import { Bean } from './entities/bean.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = { x: 0, y: 0 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.reset();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  reset() {
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2);
    this.beans = [];
    this.spawnTimer = 0;
    this.time = 0;
    this.state = 'playing';
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    if (this.state === 'gameover') {
      if (this.input.consumeTap()) this.reset();
      return;
    }
    this.input.consumeTap();

    this.time += dt;
    this.player.update(dt, this.input.direction());
    this.#spawnBeans(dt);
    this.#collectBeans();

    if (!this.player.alive) this.state = 'gameover';

    this.camera.x = this.player.x - this.viewW / 2;
    this.camera.y = this.player.y - this.viewH / 2;
  }

  #spawnBeans(dt) {
    const { spawnIntervalSec, maxCount } = CONFIG.bean;
    this.spawnTimer += dt;
    while (this.spawnTimer >= spawnIntervalSec) {
      this.spawnTimer -= spawnIntervalSec;
      if (this.beans.length >= maxCount) continue;
      const { width, height } = CONFIG.world;
      this.beans.push(new Bean(Math.random() * width, Math.random() * height));
    }
  }

  #collectBeans() {
    const p = this.player;
    this.beans = this.beans.filter((b) => {
      const hit = Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius;
      if (hit) p.caffeine = Math.min(CONFIG.player.maxCaffeine, p.caffeine + CONFIG.bean.caffeine);
      return !hit;
    });
  }

  draw() {
    const { ctx } = this;
    const c = CONFIG.colors;
    ctx.fillStyle = c.ground;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    this.#drawGrid();
    for (const b of this.beans) b.draw(ctx);
    this.player.draw(ctx);
    ctx.restore();

    this.#drawStick();
    this.#drawHud();
  }

  #drawGrid() {
    const { ctx } = this;
    const step = 80;
    ctx.strokeStyle = CONFIG.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CONFIG.world.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.world.height);
    }
    for (let y = 0; y <= CONFIG.world.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.world.width, y);
    }
    ctx.stroke();
  }

  #drawStick() {
    const s = this.input.stick;
    if (!s.active) return;
    const { ctx } = this;
    const r = this.input.stickRadius;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(s.originX, s.originY, r, 0, Math.PI * 2);
    ctx.fill();
    const d = this.input.direction();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(s.originX + d.x * r, s.originY + d.y * r, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  #drawHud() {
    const { ctx } = this;
    const c = CONFIG.colors;
    const ratio = Math.max(0, this.player.caffeine / CONFIG.player.maxCaffeine);
    const x = 16;
    const y = 16;
    const w = Math.min(240, this.viewW - 32);

    ctx.fillStyle = c.hudBg;
    ctx.fillRect(x, y, w, 18);
    ctx.fillStyle = c.hudBar;
    ctx.fillRect(x, y, w * ratio, 18);

    ctx.fillStyle = c.text;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`カフェイン  ${Math.ceil(this.player.caffeine)}`, x, y + 24);
    ctx.fillText(`生存時間  ${this.time.toFixed(1)}s`, x, y + 44);

    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.fillStyle = c.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText('カフェイン切れ…', this.viewW / 2, this.viewH / 2 - 20);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('タップ / Space でリトライ', this.viewW / 2, this.viewH / 2 + 20);
      ctx.textAlign = 'left';
    }
  }
}
