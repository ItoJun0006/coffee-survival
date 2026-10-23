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
import { CONDITIONS, loadLastCharacter, readyId, saveLastCharacter, wearsSkin, noBeans, creatorGrowth, creatorXpRate, withEnergyDrink } from './characters.js';
import { addMaxClear, refundRemovedVarieties, unlock, recordLaunch, recordPlay, addPlayTime, addDistance, addKills, addBeans, saveProgress, pointCard, addCoins, coins } from './progress.js';
import { coinText, drawCoin, drawCoinTally, tallyDone } from './coin-ui.js';
import { recordResult, records } from './records.js';
import { drawResultRecords, drawTitleRecords } from './records-ui.js';
import { CharacterSelect } from './character-select.js';
import { LevelUpMenu, levelLabel } from './level-up-menu.js';
import { drawItemIcon } from './item-icons.js';
import { PixelLayer } from './pixel-layer.js';
import { Floor } from './floor.js';
import { sound } from './sound.js';
import { font } from './font.js';
import { Background } from './background.js';
import { stage, setStage } from './stage.js';
import { drawWeaponIcon, weaponIdOf } from './weapon-icons.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const formatTime = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// 並びをランダムに入れ替えた配列を返す（元の配列も入れ替わる）
function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export class Game {
  // targets() の一覧を作り直すための、フレームの番号
  #frame = 0;
  #targetsFrame = -1;
  #targetList = [];
  #targetsDirty = false;

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
    // ?weapons=mill:8,drip:5 を付けて開くと、指定した攻撃を指定した Lv で持って始まる（動作確認用）
    this.debugWeapons = (params.get('weapons') ?? '').split(',').filter(Boolean).map((s) => {
      const [id, lv] = s.split(':');
      return { id, level: Number(lv) || 1 };
    });
    // ?maxVariant=A|B|C を付けて開くと、MAX の見た目の案を切り替えられる（動作確認用）
    this.debugMaxVariant = params.get('maxVariant');
    this.pixelLayer = new PixelLayer();
    this.floor = new Floor();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // 別のタブやアプリに切り替えたら自動でポーズする
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.#pause();
    });
    this.character = loadLastCharacter();
    this.characterSelect = new CharacterSelect((text) => this.#toast(text));
    this.levelUpMenu = new LevelUpMenu();
    this.background = new Background();
    this.titleImage = new Image();
    this.titleImage.src = CONFIG.title.image;
    sound.init();
    // 画面の上に数秒出す知らせ（キャラの解放など）。ゲームの時間ではなく実際の時間で消える
    this.toasts = [];
    this.#checkUnlocks('launches', recordLaunch());
    // 前回までのポイントカードで条件を満たしていれば、ここで解放する（閉じる直前に満たした場合など）
    this.#checkUnlocks('plays', pointCard().plays);
    refundRemovedVarieties(CONFIG.characters.removedVarieties);
    this.#checkPointCardUnlocks();
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
    this.pixelLayer.resize(this.viewW, this.viewH);
  }

  reset() {
    sound.setMode('normal');
    sound.startMusic();
    this.player = new Player(stage.world.width / 2, stage.world.height / 2, this.character);
    this.player.skin = wearsSkin(this.character);
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
    // そのプレイで倒した敵の数と、結果画面の豆コインの数え上げ（仕様 016）
    this.runKills = 0;
    this.coinTally = null;
    // そのプレイの記録と自己ベストとの比べ（仕様 001 の User Story 7）。1 面で終わったときだけ作る
    this.runRecord = null;
    this.level = 1;
    this.xp = 0;
    // ボーナスで上がる攻撃力。キャラの攻撃力の倍率は characterDamageRate に分けて持つ
    this.damageBonus = 1;
    this.items = [];
    const StartWeapon = this.character.startWeapon === 'beanShotgun' ? BeanShotgun : WEAPON_ORDER[0];
    this.weapons = [new StartWeapon(this)];
    this.pendingLevelUps = 0;
    this.#applyCharacterStats();
    // 動作確認用の ?level=N は、まだ持っていない攻撃を優先して自動で選ぶ（1 面だけ）
    for (let i = 1; stage.id === 'main' && i < this.debugLevel; i++) {
      this.level += 1;
      this.#applyCharacterStats();
      const choices = this.#levelUpChoices();
      this.#applyChoice(choices.find((c) => c.isNew && c.kind === 'weapon') ?? choices[0] ?? this.#bonusChoices()[1]);
    }
    this.notice = null;
    // 受け取った椿の花の種類
    this.camellias = [];
    // ダイスケ豆が固まっているか（仕様 019）
    this.frozen = false;
    this.frozenSec = 0;
    this.stoneBurst = null;
    this.nextWaveAt = CONFIG.bigWave.firstSec;
    this.waveUntil = 0;
    const camp = CONFIG.bagCamp;
    this.bagCampAt = camp.minSec + Math.random() * (camp.maxSec - camp.minSec);
    this.#applyDebugWeapons();
  }

  // ?weapons= で指定した攻撃を持たせる。最初から持っている攻撃は Lv だけ変え、持てる数は超えない
  #applyDebugWeapons() {
    const { max } = CONFIG.weaponLevels;
    for (const { id, level } of this.debugWeapons) {
      const name = CONFIG.weapons[id]?.name;
      if (!name) continue;
      let weapon = this.weapons.find((w) => w.config.name === name);
      if (!weapon) {
        const W = WEAPON_ORDER.find((W) => new W(this).config.name === name);
        if (!W || this.weapons.length >= CONFIG.slots.weapons) continue;
        weapon = new W(this);
        this.weapons.push(weapon);
      }
      weapon.level = Math.min(max, Math.max(1, level));
    }
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
      this.#checkUnlocks('maxLevel', this.level);
      // エクストラステージでは、上がった Lv の数だけカフェインを回復する
      if (stage.levelUpHealRate) this.player.heal(this.player.maxCaffeine * stage.levelUpHealRate * (this.level - before));
      sound.play('levelUp');
      if (this.state === 'playing') this.#openLevelUp();
    }
  }

  // ---- ステータス強化アイテムの効果 ----

  #itemLevel(id) {
    return this.items.find((it) => it.id === id)?.level ?? 0;
  }

  // 効果の計算に使う段階の数。限界突破した Lv 9 から先は、1 段階の効果が overCapItemRate 倍になる
  #itemSteps(id) {
    const { max, overCapItemRate } = CONFIG.weaponLevels;
    const lv = this.#itemLevel(id);
    return Math.min(lv, max) + Math.max(0, lv - max) * overCapItemRate;
  }

  // 範囲アップ：弾と範囲の大きさの倍率。品種の特別な力「範囲アップ」も掛ける
  get areaRate() {
    return (1 + CONFIG.items.area.perLevel * this.#itemSteps('area')) * this.#power('areaRate', 1);
  }

  // 発生頻度アップ：攻撃の間隔の倍率。椿の花を持っていれば、さらに短くなる
  get frequencyRate() {
    return (1 - CONFIG.items.frequency.perLevel * this.#itemSteps('frequency')) * this.#rareRate('intervalRate');
  }

  get powerRate() {
    return (1 + CONFIG.items.power.perLevel * this.#itemSteps('power')) * this.#rareRate('damageRate');
  }

  // 受け取った椿の花の数だけ、倍率をかけ合わせる
  #rareRate(key) {
    return CONFIG.camellia[key] ** this.camellias.length;
  }

  get xpRate() {
    return (1 + CONFIG.items.xp.perLevel * this.#itemSteps('xp')) * this.#power('xpRate', 1) * creatorXpRate(this.character);
  }

  // ---- 品種の特別な力（仕様 016） ----

  // 選んだキャラの特別な力の値。力がないか、その種類でないときは fallback
  #power(key, fallback) {
    return this.character.power?.[key] ?? fallback;
  }

  get #moving() {
    return !!(this.moveDir.x || this.moveDir.y);
  }

  // キャラの攻撃の間隔の倍率。走り撃ちは、動いている間だけ短くなる
  get attackIntervalRate() {
    return this.characterIntervalRate * (this.#moving ? this.#power('movingIntervalRate', 1) : 1);
  }

  // ---- レベルアップの候補 ----
  // 候補は { kind, name, desc, element, level（今の Lv。新しいものは 0）, isNew, apply } の形にそろえる。
  // apply は選んだときの処理で、画面に出す知らせの文を返す

  // 攻撃とアイテムの候補。持てる数の上限に達していたら、新しいものは出さない
  #levelUpChoices() {
    const { max } = CONFIG.weaponLevels;
    const slots = CONFIG.slots;
    // Lv 8 から先（限界突破）は、エクストラステージで overCap に当たったときだけ候補に入れる
    const canUpgrade = (lv) => lv < max || (this.overCap && lv < stage.maxLevel);
    const weapons = WEAPON_ORDER.flatMap((W) => {
      const owned = this.weapons.find((w) => w instanceof W);
      if (owned) return canUpgrade(owned.level) ? [this.#weaponChoice(owned, false)] : [];
      return this.weapons.length < slots.weapons ? [this.#weaponChoice(new W(this), true)] : [];
    });
    const items = Object.keys(CONFIG.items).flatMap((id) => {
      const owned = this.items.find((it) => it.id === id);
      if (owned) return canUpgrade(owned.level) ? [this.#itemChoice(id, owned)] : [];
      return this.items.length < slots.items ? [this.#itemChoice(id, null)] : [];
    });
    return [...weapons, ...items];
  }

  #weaponChoice(weapon, isNew) {
    return {
      kind: 'weapon',
      weaponId: weaponIdOf(weapon),
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

  // 椿の花のカード。chance の確率で、まだ受け取っていない種類からランダムに 1 つ出す
  #rareChoices() {
    const cfg = CONFIG.camellia;
    const left = Object.keys(cfg.kinds).filter((k) => !this.camellias.includes(k));
    if (!left.length || Math.random() >= cfg.chance) return [];
    const kind = left[Math.floor(Math.random() * left.length)];
    const { name } = cfg.kinds[kind];
    return [{
      kind: 'rare', camellia: kind, iconId: `camellia-${kind}`, name, desc: cfg.desc, element: 'none', level: 0, isNew: true,
      apply: () => {
        this.camellias.push(kind);
        // 3 種類そろったら、実績を解除してスキンを手に入れる
        if (this.camellias.length === Object.keys(cfg.kinds).length && unlock(cfg.achievement.id)) this.#toast(cfg.achievement.text);
        return `${name} が咲いた！`;
      },
    }];
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
  // エクストラステージで限界突破に当たったときは、限界突破の候補を必ず 1 枚入れる
  #openLevelUp() {
    this.overCap = Math.random() < stage.overCapChance;
    const all = this.#shuffleChoices(this.#levelUpChoices());
    this.overCap = false;
    const isOverCap = (c) => !c.isNew && c.level >= CONFIG.weaponLevels.max;
    const pick = all.find(isOverCap);
    const rest = all.filter((c) => c !== pick);
    // クリエイター豆は、最後の 1 枚がエナジードリンクになる（仕様 021）
    const choices = withEnergyDrink(this.character, this.player, shuffle([...(pick ? [pick] : []), ...rest].slice(0, CONFIG.weaponLevels.choices)));
    this.levelUpMenu.open([...(choices.length ? choices : this.#bonusChoices()), ...this.#rareChoices()], this.level);
    this.state = 'levelup';
  }

  // 候補をランダムに並べる。ピーベリーのときは、数のない武器のカードが前に来る割合を offRate 倍にする（仕様 017）
  #shuffleChoices(list) {
    const f = CONFIG.characters.focus;
    if (!this.character.focus) return shuffle(list);
    const offNames = f.offWeapons.map((id) => CONFIG.weapons[id].name);
    const weight = (c) => (c.kind === 'weapon' && offNames.includes(c.name) ? f.offRate : 1);
    // 重みつきの並べ替え：それぞれに「乱数の (1 / 重み) 乗」を付けて、大きい順に並べる
    return list.map((c) => ({ c, key: Math.random() ** (1 / weight(c)) })).sort((a, b) => b.key - a.key).map((x) => x.c);
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

  // 攻撃が当たる相手の一覧。1 フレームに 1 回だけ作って使い回し、そのフレームで倒れた相手は除く
  targets() {
    if (this.#targetsFrame !== this.#frame) {
      this.#targetList = this.enemies.filter((e) => !e.dead);
      if (this.boss && !this.boss.dead) this.#targetList.push(this.boss);
      this.#targetsFrame = this.#frame;
      this.#targetsDirty = false;
    } else if (this.#targetsDirty) {
      this.#targetList = this.#targetList.filter((t) => !t.dead);
      this.#targetsDirty = false;
    }
    return this.#targetList;
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

  // 射程内の相手を近い順に count 体まで
  nearestTargets(range, count) {
    return this.targets()
      .map((t) => ({ t, d: dist(t, this.player) - t.radius }))
      .filter((e) => e.d < range)
      .sort((a, b) => a.d - b.d)
      .slice(0, count)
      .map((e) => e.t);
  }

  targetsInCircle(x, y, r) {
    return this.targets().filter((t) => Math.hypot(t.x - x, t.y - y) < r + t.radius);
  }

  dealDamage(target, amount, element) {
    let m = this.damageBonus * this.characterDamageRate * this.powerRate;
    // 踏ん張り：止まっている間だけダメージが上がる
    if (!this.#moving) m *= this.#power('standingDamageRate', 1);
    if (target === this.boss) m *= CONFIG.boss.elementMultiplier[element] ?? 1;
    target.damage(amount * m);
    if (target.dead) this.#targetsDirty = true;
    sound.play('hit');
  }

  // ボスは凍らず、押し返されず、足どめされない
  // guardSec は凍りが解けた直後に凍らない時間
  freeze(target, sec, guardSec = CONFIG.weapons.ice.refreezeGuardSec) {
    if (target !== this.boss) target.freeze(sec, guardSec);
  }

  slow(target, sec, rate) {
    if (target !== this.boss) target.slow(sec, rate);
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
    this.#frame += 1;
    if (this.input.wasPressed('KeyM')) sound.toggleMute();
    // − で BGM を小さく、＋で大きく（日本語キーボードの ; ＋ キーと、テンキーにも対応）
    if (this.input.wasPressed('Minus', 'NumpadSubtract')) this.#changeMusicVolume(-1);
    if (this.input.wasPressed('Equal', 'Semicolon', 'NumpadAdd')) this.#changeMusicVolume(1);
    sound.setPaused(this.state === 'paused');
    // 知らせは、レベルアップの選択・ポーズ・持っていく攻撃の選択の間は進めず、閉じてから出す
    if (this.state === 'paused' || this.state === 'levelup' || this.state === 'carry' || this.state === 'start') {
      for (const t of this.toasts) t.until += dt * 1000;
    }
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
        this.#startRun();
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
    if (this.state === 'carry') {
      const choice = this.levelUpMenu.update(this.input, this.viewW, this.viewH);
      if (choice) this.#startExtra(choice.weapon);
      return;
    }
    if (this.state === 'start') {
      // やり直しのクリックが続けて当たって、カードを選んでしまわないよう、開いた直後は少し待つ
      if (performance.now() - this.levelUpMenu.openedAt < CONFIG.weaponLevels.startGuardMs) {
        this.input.consumeClick();
        return;
      }
      const choice = this.levelUpMenu.update(this.input, this.viewW, this.viewH);
      if (!choice) return;
      this.notice = { title: '最初の攻撃', text: choice.apply(), until: this.time + 2.5 };
      this.state = 'playing';
      return;
    }
    // 1 面をクリアしたら、E キーでエクストラステージへ
    if (this.state === 'clear' && stage.id === 'main' && this.input.wasPressed('KeyE')) {
      this.#openCarryMenu();
      return;
    }
    if (this.state !== 'playing') {
      if (!this.input.consumeClick()) return;
      // 豆コインの数え上げの途中なら、まず数え上げを飛ばす
      if (this.coinTally && !tallyDone(this.coinTally, performance.now())) this.coinTally.skipped = true;
      else this.#startRun();
      return;
    }
    this.input.consumeClick();
    if (this.input.wasPressed('Escape', 'KeyP')) {
      this.#pause();
      return;
    }

    this.time += dt;
    this.#recordProgress(dt);
    if (!this.boss && this.time >= CONFIG.boss.timeSec) this.#spawnBoss();

    this.#updateFreeze(dt);
    // 固まっている間は動けない。カフェインの減りや無敵時間などは、そのまま進む
    if (this.frozen) this.player.update(dt, { x: 0, y: 0 });
    else this.#updatePlayer(dt);
    this.#spawnBeans(dt);
    if (!this.boss) this.#spawnEnemies(dt);
    this.#updateEnemies(dt);
    if (this.boss) this.#updateBoss(dt);
    // ダイスケ豆が固まっている間は、攻撃も止まる（仕様 019）
    if (!this.frozen) for (const w of this.weapons) w.update(dt);
    this.#removeDeadEnemies();
    for (const fx of this.effects) fx.update(dt);
    this.effects = this.effects.filter((fx) => fx.alive);
    this.#collectBeans();
    this.#collectXpOrbs(dt);

    if (!this.player.alive) this.#finish('gameover');
    else if (this.boss?.dead) this.#finish('clear');

    // 背景は画面の点（表示倍率 125% などでは 1px より細かい）単位でなめらかに動かす
    // （3px ごとにそろえると、動きが 3・3・6px と不ぞろいになって画面が揺れる）
    const dpr = window.devicePixelRatio || 1;
    this.camera.x = Math.round((this.player.x - this.viewW / 2) * dpr) / dpr;
    this.camera.y = Math.round((this.player.y - this.viewH / 2) * dpr) / dpr;
  }

  // ゲームオーバーかクリアで終わる。BGM は静かに消し、終わりの音を鳴らす
  #finish(state) {
    this.state = state;
    sound.stopMusic();
    sound.play(state);
    this.#earnCoins(state === 'clear');
    // 自分の記録は 1 面のプレイだけで数える（エクストラステージは数えない。FR-066）
    if (stage.id === 'main') {
      const run = { time: this.time, kills: this.runKills, level: this.level };
      this.runRecord = { run, result: recordResult({ ...run, cleared: state === 'clear' }) };
    }
    saveProgress();
    this.#checkPointCardUnlocks();
    if (state === 'clear') this.#checkUnlocks('bossDefeat');
    if (state === 'clear' && stage.id === 'main') this.#checkUnlocks('clearCaffeine', this.player.caffeine / this.player.maxCaffeine);
    // Lv 8 の攻撃を持ったまま 1 面をクリアしたキャラを数える（ピーベリーの条件。仕様 017）
    if (state === 'clear' && stage.id === 'main' && this.weapons.some((w) => w.isMax)) this.#checkUnlocks('maxClears', addMaxClear(this.character.variety?.id ?? this.character.id));
    if (state === 'clear' && stage.id === 'extra') this.#checkUnlocks('extraClear');
  }

  // ---- 豆コイン（仕様 016） ----

  // 1 回のプレイが終わったときに、生き延びた時間・倒した敵・クリアの分の豆コインを足し、結果画面の数え上げを始める
  #earnCoins(cleared) {
    const c = CONFIG.coins;
    const labels = c.tally.labels;
    const rows = [
      { label: labels.time, detail: formatTime(this.time), value: Math.floor(this.time / 60) * c.perMinute },
      { label: labels.kills, detail: `${this.runKills.toLocaleString('ja-JP')} 体`, value: Math.floor(this.runKills / c.killsPerCoin) },
    ];
    if (cleared) rows.push(stage.id === 'extra' ? { label: labels.extraClear, value: c.extraClear } : { label: labels.clear, value: c.clear });
    const before = coins();
    addCoins(rows.reduce((sum, r) => sum + r.value, 0));
    this.coinTally = { rows, before, startedAt: performance.now(), skipped: false };
  }

  // ---- ポイントカード ----

  // ゲームを始める（キャラ選択から、またはゲームオーバー・クリアからのやり直し）。プレイ回数を 1 増やす
  #startRun() {
    setStage('main');
    this.reset();
    this.playTimeUnsaved = 0;
    this.#checkUnlocks('plays', recordPlay());
    // 最初の攻撃が決まっているキャラと、確認用の ?weapons=・?level= のときは選ばない（仕様 032）
    if (!this.character.startWeapon && !this.debugWeapons.length && this.debugLevel <= 1) this.#openStartMenu();
  }

  // 最初の攻撃を、ランダムな候補から 1 つ選ぶ画面を開く（仕様 032）
  #openStartMenu() {
    this.weapons = [];
    const choices = shuffle([...WEAPON_ORDER]).slice(0, CONFIG.weaponLevels.startChoices).map((W) => this.#weaponChoice(new W(this), true));
    this.levelUpMenu.open(choices, this.level, { title: '最初の攻撃', lead: 'はじめに持つ攻撃を 1 つ選ぶ' });
    this.state = 'start';
  }

  // ---- エクストラステージ（仕様 011） ----

  // 持っていく攻撃を 1 つ選ぶ画面を開く
  #openCarryMenu() {
    const choices = this.weapons.map((weapon) => ({
      kind: 'carry', weapon, weaponId: weaponIdOf(weapon), name: weapon.name, desc: weapon.desc, element: weapon.config.element, level: weapon.level, isNew: false,
    }));
    this.levelUpMenu.open(choices, this.level, { title: 'エクストラステージへ', lead: '持っていく攻撃を 1 つ選ぶ（Lv はそのまま）' });
    this.state = 'carry';
  }

  // 選んだ攻撃だけを持って、エクストラステージを始める。レベル・アイテム・椿の花は最初から
  #startExtra(weapon) {
    setStage('extra');
    this.reset();
    weapon.timer = 0;
    this.weapons = [weapon];
    this.playTimeUnsaved = 0;
    this.#checkUnlocks('plays', recordPlay());
  }

  // 遊んでいる時間と動いた距離を累計に足す（倒した敵の数は #removeDeadEnemies、拾った豆の数は #collectBeans で足す）。
  // ページを急に閉じても大きく失われないよう、5 秒ごとに保存して解放条件を調べる
  #recordProgress(dt) {
    addPlayTime(dt);
    addDistance(this.player.moved ?? 0);
    this.playTimeUnsaved = (this.playTimeUnsaved ?? 0) + dt;
    if (this.playTimeUnsaved < 5) return;
    this.playTimeUnsaved = 0;
    saveProgress();
    this.#checkPointCardUnlocks();
  }

  #checkPointCardUnlocks() {
    const card = pointCard();
    this.#checkUnlocks('playTime', card.playSec);
    this.#checkUnlocks('distance', card.distance);
    this.#checkUnlocks('kills', card.kills);
    this.#checkUnlocks('beans', card.beans);
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
    // クリエイター豆は、Lv 10 から 1.15 倍ずつ伸びる（カフェインの上限は伸びない。仕様 021）
    const c = creatorGrowth(this.character, this.level);
    this.characterDamageRate = r.damageRate * m * c;
    this.characterIntervalRate = r.attackIntervalRate / m / c;
    this.player.setStats(r.speedRate * m * c, Math.round(r.maxCaffeine * m));
    if (g) this.player.drawScale = g.scaleFrom + (g.scaleTo - g.scaleFrom) * k;
  }

  // 解放の条件を調べ、満たしたキャラを解放して知らせる。value は起動の回数など
  // 条件のある豆（特別なキャラ・高級品種）の条件を満たしたら、仕入れられるようにする（仕様 016 FR-018）
  #checkUnlocks(type, value) {
    for (const c of CONDITIONS) {
      const r = c.require;
      if (r.type !== type) continue;
      const met = {
        bossDefeat: () => true,
        extraClear: () => true,
        maxClears: () => value >= r.count,
        clearCaffeine: () => value >= r.ratio,
        launches: () => value >= r.count,
        plays: () => value >= r.count,
        playTime: () => value >= r.seconds,
        distance: () => value >= r.pixels,
        kills: () => value >= r.count,
        beans: () => value >= r.count,
        maxLevel: () => value >= r.level,
        allWeaponsMax: () => this.weapons.length >= CONFIG.slots.weapons && this.weapons.every((w) => w.isMax),
      }[type]();
      if (met && unlock(readyId(c.group))) this.#toast(CONFIG.coins.texts.ready.replace('{name}', c.name).replace('{price}', coinText(c.price)));
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
      { label: 'タイトルへ戻る', x, y: y + gap * 2, w, h, action: () => { saveProgress(); this.reset(); this.state = 'title'; } },
    ];
  }

  // ダイスケ豆（仕様 019）：毎分 startSec 秒目から stopSec 秒、移動と攻撃を止める。止まり終わったら、
  // 止まっていた間に出ていたはずの回数ぶんを一度に撃つ（攻撃ごとに、間隔で割った回数。間隔のない攻撃はためない）
  #updateFreeze(dt) {
    const f = CONFIG.characters.freeze;
    if (this.stoneBurst) {
      this.stoneBurst.age += dt;
      if (this.stoneBurst.age >= f.burstSec) this.stoneBurst = null;
    }
    const was = this.frozen;
    const t = this.time % f.periodSec;
    this.frozen = !!this.character.freeze && this.time >= f.startSec && t >= f.startSec && t < f.startSec + f.stopSec;
    if (this.frozen) {
      this.frozenSec = (was ? this.frozenSec : 0) + dt;
      return;
    }
    if (!was) return;
    // 石が弾けて、ためた弾が一斉に出る
    this.stoneBurst = { x: this.player.x, y: this.player.y, age: 0 };
    for (const w of this.weapons) {
      if (!w.config.intervalSec) continue;
      const n = Math.min(f.maxBurst, Math.floor(this.frozenSec / (w.config.intervalSec * w.intervalRate)));
      for (let i = 0; i < n; i++) {
        w.timer = Infinity;
        w.update(0);
      }
    }
  }

  // ダイスケ豆が固まっている間の演出（ドット絵の層に描く）。k は 0（固まった瞬間）〜1（解ける直前）
  #drawFreezeWorld(ctx) {
    const f = CONFIG.characters.freeze;
    const p = this.player;
    const r = p.radius * (this.character.drawScale ?? 1);
    const k = Math.min(1, this.frozenSec / f.stopSec);
    ctx.save();
    ctx.translate(p.x, p.y);
    // 砂時計。豆は石のように灰色になり、頭の上の砂時計の砂が落ちきると解ける
    ctx.fillStyle = f.stone;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(r * 1.1, -r * 1.2);
    const hw = 9;
    const hh = 12;
    ctx.fillStyle = f.glass;
    ctx.fillRect(-hw - 2, -hh - 3, (hw + 2) * 2, 3);
    ctx.fillRect(-hw - 2, hh, (hw + 2) * 2, 3);
    ctx.strokeStyle = f.glass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(hw, -hh);
    ctx.lineTo(1.5, 0);
    ctx.lineTo(hw, hh);
    ctx.lineTo(-hw, hh);
    ctx.lineTo(-1.5, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = f.sand;
    const top = 1 - k;
    ctx.beginPath();
    ctx.moveTo(-hw * top, -hh * top);
    ctx.lineTo(hw * top, -hh * top);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-hw, hh);
    ctx.lineTo(hw, hh);
    ctx.lineTo(hw * (1 - k), hh * (1 - k));
    ctx.lineTo(-hw * (1 - k), hh * (1 - k));
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1, 0, 2, hh);
    ctx.restore();
  }

  // 解けた瞬間に、石のかけらが外へ飛び散る
  #drawStoneBurst(ctx) {
    const f = CONFIG.characters.freeze;
    const b = this.stoneBurst;
    const k = b.age / f.burstSec;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = f.stoneShard;
    for (let i = 0; i < f.shards; i++) {
      const a = (i / f.shards) * Math.PI * 2 + i * 0.7;
      const d = f.burstDist * (0.3 + k * 0.7);
      const s = f.shardSize * (1 - k * 0.4);
      ctx.save();
      ctx.translate(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
      ctx.rotate(a + k * 5);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.restore();
  }

  // ダイスケ豆が固まっている間、豆の上に残りの秒数を出す
  #drawFreezeCountdown() {
    const f = CONFIG.characters.freeze;
    const { ctx } = this;
    const left = Math.max(1, Math.ceil(f.stopSec - this.frozenSec));
    const x = this.player.x - this.camera.x;
    const y = this.player.y - this.camera.y - this.player.radius * (this.character.drawScale ?? 1) - 22;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(22, true);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.85)';
    ctx.strokeText(String(left), x, y);
    ctx.fillStyle = f.countdownColor;
    ctx.fillText(String(left), x, y);
    ctx.restore();
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
    if (noBeans(this.character)) return; // クリエイター豆は珈琲豆が出ない（仕様 021）
    const { spawnIntervalSec, spawnRadius, maxCount } = CONFIG.bean;
    this.beanTimer += dt;
    while (this.beanTimer >= spawnIntervalSec) {
      this.beanTimer -= spawnIntervalSec;
      if (this.beans.length >= maxCount) continue;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spawnRadius;
      const x = clamp(this.player.x + Math.cos(a) * r, 0, stage.world.width);
      const y = clamp(this.player.y + Math.sin(a) * r, 0, stage.world.height);
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
        p.heal(CONFIG.bean.caffeine * this.#power('beanHealRate', 1));
        addBeans(1);
      }
      return false;
    });
  }

  #spawnEnemies(dt) {
    const s = CONFIG.spawn;
    const wave = CONFIG.bigWave;
    this.#updateBigWave();
    const inWave = this.time < this.waveUntil;
    if (!inWave) this.#updateBagCamp();
    const t = Math.min(1, this.#enemyTime() / s.rampSec);
    const interval = s.startIntervalSec + (s.minIntervalSec - s.startIntervalSec) * t;
    // 1 回に出る数。2.5 体なら半々の確率で 2 体か 3 体
    const group = (s.startGroup + (s.endGroup - s.startGroup) * t) * (inWave ? wave.spawnRate : 1);
    const maxCount = inWave ? stage.bigWaveMaxCount ?? wave.maxCount : stage.enemyMaxCount ?? s.maxCount;
    this.enemyTimer += dt;
    while (this.enemyTimer >= interval) {
      this.enemyTimer -= interval;
      const n = Math.floor(group) + (Math.random() < group % 1 ? 1 : 0);
      for (let i = 0; i < n && this.enemies.length < maxCount; i++) {
        const { x, y } = this.#spawnPoint();
        this.#spawnEnemy(this.#pickEnemyType(), x, y, 0);
      }
    }
  }

  // 時間が来たらビッグウェーブを始め、次に来る時間を決める
  #updateBigWave() {
    const w = CONFIG.bigWave;
    if (this.time < this.nextWaveAt) return;
    if (this.nextWaveAt > CONFIG.boss.timeSec - w.stopBeforeBossSec) return;
    this.waveUntil = this.nextWaveAt + w.durationSec;
    const [minSec, maxSec] = stage.bigWaveIntervalSec ?? [w.minIntervalSec, w.maxIntervalSec];
    this.nextWaveAt += minSec + Math.random() * (maxSec - minSec);
    this.notice = { title: w.title, text: w.text, until: this.time + 2.5 };
  }

  // ねぶくろキャンプ（仕様 020）。時刻が来たら 1 回だけ、プレイヤーを輪のように取り囲んで敵を出す。
  // 同時に出ている敵の上限には数えない
  #updateBagCamp() {
    if (this.bagCampAt === null || this.time < this.bagCampAt) return;
    this.bagCampAt = null;
    const { type, count, extraRadius, title, text } = CONFIG.bagCamp;
    const radius = Math.hypot(this.viewW, this.viewH) / 2 + extraRadius;
    const start = Math.random() * Math.PI * 2;
    const strength = this.#enemyStrength();
    strength.speed *= stage.enemySpeedRates[type] ?? stage.enemySpeedRate;
    for (let i = 0; i < count; i++) {
      const a = start + (i / count) * Math.PI * 2;
      const x = clamp(this.player.x + Math.cos(a) * radius, 0, stage.world.width);
      const y = clamp(this.player.y + Math.sin(a) * radius, 0, stage.world.height);
      this.enemies.push(new Enemy(type, x, y, strength));
    }
    this.notice = { title, text, until: this.time + 2.5 };
  }

  #pickEnemyType() {
    const types = Object.entries(CONFIG.enemies).filter(([, c]) => this.#enemyTime() >= c.appearSec);
    let roll = Math.random() * types.reduce((sum, [, c]) => sum + c.weight, 0);
    for (const [type, c] of types) {
      roll -= c.weight;
      if (roll <= 0) return type;
    }
    return types[0][0];
  }

  // 既定では画面のすぐ外に出現させる
  // 通常の敵が現れる場所。マップの内側で、画面に映っておらず、プレイヤーがいる角のまわりでもない所。
  // まず画面のすぐ外の円周上を、だめなら少し遠い円周上を探し、それでもなければマップ全体から探す
  #spawnPoint() {
    const { width, height } = stage.world;
    const { viewPad, cornerRadius, ringTries, ringSteps, anywhereTries } = CONFIG.spawn;
    const p = this.player;
    const halfW = this.viewW / 2 + viewPad;
    const halfH = this.viewH / 2 + viewPad;
    const corners = [[0, 0], [width, 0], [0, height], [width, height]];
    const corner = corners.find(([cx, cy]) => Math.hypot(p.x - cx, p.y - cy) < cornerRadius);
    const ok = (x, y) => x >= 0 && x <= width && y >= 0 && y <= height
      && (Math.abs(x - p.x) > halfW || Math.abs(y - p.y) > halfH)
      && !(corner && Math.hypot(x - corner[0], y - corner[1]) < cornerRadius);
    const base = Math.hypot(halfW, halfH);
    for (const step of ringSteps) {
      for (let i = 0; i < ringTries; i++) {
        const a = Math.random() * Math.PI * 2;
        const x = p.x + Math.cos(a) * base * step;
        const y = p.y + Math.sin(a) * base * step;
        if (ok(x, y)) return { x, y };
      }
    }
    for (let i = 0; i < anywhereTries; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      if (ok(x, y)) return { x, y };
    }
    // マップが画面より狭いなどで見つからないときは、プレイヤーから一番遠い角に出す
    const [fx, fy] = corners.reduce((a, b) => (Math.hypot(p.x - a[0], p.y - a[1]) > Math.hypot(p.x - b[0], p.y - b[1]) ? a : b));
    return { x: fx, y: fy };
  }

  #spawnEnemy(type, cx = this.player.x, cy = this.player.y, distance = Math.hypot(this.viewW, this.viewH) / 2 + 40) {
    const a = Math.random() * Math.PI * 2;
    const x = clamp(cx + Math.cos(a) * distance, 0, stage.world.width);
    const y = clamp(cy + Math.sin(a) * distance, 0, stage.world.height);
    const strength = this.#enemyStrength();
    strength.speed *= stage.enemySpeedRates[type] ?? stage.enemySpeedRate;
    this.enemies.push(new Enemy(type, x, y, strength));
  }

  // 敵の出方と強さを決める時間。エクストラステージは 1 面の続きになるよう、経過時間に足す（仕様 060）
  #enemyTime() {
    return this.time + (stage.enemyTimeOffsetSec ?? 0);
  }

  // 今の生存時間に応じた敵の強さの倍率
  #enemyStrength() {
    const s = CONFIG.enemyScaling;
    const min = this.#enemyTime() / 60;
    return { hp: 1 + s.hpPerMin * min, speed: 1 + s.speedPerMin * min, damage: 1 + s.damagePerMin * min };
  }

  #updateEnemies(dt) {
    const p = this.player;
    // 種類ごとの、触れている敵の吸い取りの量
    const drains = {};
    for (const e of this.enemies) {
      e.update(dt, p);
      if (e.frozen || dist(e, p) >= e.radius + p.radius) continue;
      const c = e.config;
      if (c.contactCaffeine) p.hit(c.contactCaffeine * e.damageRate);
      if (c.drainPerSec) (drains[e.type] ??= []).push(c.drainPerSec * e.damageRate);
      if (c.slowSec) p.slow(c.slowSec, c.slowFactor);
    }
    for (const [type, list] of Object.entries(drains)) {
      const top = list.sort((a, b) => b - a).slice(0, CONFIG.enemies[type].drainMaxStack ?? list.length);
      p.drain(top.reduce((sum, v) => sum + v, 0) * dt);
    }
  }

  #spawnBoss() {
    const a = Math.random() * Math.PI * 2;
    const d = Math.min(this.viewW, this.viewH) / 2 + CONFIG.boss.radius;
    this.boss = new Boss(
      clamp(this.player.x + Math.cos(a) * d, 0, stage.world.width),
      clamp(this.player.y + Math.sin(a) * d, 0, stage.world.height),
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
      addKills(1);
      this.runKills += 1;
      sound.play('defeat');
      this.effects.push(new DefeatEffect(e.x, e.y, e.config.color, e.radius));
      this.#dropXp(e.x, e.y, e.config.xp);
      if (!noBeans(this.character) && Math.random() < enemyDropChance && this.beans.length < CONFIG.bean.maxCount + maxDroppedBeans) {
        this.beans.push(new Bean(e.x, e.y));
      }
      return false;
    });
  }

  draw() {
    const { ctx } = this;
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    // 床と背景もドット絵なので、小数の位置に貼るときに点を補間させない（ぼやけてキャラのドットとそろわなくなる）
    ctx.imageSmoothingEnabled = false;
    // マップの外 → 木の床 → 壁・小物・ランプ の順に重ねる
    this.background.drawOutside(ctx, this.camera, this.viewW, this.viewH);
    if (CONFIG.floor.enabled) this.floor.draw(ctx, this.camera, this.viewW, this.viewH);
    this.background.draw(ctx, this.camera, this.viewW, this.viewH);
    ctx.restore();

    // 絵（攻撃・豆・粒・敵・ボス・プレイヤー）は、ドット絵にする層に描く。文字はくっきりしたまま
    const pixel = CONFIG.pixelArt.enabled;
    const wctx = pixel ? this.pixelLayer.begin() : ctx;
    wctx.save();
    // ドット絵の層は、プレイヤーをいつも画面の同じ位置に描く（小数のずれでプレイヤーのドットが跳ねないように）
    wctx.translate(this.viewW / 2 - this.player.x, this.viewH / 2 - this.player.y);
    for (const w of this.weapons) {
      w.drawBelow(wctx);
      w.drawLevelFx(wctx, true);
    }
    for (const b of this.beans) b.draw(wctx);
    for (const o of this.xpOrbs) o.draw(wctx);
    for (const w of this.waves) w.draw(wctx);
    for (const e of this.enemies) e.draw(wctx);
    for (const fx of this.effects) fx.draw(wctx);
    if (this.boss && !this.boss.dead) this.boss.draw(wctx);
    this.player.draw(wctx);
    if (this.frozen) this.#drawFreezeWorld(wctx);
    if (this.stoneBurst) this.#drawStoneBurst(wctx);
    for (const w of this.weapons) {
      w.draw(wctx);
      w.drawLevelFx(wctx, false);
    }
    wctx.restore();
    if (pixel) this.pixelLayer.end(ctx);

    if (this.frozen) this.#drawFreezeCountdown();
    if (this.state === 'clear') this.#drawDawn();
    else this.#drawDarkness();

    if (this.state === 'title') {
      this.#drawTitle();
    } else if (this.state === 'select') {
      this.characterSelect.draw(ctx, this.viewW, this.viewH);
    } else {
      this.#drawHud();
      if (this.state === 'paused') this.#drawPauseMenu();
      if (this.state === 'levelup' || this.state === 'carry' || this.state === 'start') this.levelUpMenu.draw(ctx, this.viewW, this.viewH);
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

  // 夜が深まる演出。ランプの周りは少し明るい。まぶたの帳の間はプレイヤーの周り以外が暗くなる
  #drawDarkness() {
    const { ctx } = this;
    if (!this.boss?.has('curtain')) {
      const a = CONFIG.night.maxDarkness * Math.min(1, this.time / CONFIG.boss.timeSec);
      this.background.drawDarkness(ctx, this.camera, this.viewW, this.viewH, a);
      return;
    }
    const px = this.player.x - this.camera.x;
    const py = this.player.y - this.camera.y;
    const r = CONFIG.boss.curtain.visionRadius;
    const g = ctx.createRadialGradient(px, py, r * 0.5, px, py, r);
    g.addColorStop(0, 'rgba(5, 3, 15, 0)');
    g.addColorStop(1, 'rgba(5, 3, 15, 0.93)');
    ctx.fillStyle = g;
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
    if (stage.id === 'extra') {
      ctx.fillStyle = c.xpBar;
      ctx.fillText(stage.name, x + 170, y + 54);
    }

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
    for (const wp of this.weapons) {
      ly += 2;
      drawWeaponIcon(ctx, weaponIdOf(wp), x + 9, ly + 6, 18);
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(243, 230, 216, 0.6)';
      ctx.fillText(`${wp.name}  ${levelLabel(wp.level)}`, x + 22, ly);
      ly += 18;
    }
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
    // 椿の花は枠とは別に出す
    for (const kind of this.camellias) {
      const k = CONFIG.camellia.kinds[kind];
      ly += 2;
      drawItemIcon(ctx, `camellia-${kind}`, x + 9, ly + 6, 18);
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = k.color;
      ctx.fillText(`${k.name}  レア`, x + 22, ly);
      ly += 18;
    }

    this.#drawNotice();
    if (this.boss && !this.boss.dead) this.#drawBossHud();
  }

  #drawNotice() {
    // 選択画面の見出しと重ならないように、選んでいる間は出さない
    if (!this.notice || this.time > this.notice.until || this.state === 'levelup' || this.state === 'start') return;
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
    this.#drawPointCard();
    drawTitleRecords(this.ctx, this.viewW, records());
  }

  // タイトル画面の左下に、ポイントカード（プレイ回数・累計プレイ時間）を出す
  #drawPointCard() {
    const { ctx } = this;
    const { plays, playSec } = pointCard();
    const min = Math.floor(playSec / 60);
    const time = min >= 60 ? `${Math.floor(min / 60)} 時間 ${String(min % 60).padStart(2, '0')} 分` : `${min} 分`;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = font(13);
    ctx.fillStyle = 'rgba(243, 230, 216, 0.75)';
    ctx.fillText(`ポイントカード　プレイ ${plays} 回　累計 ${time}`, 16, this.viewH - 14);
    // 今持っている豆コイン（仕様 016）
    drawCoin(ctx, 24, this.viewH - 44, 7);
    ctx.fillText(`${CONFIG.coins.name} ${coinText(coins())}`, 36, this.viewH - 36);
    ctx.restore();
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
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelup' || this.state === 'carry' || this.state === 'start') return;
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
    const extra = stage.id === 'extra';
    const cx = this.viewW / 2;
    // 1 面は、記録のカード（仕様 001 の User Story 7）の分だけ上から始める
    const rec = this.runRecord;
    const headingY = rec ? this.viewH / 2 - 160 : this.viewH / 2 - 30;
    ctx.fillText(cleared ? (extra ? 'エクストラステージクリア！' : '朝が来た！') : '眠りに落ちた…', cx, headingY);
    let tallyTop;
    if (rec) {
      const r = CONFIG.records.result;
      tallyTop = drawResultRecords(ctx, cx, headingY + r.headingGap, rec.run, rec.result) + r.tallyGap;
    } else {
      ctx.font = font(16);
      ctx.fillText(`生存時間  ${formatTime(this.time)}`, cx, this.viewH / 2 + 10);
      tallyTop = this.viewH / 2 + 30;
    }
    // 豆コインの数え上げ（仕様 016）。明るいクリアの背景でも読めるよう、暗い地のパネルに描く
    let y = tallyTop + 10;
    if (this.coinTally) y = drawCoinTally(ctx, cx, tallyTop, this.coinTally, performance.now()) + 26;
    ctx.fillStyle = cleared ? '#3b2418' : CONFIG.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font(16);
    ctx.fillText(extra ? 'クリック / Space で 1 面からもう一度' : 'クリック / Space でもう一度', this.viewW / 2, y);
    if (cleared && !extra) {
      ctx.font = font(18, true);
      ctx.fillText('E：攻撃を 1 つ持ってエクストラステージへ', this.viewW / 2, y + 36);
    }
  }
}
