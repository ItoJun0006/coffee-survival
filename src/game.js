import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player } from './entities/player.js';
import { Bean } from './entities/bean.js';
import { Enemy } from './entities/enemy.js';
import { Boss } from './entities/boss.js';
import { YawnWave } from './entities/yawn-wave.js';
import { WEAPON_ORDER } from './weapons/index.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const formatTime = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.camera = { x: 0, y: 0 };
    // ?boss を付けて開くとボス出現直前から始まる（動作確認用）
    // ?level=N を付けて開くとレベル N から始まる（動作確認用）
    const params = new URLSearchParams(location.search);
    this.debugBoss = params.has('boss');
    this.debugLevel = Number(params.get('level')) || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // 別のタブやアプリに切り替えたら自動でポーズする
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.#pause();
    });
    this.reset();
    this.state = 'title';
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
    this.enemies = [];
    this.waves = [];
    this.boss = null;
    this.bossAppearedAt = 0;
    this.beanTimer = 0;
    this.enemyTimer = 0;
    this.moveDir = { x: 0, y: 0 };
    this.time = this.debugBoss ? CONFIG.boss.timeSec - 3 : 0;
    this.state = 'playing';
    this.level = 1;
    this.xp = 0;
    this.damageBonus = 1;
    this.weapons = [new WEAPON_ORDER[0](this)];
    this.notice = null;
    for (let i = 1; i < this.debugLevel; i++) this.#levelUp();
    this.notice = null;
  }

  get xpToNext() {
    const { baseXp, xpGrowth } = CONFIG.leveling;
    return baseXp + xpGrowth * (this.level - 1);
  }

  #gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.#levelUp();
    }
  }

  // 次の攻撃を手に入れる。全部そろった後は攻撃力が上がる
  #levelUp() {
    this.level += 1;
    const Next = WEAPON_ORDER[this.weapons.length];
    let text;
    if (Next) {
      const weapon = new Next(this);
      this.weapons.push(weapon);
      text = `${weapon.name} を手に入れた！`;
    } else {
      this.damageBonus += CONFIG.leveling.damageBonusPerLevel;
      text = `攻撃力アップ（×${this.damageBonus.toFixed(1)}）`;
    }
    this.notice = { title: `レベル ${this.level}`, text, until: this.time + 2.5 };
  }

  // ---- 攻撃から使うヘルパー ----

  targets() {
    const list = this.enemies.filter((e) => !e.dead);
    if (this.boss && !this.boss.dead) list.push(this.boss);
    return list;
  }

  nearestTarget(range) {
    let best = null;
    let bestD = range;
    for (const t of this.targets()) {
      const d = dist(t, this.player) - t.radius;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  targetsInCircle(x, y, r) {
    return this.targets().filter((t) => Math.hypot(t.x - x, t.y - y) < r + t.radius);
  }

  dealDamage(target, amount, element) {
    let m = this.damageBonus;
    if (target === this.boss) m *= CONFIG.boss.elementMultiplier[element] ?? 1;
    target.damage(amount * m);
  }

  // ボスは凍らず、押し返されない
  freeze(target, sec) {
    if (target !== this.boss) target.freeze(sec);
  }

  knockback(target, vx, vy) {
    if (target !== this.boss) target.knockback(vx, vy);
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.update(dt);
      this.input.endFrame();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    if (this.state === 'title') {
      if (this.input.consumeClick()) this.state = 'playing';
      return;
    }
    if (this.state === 'paused') {
      this.#updatePauseMenu();
      return;
    }
    if (this.state !== 'playing') {
      if (this.input.consumeClick()) this.reset();
      return;
    }
    this.input.consumeClick();
    if (this.input.wasPressed('Escape', 'KeyP')) {
      this.#pause();
      return;
    }

    this.time += dt;
    if (!this.boss && this.time >= CONFIG.boss.timeSec) this.#spawnBoss();

    this.#updatePlayer(dt);
    this.#spawnBeans(dt);
    if (!this.boss) this.#spawnEnemies(dt);
    this.#updateEnemies(dt);
    if (this.boss) this.#updateBoss(dt);
    for (const w of this.weapons) w.update(dt);
    this.#removeDeadEnemies();
    this.#collectBeans();

    if (!this.player.alive) this.state = 'gameover';
    else if (this.boss?.dead) this.state = 'clear';

    this.camera.x = this.player.x - this.viewW / 2;
    this.camera.y = this.player.y - this.viewH / 2;
  }

  #pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pauseIndex = 0;
  }

  // ポーズメニューの操作。矢印キーで選んで Space / Enter で決定、Esc / P で再開
  #updatePauseMenu() {
    const items = this.#pauseMenuItems();
    if (this.input.wasPressed('ArrowUp', 'KeyW')) this.pauseIndex = (this.pauseIndex + items.length - 1) % items.length;
    if (this.input.wasPressed('ArrowDown', 'KeyS')) this.pauseIndex = (this.pauseIndex + 1) % items.length;
    const clicked = this.input.consumeClick();
    if (this.input.wasPressed('Escape', 'KeyP')) {
      this.state = 'playing';
      return;
    }
    if (!clicked) return;
    const pos = this.input.clickPos;
    const item = pos ? items.find((it) => inRect(pos, it)) : items[this.pauseIndex];
    item?.action();
  }

  #pauseMenuItems() {
    const w = Math.min(240, this.viewW - 64);
    const h = 48;
    const x = (this.viewW - w) / 2;
    const y = this.viewH / 2 - 10;
    return [
      { label: '再開', x, y, w, h, action: () => { this.state = 'playing'; } },
      { label: 'タイトルへ戻る', x, y: y + h + 16, w, h, action: () => { this.reset(); this.state = 'title'; } },
    ];
  }

  #updatePlayer(dt) {
    const input = this.input.direction();
    if (this.boss?.has('lullaby')) {
      // 子守唄：入力が遅れて反映される
      const k = Math.min(1, dt / CONFIG.boss.lullaby.lagSec);
      this.moveDir = {
        x: this.moveDir.x + (input.x - this.moveDir.x) * k,
        y: this.moveDir.y + (input.y - this.moveDir.y) * k,
      };
    } else {
      this.moveDir = input;
    }

    const push = { x: 0, y: 0 };
    if (this.boss?.has('pull')) {
      // 二度寝の誘い：ボスに吸い寄せられる
      const d = dist(this.boss, this.player) || 1;
      push.x = ((this.boss.x - this.player.x) / d) * CONFIG.boss.pull.strength;
      push.y = ((this.boss.y - this.player.y) / d) * CONFIG.boss.pull.strength;
    }
    this.player.update(dt, this.moveDir, push);
  }

  #spawnBeans(dt) {
    const { spawnIntervalSec, spawnRadius, maxCount } = CONFIG.bean;
    this.beanTimer += dt;
    while (this.beanTimer >= spawnIntervalSec) {
      this.beanTimer -= spawnIntervalSec;
      if (this.beans.length >= maxCount) continue;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spawnRadius;
      const x = clamp(this.player.x + Math.cos(a) * r, 0, CONFIG.world.width);
      const y = clamp(this.player.y + Math.sin(a) * r, 0, CONFIG.world.height);
      // 夢の世界：一部の豆が偽物になる
      const fake = !!this.boss?.has('dream') && Math.random() < CONFIG.boss.dream.fakeRatio;
      this.beans.push(new Bean(x, y, fake));
    }
  }

  #collectBeans() {
    const p = this.player;
    this.beans = this.beans.filter((b) => {
      if (dist(b, p) >= b.radius + p.radius) return true;
      if (b.fake) {
        p.drain(CONFIG.bean.fakeCaffeine);
      } else {
        p.heal(CONFIG.bean.caffeine);
        this.#gainXp(CONFIG.leveling.xpPerBean);
      }
      return false;
    });
  }

  #spawnEnemies(dt) {
    const s = CONFIG.spawn;
    const t = Math.min(1, this.time / s.rampSec);
    const interval = s.startIntervalSec + (s.minIntervalSec - s.startIntervalSec) * t;
    this.enemyTimer += dt;
    while (this.enemyTimer >= interval) {
      this.enemyTimer -= interval;
      if (this.enemies.length < s.maxCount) this.#spawnEnemy(this.#pickEnemyType());
    }
  }

  #pickEnemyType() {
    const types = Object.entries(CONFIG.enemies).filter(([, c]) => this.time >= c.appearSec);
    let roll = Math.random() * types.reduce((sum, [, c]) => sum + c.weight, 0);
    for (const [type, c] of types) {
      roll -= c.weight;
      if (roll <= 0) return type;
    }
    return types[0][0];
  }

  // 既定では画面のすぐ外に出現させる
  #spawnEnemy(type, cx = this.player.x, cy = this.player.y, distance = Math.hypot(this.viewW, this.viewH) / 2 + 40) {
    const a = Math.random() * Math.PI * 2;
    const x = clamp(cx + Math.cos(a) * distance, 0, CONFIG.world.width);
    const y = clamp(cy + Math.sin(a) * distance, 0, CONFIG.world.height);
    this.enemies.push(new Enemy(type, x, y));
  }

  #updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.update(dt, p);
      if (e.frozen || dist(e, p) >= e.radius + p.radius) continue;
      const c = e.config;
      if (c.contactCaffeine) p.hit(c.contactCaffeine);
      if (c.drainPerSec) p.drain(c.drainPerSec * dt);
      if (c.slowSec) p.slow(c.slowSec, c.slowFactor);
    }
  }

  #spawnBoss() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.min(this.viewW, this.viewH) / 2 + CONFIG.boss.radius;
    this.boss = new Boss(
      clamp(this.player.x + Math.cos(a) * d, 0, CONFIG.world.width),
      clamp(this.player.y + Math.sin(a) * d, 0, CONFIG.world.height),
    );
    this.bossAppearedAt = this.time;
  }

  #updateBoss(dt) {
    const boss = this.boss;
    const cfg = CONFIG.boss;
    const p = this.player;
    boss.update(dt, p);

    if (boss.consume('yawn')) this.waves.push(new YawnWave(boss.x, boss.y));
    if (boss.consume('summon')) {
      for (let i = 0; i < cfg.summon.count; i++) this.#spawnEnemy('sheep', boss.x, boss.y, boss.radius + 30);
    }

    for (const w of this.waves) {
      w.update(dt);
      if (w.hits(p)) p.hit(cfg.yawn.caffeine);
    }
    this.waves = this.waves.filter((w) => w.alive);

    if (dist(boss, p) < boss.radius + p.radius) p.hit(cfg.contactCaffeine);
  }

  // 倒した敵はときどき豆を落とす
  #removeDeadEnemies() {
    const { enemyDropChance, maxDroppedBeans } = CONFIG.leveling;
    this.enemies = this.enemies.filter((e) => {
      if (!e.dead) return true;
      if (Math.random() < enemyDropChance && this.beans.length < CONFIG.bean.maxCount + maxDroppedBeans) {
        this.beans.push(new Bean(e.x, e.y));
      }
      return false;
    });
  }

  draw() {
    const { ctx } = this;
    ctx.fillStyle = CONFIG.colors.ground;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    this.#drawGrid();
    for (const w of this.weapons) w.drawBelow(ctx);
    for (const b of this.beans) b.draw(ctx);
    for (const w of this.waves) w.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.boss && !this.boss.dead) this.boss.draw(ctx);
    this.player.draw(ctx);
    for (const w of this.weapons) w.draw(ctx);
    ctx.restore();

    if (this.state === 'clear') this.#drawDawn();
    else this.#drawDarkness();

    if (this.state === 'title') {
      this.#drawTitle();
      return;
    }
    this.#drawHud();
    if (this.state === 'paused') this.#drawPauseMenu();
    this.#drawOverlay();
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

  // 夜が深まる演出。まぶたの帳の間はプレイヤーの周り以外が暗くなる
  #drawDarkness() {
    const { ctx } = this;
    if (this.boss?.has('curtain')) {
      const px = this.player.x - this.camera.x;
      const py = this.player.y - this.camera.y;
      const r = CONFIG.boss.curtain.visionRadius;
      const g = ctx.createRadialGradient(px, py, r * 0.5, px, py, r);
      g.addColorStop(0, 'rgba(5, 3, 15, 0)');
      g.addColorStop(1, 'rgba(5, 3, 15, 0.93)');
      ctx.fillStyle = g;
    } else {
      const a = CONFIG.night.maxDarkness * Math.min(1, this.time / CONFIG.boss.timeSec);
      ctx.fillStyle = `rgba(5, 3, 20, ${a})`;
    }
    ctx.fillRect(0, 0, this.viewW, this.viewH);
  }

  #drawDawn() {
    const { ctx } = this;
    const g = ctx.createLinearGradient(0, this.viewH, 0, 0);
    g.addColorStop(0, 'rgba(255, 170, 90, 0.55)');
    g.addColorStop(1, 'rgba(255, 240, 210, 0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
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

    ctx.fillStyle = c.hudBg;
    ctx.fillRect(x, y + 22, w, 5);
    ctx.fillStyle = c.xpBar;
    ctx.fillRect(x, y + 22, w * (this.xp / this.xpToNext), 5);

    ctx.fillStyle = c.text;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Lv ${this.level}   カフェイン  ${Math.max(0, Math.ceil(this.player.caffeine))}`, x, y + 34);
    ctx.fillText(`生存時間  ${formatTime(this.time)}`, x, y + 54);
    if (!this.boss) ctx.fillText(`眠気が来るまで  ${formatTime(CONFIG.boss.timeSec - this.time)}`, x, y + 74);

    // 手に入れた攻撃の一覧
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.6)';
    this.weapons.forEach((wp, i) => ctx.fillText(`・${wp.name}`, x, y + 98 + i * 14));

    this.#drawNotice();
    if (this.boss && !this.boss.dead) this.#drawBossHud();
  }

  #drawNotice() {
    if (!this.notice || this.time > this.notice.until) return;
    const { ctx } = this;
    const k = Math.min(1, (this.notice.until - this.time) / 0.5);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.xpBar;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(this.notice.title, this.viewW / 2, this.viewH * 0.18);
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(this.notice.text, this.viewW / 2, this.viewH * 0.18 + 28);
    ctx.restore();
  }

  #drawBossHud() {
    const { ctx } = this;
    const c = CONFIG.colors;
    const x = 16;
    const w = this.viewW - 32;
    const y = this.viewH - 40;

    ctx.fillStyle = c.text;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${CONFIG.boss.name}${this.boss.eyeOpen ? '  ― 目が開いた！' : ''}`, x, y - 4);
    ctx.fillStyle = c.hudBg;
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = c.bossBar;
    ctx.fillRect(x, y, w * this.boss.hpRatio, 12);

    if (this.time - this.bossAppearedAt < 3) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`${CONFIG.boss.name} が現れた`, this.viewW / 2, this.viewH * 0.3);
    }
  }

  // 起動時のタイトル画面。ゲームの場面を背景に、名前とスタート案内を重ねる
  #drawTitle() {
    const { ctx } = this;
    const c = CONFIG.colors;
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillStyle = c.hudBar;
    ctx.fillText(CONFIG.title.name, cx, cy - 60);

    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = c.text;
    ctx.fillText(CONFIG.title.subtitle, cx, cy - 15);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('珈琲豆を拾ってカフェインを保ち、朝まで生き延びろ', cx, cy + 20);

    // スタート案内はゆっくり点滅させる
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = c.xpBar;
    ctx.fillText('クリック / Space でスタート', cx, cy + 80);
    ctx.globalAlpha = 1;
  }

  #drawPauseMenu() {
    const { ctx } = this;
    const c = CONFIG.colors;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = c.text;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('ポーズ中', this.viewW / 2, this.viewH / 2 - 60);

    ctx.font = 'bold 18px system-ui, sans-serif';
    this.#pauseMenuItems().forEach((it, i) => {
      const selected = i === this.pauseIndex;
      ctx.fillStyle = selected ? c.hudBar : c.hudBg;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = selected ? '#3b2418' : c.text;
      ctx.fillText(it.label, it.x + it.w / 2, it.y + it.h / 2);
    });
  }

  #drawOverlay() {
    if (this.state === 'playing' || this.state === 'paused') return;
    const { ctx } = this;
    const cleared = this.state === 'clear';
    if (!cleared) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
    ctx.fillStyle = cleared ? '#3b2418' : CONFIG.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(cleared ? '朝が来た！' : '眠りに落ちた…', this.viewW / 2, this.viewH / 2 - 30);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`生存時間  ${formatTime(this.time)}`, this.viewW / 2, this.viewH / 2 + 10);
    ctx.fillText('クリック / Space でもう一度', this.viewW / 2, this.viewH / 2 + 40);
  }
}
