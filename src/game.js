import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Player } from './entities/player.js';
import { Bean } from './entities/bean.js';
import { XpOrb } from './entities/xp-orb.js';
import { Enemy } from './entities/enemy.js';
import { Boss } from './entities/boss.js';
import { YawnWave } from './entities/yawn-wave.js';
import { DefeatEffect } from './entities/defeat-effect.js';
import { WEAPON_ORDER } from './weapons/index.js';
import { BeanShotgun } from './weapons/bean-shotgun.js';
import { loadLastCharacter, saveLastCharacter } from './characters.js';
import { unlock, recordLaunch } from './unlocks.js';
import { CharacterSelect } from './character-select.js';
import { LevelUpMenu, levelLabel } from './level-up-menu.js';
import { drawItemIcon } from './item-icons.js';
import { sound } from './sound.js';
import { font } from './font.js';

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
    this.character = loadLastCharacter();
    this.characterSelect = new CharacterSelect();
    this.levelUpMenu = new LevelUpMenu();
    this.titleImage = new Image();
    this.titleImage.src = CONFIG.title.image;
    sound.init();
    // 画面の上に数秒出す知らせ（キャラの解放など）。ゲームの時間ではなく実際の時間で消える
    this.toasts = [];
    this.#checkUnlocks('launches', recordLaunch());
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
    sound.setMode('normal');
    sound.startMusic();
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2, this.character);
    this.beans = [];
    this.xpOrbs = [];
    this.enemies = [];
    this.waves = [];
    this.effects = [];
    this.boss = null;
    this.bossAppearedAt = 0;
    this.beanTimer = 0;
    this.enemyTimer = 0;
    this.moveDir = { x: 0, y: 0 };
    this.time = this.debugBoss ? CONFIG.boss.timeSec - 3 : 0;
    this.state = 'playing';
    this.level = 1;
    this.xp = 0;
    // ボーナスで上がる攻撃力。キャラの攻撃力の倍率は characterDamageRate に分けて持つ
    this.damageBonus = 1;
    this.items = [];
    const StartWeapon = this.character.startWeapon === 'beanShotgun' ? BeanShotgun : WEAPON_ORDER[0];
    this.weapons = [new StartWeapon(this)];
    this.pendingLevelUps = 0;
    this.#applyCharacterStats();
    // 動作確認用の ?level=N は、まだ持っていない攻撃を優先して自動で選ぶ
    for (let i = 1; i < this.debugLevel; i++) {
      this.level += 1;
      this.#applyCharacterStats();
      const choices = this.#levelUpChoices();
      this.#applyChoice(choices.find((c) => c.isNew && c.kind === 'weapon') ?? choices[0] ?? this.#bonusChoices()[1]);
    }
    this.notice = null;
  }

  get xpToNext() {
    const { baseXp, xpGrowth } = CONFIG.leveling;
    return baseXp + xpGrowth * (this.level - 1);
  }

  #gainXp(amount) {
    this.xp += amount;
    const before = this.level;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.pendingLevelUps += 1;
    }
    if (this.level > before) {
      this.#applyCharacterStats();
      sound.play('levelUp');
      if (this.state === 'playing') this.#openLevelUp();
    }
  }

  // ---- ステータス強化アイテムの効果 ----

  #itemLevel(id) {
    return this.items.find((it) => it.id === id)?.level ?? 0;
  }

  // 範囲アップ：弾と範囲の大きさの倍率
  get areaRate() {
    return 1 + CONFIG.items.area.perLevel * this.#itemLevel('area');
  }

  // 発生頻度アップ：攻撃の間隔の倍率
  get frequencyRate() {
    return 1 - CONFIG.items.frequency.perLevel * this.#itemLevel('frequency');
  }

  get powerRate() {
    return 1 + CONFIG.items.power.perLevel * this.#itemLevel('power');
  }

  get xpRate() {
    return 1 + CONFIG.items.xp.perLevel * this.#itemLevel('xp');
  }

  // ---- レベルアップの候補 ----
  // 候補は { kind, name, desc, element, level（今の Lv。新しいものは 0）, isNew, apply } の形にそろえる。
  // apply は選んだときの処理で、画面に出す知らせの文を返す

  // 攻撃とアイテムの候補。持てる数の上限に達していたら、新しいものは出さない
  #levelUpChoices() {
    const { max } = CONFIG.weaponLevels;
    const slots = CONFIG.slots;
    const weapons = WEAPON_ORDER.flatMap((W) => {
      const owned = this.weapons.find((w) => w instanceof W);
      if (owned) return owned.level < max ? [this.#weaponChoice(owned, false)] : [];
      return this.weapons.length < slots.weapons ? [this.#weaponChoice(new W(this), true)] : [];
    });
    const items = Object.keys(CONFIG.items).flatMap((id) => {
      const owned = this.items.find((it) => it.id === id);
      if (owned) return owned.level < max ? [this.#itemChoice(id, owned)] : [];
      return this.items.length < slots.items ? [this.#itemChoice(id, null)] : [];
    });
    return [...weapons, ...items];
  }

  #weaponChoice(weapon, isNew) {
    return {
      kind: 'weapon',
      name: weapon.name,
      desc: isNew ? weapon.desc : (weapon.upgradeDesc(weapon.level + 1) ?? weapon.desc),
      element: weapon.config.element,
      level: isNew ? 0 : weapon.level,
      isNew,
      apply: () => {
        if (isNew) this.weapons.push(weapon);
        else weapon.level += 1;
        return isNew ? `${weapon.name} を手に入れた！` : `${weapon.name} が Lv ${weapon.level} になった！`;
      },
    };
  }

  #itemChoice(id, owned) {
    const cfg = CONFIG.items[id];
    return {
      kind: 'item',
      iconId: id,
      name: cfg.name,
      desc: cfg.desc,
      element: 'none',
      level: owned?.level ?? 0,
      isNew: !owned,
      apply: () => {
        if (owned) owned.level += 1;
        else this.items.push({ id, level: 1 });
        return `${cfg.name} が Lv ${this.#itemLevel(id)} になった！`;
      },
    };
  }

  // 攻撃もアイテムもすべて Lv 上限になったあとの候補
  #bonusChoices() {
    const p = this.player;
    return [
      {
        kind: 'bonus', name: 'カフェイン全回復', desc: 'カフェインを\n上限まで回復する', element: 'none', level: 0, isNew: false,
        apply: () => {
          p.caffeine = p.maxCaffeine;
          return 'カフェインが全回復した！';
        },
      },
      {
        kind: 'bonus', name: '攻撃力 +10%', desc: 'すべての攻撃の\nダメージが上がる', element: 'none', level: 0, isNew: false,
        apply: () => {
          this.damageBonus += CONFIG.leveling.damageBonusPerLevel;
          return `攻撃力アップ（×${this.damageBonus.toFixed(1)}）`;
        },
      },
    ];
  }

  // 候補をランダムに選んで、選択画面を開く。選べるものがなくなっていたら、ボーナスから選ぶ
  #openLevelUp() {
    const all = this.#levelUpChoices();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const choices = all.slice(0, CONFIG.weaponLevels.choices);
    this.levelUpMenu.open(choices.length ? choices : this.#bonusChoices(), this.level);
    this.state = 'levelup';
  }

  #applyChoice(choice) {
    const text = choice.apply();
    this.notice = { title: `レベル ${this.level}`, text, until: this.time + 2.5 };
  }

  #updateLevelUp() {
    const choice = this.levelUpMenu.update(this.input, this.viewW, this.viewH);
    if (!choice) return;
    this.#applyChoice(choice);
    this.#checkUnlocks('allWeaponsMax');
    this.pendingLevelUps -= 1;
    this.state = 'playing';
    // 一度にいくつも上がったときは、続けて選ぶ
    if (this.pendingLevelUps > 0) this.#openLevelUp();
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
    let m = this.damageBonus * this.characterDamageRate * this.powerRate;
    if (target === this.boss) m *= CONFIG.boss.elementMultiplier[element] ?? 1;
    target.damage(amount * m);
    sound.play('hit');
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
    if (this.input.wasPressed('KeyM')) sound.toggleMute();
    // − で BGM を小さく、＋で大きく（日本語キーボードの ; ＋ キーと、テンキーにも対応）
    if (this.input.wasPressed('Minus', 'NumpadSubtract')) this.#changeMusicVolume(-1);
    if (this.input.wasPressed('Equal', 'Semicolon', 'NumpadAdd')) this.#changeMusicVolume(1);
    sound.setPaused(this.state === 'paused');
    if (this.state === 'title') {
      if (this.input.consumeClick()) {
        this.characterSelect.open(this.character);
        this.state = 'select';
      }
      return;
    }
    if (this.state === 'select') {
      const result = this.characterSelect.update(this.input, this.viewW, this.viewH);
      if (result === 'back') {
        this.state = 'title';
      } else if (result) {
        this.character = result;
        saveLastCharacter(result);
        this.reset();
      }
      return;
    }
    if (this.state === 'paused') {
      this.#updatePauseMenu();
      return;
    }
    if (this.state === 'levelup') {
      this.#updateLevelUp();
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
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter((fx) => fx.alive);
    this.#collectBeans();
    this.#collectXpOrbs(dt);

    if (!this.player.alive) this.#finish('gameover');
    else if (this.boss?.dead) this.#finish('clear');

    this.camera.x = this.player.x - this.viewW / 2;
    this.camera.y = this.player.y - this.viewH / 2;
  }

  // ゲームオーバーかクリアで終わる。BGM は静かに消し、終わりの音を鳴らす
  #finish(state) {
    this.state = state;
    sound.stopMusic();
    sound.play(state);
    if (state === 'clear') this.#checkUnlocks('bossDefeat');
  }

  // ---- キャラの性能と解放 ----

  // 成長するキャラ（赤ちゃん豆）の今の倍率。Lv 1 で from、maxLevel 以上で to
  #growthProgress() {
    const g = this.character.growth;
    return g ? Math.min(1, (this.level - 1) / (g.maxLevel - 1)) : 0;
  }

  // キャラの性能を、今のレベルに合わせて反映する
  #applyCharacterStats() {
    const r = this.character.roast;
    const g = this.character.growth;
    const k = this.#growthProgress();
    const m = g ? g.from + (g.to - g.from) * k : 1;
    this.characterDamageRate = r.damageRate * m;
    this.attackIntervalRate = r.attackIntervalRate / m;
    this.player.setStats(r.speedRate * m, Math.round(r.maxCaffeine * m));
    if (g) this.player.drawScale = g.scaleFrom + (g.scaleTo - g.scaleFrom) * k;
  }

  // 解放の条件を調べ、満たしたキャラを解放して知らせる。value は起動の回数など
  #checkUnlocks(type, value) {
    for (const c of CONFIG.characters.specials) {
      if (c.unlock.type !== type) continue;
      const met = {
        bossDefeat: () => true,
        launches: () => value >= c.unlock.count,
        allWeaponsMax: () => this.weapons.length >= CONFIG.slots.weapons && this.weapons.every((w) => w.isMax),
      }[type]();
      if (met && unlock(c.id)) this.#toast(`新しいキャラ「${c.name}」が解放された！`);
    }
  }

  #toast(text) {
    this.toasts.push({ text, until: performance.now() + 4500 });
    sound.play('levelUp');
  }

  #changeMusicVolume(steps) {
    sound.changeMusicVolume(steps);
    this.volumeShownUntil = performance.now() + 1500;
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
    const current = items[this.pauseIndex];
    if (current.adjust) {
      if (this.input.wasPressed('ArrowLeft', 'KeyA')) current.adjust(-1);
      if (this.input.wasPressed('ArrowRight', 'KeyD')) current.adjust(1);
    }
    const clicked = this.input.consumeClick();
    if (this.input.wasPressed('Escape', 'KeyP')) {
      this.state = 'playing';
      return;
    }
    if (!clicked) return;
    const pos = this.input.clickPos;
    const item = pos ? items.find((it) => inRect(pos, it)) : current;
    if (!item) return;
    // 音量の項目は、左半分のクリックで下げ、右半分のクリックで上げる
    if (item.adjust) {
      if (pos) item.adjust(pos.x < item.x + item.w / 2 ? -1 : 1);
      return;
    }
    item.action();
  }

  #pauseMenuItems() {
    const w = Math.min(240, this.viewW - 64);
    const h = 48;
    const x = (this.viewW - w) / 2;
    const y = this.viewH / 2 - 10;
    const gap = h + 16;
    return [
      { label: '再開', x, y, w, h, action: () => { this.state = 'playing'; } },
      { label: `音楽の音量  ◀ ${sound.musicVolume}% ▶`, x, y: y + gap, w, h, adjust: (d) => sound.changeMusicVolume(d) },
      { label: 'タイトルへ戻る', x, y: y + gap * 2, w, h, action: () => { this.reset(); this.state = 'title'; } },
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

  #dropXp(x, y, value) {
    if (this.xpOrbs.length < CONFIG.xpOrb.maxCount) {
      this.xpOrbs.push(new XpOrb(x, y, value));
    } else {
      // 粒が多すぎるときは、いちばん古い粒に経験値をまとめる
      this.xpOrbs[0].value += value;
    }
  }

  #collectXpOrbs(dt) {
    this.xpOrbs = this.xpOrbs.filter((o) => {
      o.update(dt, this.player);
      if (!o.collected) return true;
      this.#gainXp(o.value * this.xpRate);
      return false;
    });
  }

  #collectBeans() {
    const p = this.player;
    this.beans = this.beans.filter((b) => {
      if (dist(b, p) >= b.radius + p.radius) return true;
      sound.play(b.fake ? 'fakeBean' : 'bean');
      if (b.fake) {
        p.drain(CONFIG.bean.fakeCaffeine);
      } else {
        p.heal(CONFIG.bean.caffeine);
      }
      return false;
    });
  }

  #spawnEnemies(dt) {
    const s = CONFIG.spawn;
    const t = Math.min(1, this.time / s.rampSec);
    const interval = s.startIntervalSec + (s.minIntervalSec - s.startIntervalSec) * t;
    // 1 回に出る数。2.5 体なら半々の確率で 2 体か 3 体
    const group = s.startGroup + (s.endGroup - s.startGroup) * t;
    this.enemyTimer += dt;
    while (this.enemyTimer >= interval) {
      this.enemyTimer -= interval;
      const n = Math.floor(group) + (Math.random() < group % 1 ? 1 : 0);
      for (let i = 0; i < n && this.enemies.length < s.maxCount; i++) this.#spawnEnemy(this.#pickEnemyType());
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
    this.enemies.push(new Enemy(type, x, y, this.#enemyStrength()));
  }

  // 今の生存時間に応じた敵の強さの倍率
  #enemyStrength() {
    const s = CONFIG.enemyScaling;
    const min = this.time / 60;
    return { hp: 1 + s.hpPerMin * min, speed: 1 + s.speedPerMin * min, damage: 1 + s.damagePerMin * min };
  }

  #updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.update(dt, p);
      if (e.frozen || dist(e, p) >= e.radius + p.radius) continue;
      const c = e.config;
      if (c.contactCaffeine) p.hit(c.contactCaffeine * e.damageRate);
      if (c.drainPerSec) p.drain(c.drainPerSec * e.damageRate * dt);
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
    sound.play('bossAppear');
    sound.setMode('boss');
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

  // 倒した敵はエフェクトと経験値の粒を残し、ときどき豆を落とす
  #removeDeadEnemies() {
    const { enemyDropChance, maxDroppedBeans } = CONFIG.leveling;
    this.enemies = this.enemies.filter((e) => {
      if (!e.dead) return true;
      sound.play('defeat');
      this.effects.push(new DefeatEffect(e.x, e.y, e.config.color, e.radius));
      this.#dropXp(e.x, e.y, e.config.xp);
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
    for (const o of this.xpOrbs) o.draw(ctx);
    for (const w of this.waves) w.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    for (const fx of this.effects) fx.draw(ctx);
    if (this.boss && !this.boss.dead) this.boss.draw(ctx);
    this.player.draw(ctx);
    for (const w of this.weapons) w.draw(ctx);
    ctx.restore();

    if (this.state === 'clear') this.#drawDawn();
    else this.#drawDarkness();

    if (this.state === 'title') {
      this.#drawTitle();
    } else if (this.state === 'select') {
      this.characterSelect.draw(ctx, this.viewW, this.viewH);
    } else {
      this.#drawHud();
      if (this.state === 'paused') this.#drawPauseMenu();
      if (this.state === 'levelup') this.levelUpMenu.draw(ctx, this.viewW, this.viewH);
      this.#drawOverlay();
    }
    this.#drawSoundIndicator();
    this.#drawToasts();
  }

  // キャラの解放などの知らせ。最後の 0.5 秒で薄くなって消える
  #drawToasts() {
    const now = performance.now();
    this.toasts = this.toasts.filter((t) => t.until > now);
    const { ctx } = this;
    this.toasts.forEach((t, i) => {
      const y = 70 + i * 44;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t.until - now) / 500);
      ctx.font = font(17, true);
      const w = ctx.measureText(t.text).width + 40;
      ctx.fillStyle = 'rgba(20, 12, 8, 0.85)';
      ctx.fillRect(this.viewW / 2 - w / 2, y - 18, w, 36);
      ctx.strokeStyle = CONFIG.colors.xpBar;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.viewW / 2 - w / 2, y - 18, w, 36);
      ctx.fillStyle = CONFIG.colors.xpBar;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, this.viewW / 2, y);
      ctx.restore();
    });
  }

  // 画面右上に、音あり／消音の状態を小さく出す
  #drawSoundIndicator() {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = font(12);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(sound.isMuted ? 'M：消音中' : 'M：音あり ♪', this.viewW - 16, 16);
    if (performance.now() < (this.volumeShownUntil ?? 0)) {
      ctx.globalAlpha = 1;
      ctx.font = font(14, true);
      ctx.fillText(`音楽 ${sound.musicVolume}%`, this.viewW - 16, 34);
    }
    ctx.restore();
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
    const ratio = Math.max(0, this.player.caffeine / this.player.maxCaffeine);
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
    ctx.font = font(14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${this.character.name}   Lv ${this.level}   カフェイン  ${Math.max(0, Math.ceil(this.player.caffeine))}`, x, y + 34);
    ctx.fillText(`生存時間  ${formatTime(this.time)}`, x, y + 54);
    if (!this.boss) ctx.fillText(`眠気が来るまで  ${formatTime(CONFIG.boss.timeSec - this.time)}`, x, y + 74);

    // 持っている攻撃とアイテムの一覧（持っている数 / 上限）
    const { slots } = CONFIG;
    let ly = y + 98;
    const line = (text, color) => {
      ctx.fillStyle = color;
      ctx.fillText(text, x, ly);
      ly += 14;
    };
    ctx.font = font(11);
    line(`攻撃 ${this.weapons.length}/${slots.weapons}`, 'rgba(243, 230, 216, 0.85)');
    for (const wp of this.weapons) line(`・${wp.name}  ${levelLabel(wp.level)}`, 'rgba(243, 230, 216, 0.6)');
    ly += 4;
    line(`アイテム ${this.items.length}/${slots.items}`, c.itemCard);
    for (const it of this.items) {
      ly += 2;
      drawItemIcon(ctx, it.id, x + 9, ly + 6, 18);
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(243, 230, 216, 0.6)';
      ctx.fillText(`${CONFIG.items[it.id].name}  ${levelLabel(it.level)}`, x + 22, ly);
      ly += 18;
    }

    this.#drawNotice();
    if (this.boss && !this.boss.dead) this.#drawBossHud();
  }

  #drawNotice() {
    // 選択画面の見出しと重ならないように、選んでいる間は出さない
    if (!this.notice || this.time > this.notice.until || this.state === 'levelup') return;
    const { ctx } = this;
    const k = Math.min(1, (this.notice.until - this.time) / 0.5);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.xpBar;
    ctx.font = font(22, true);
    ctx.fillText(this.notice.title, this.viewW / 2, this.viewH * 0.18);
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = font(16);
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
    ctx.font = font(13);
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
      ctx.font = font(20, true);
      ctx.fillText(`${CONFIG.boss.name} が現れた`, this.viewW / 2, this.viewH * 0.3);
    }
  }

  // 起動時のタイトル画面。ゲームの場面を背景に、名前とスタート案内を重ねる
  // 起動時のタイトル画面。イラストが読み込めていればイラスト、まだなら文字だけで描く
  #drawTitle() {
    const img = this.titleImage;
    if (img.complete && img.naturalWidth) this.#drawTitleArt(img);
    else this.#drawTitleText();
  }

  // ロゴ入りのイラストを、欠けないように画面いっぱいに表示し、下に案内を重ねる
  #drawTitleArt(img) {
    const { ctx, viewW, viewH } = this;
    const c = CONFIG.colors;
    const { background, zoom } = CONFIG.title;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, viewW, viewH);

    // ゆっくり拡大・縮小させる（cos で 0 → 1 → 0 と行き来する）
    const t = performance.now() / 1000;
    const k = 1 + zoom.amount * (0.5 - 0.5 * Math.cos((t * Math.PI * 2) / zoom.periodSec));
    const scale = Math.min(viewW / img.naturalWidth, viewH / img.naturalHeight) * k;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (viewW - w) / 2, (viewH - h) / 2, w, h);

    // 下の方を暗くして、案内の文字を読みやすくする
    const band = ctx.createLinearGradient(0, viewH * 0.68, 0, viewH);
    band.addColorStop(0, 'rgba(10, 8, 7, 0)');
    band.addColorStop(0.5, 'rgba(10, 8, 7, 0.75)');
    band.addColorStop(1, 'rgba(10, 8, 7, 0.9)');
    ctx.fillStyle = band;
    ctx.fillRect(0, viewH * 0.68, viewW, viewH * 0.32);

    const cx = viewW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(16);
    ctx.fillStyle = c.text;
    ctx.fillText(CONFIG.title.subtitle, cx, viewH - 96);
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.75)';
    ctx.fillText('珈琲豆を拾ってカフェインを保ち、朝まで生き延びろ', cx, viewH - 70);
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    ctx.font = font(18, true);
    ctx.fillStyle = c.xpBar;
    ctx.fillText('クリック / Space でスタート', cx, viewH - 36);
    ctx.globalAlpha = 1;
  }

  #drawTitleText() {
    const { ctx } = this;
    const c = CONFIG.colors;
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(48, true);
    ctx.fillStyle = c.hudBar;
    ctx.fillText(CONFIG.title.name, cx, cy - 60);

    ctx.font = font(16);
    ctx.fillStyle = c.text;
    ctx.fillText(CONFIG.title.subtitle, cx, cy - 15);
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.7)';
    ctx.fillText('珈琲豆を拾ってカフェインを保ち、朝まで生き延びろ', cx, cy + 20);

    // スタート案内はゆっくり点滅させる
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    ctx.font = font(18, true);
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
    ctx.font = font(28, true);
    ctx.fillText('ポーズ中', this.viewW / 2, this.viewH / 2 - 60);

    ctx.font = font(18, true);
    this.#pauseMenuItems().forEach((it, i) => {
      const selected = i === this.pauseIndex;
      ctx.fillStyle = selected ? c.hudBar : c.hudBg;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.fillStyle = selected ? '#3b2418' : c.text;
      ctx.fillText(it.label, it.x + it.w / 2, it.y + it.h / 2);
    });
  }

  #drawOverlay() {
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelup') return;
    const { ctx } = this;
    const cleared = this.state === 'clear';
    if (!cleared) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
    ctx.fillStyle = cleared ? '#3b2418' : CONFIG.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(28, true);
    ctx.fillText(cleared ? '朝が来た！' : '眠りに落ちた…', this.viewW / 2, this.viewH / 2 - 30);
    ctx.font = font(16);
    ctx.fillText(`生存時間  ${formatTime(this.time)}`, this.viewW / 2, this.viewH / 2 + 10);
    ctx.fillText('クリック / Space でもう一度', this.viewW / 2, this.viewH / 2 + 40);
  }
}
