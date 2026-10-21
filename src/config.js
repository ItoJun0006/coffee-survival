export const CONFIG = {
  // タイトル画面。image はロゴ入りのイラストで、読み込めるまでは name を文字で描く
  // zoom はイラストをゆっくり拡大・縮小させる量（0.025 で最大 2.5% 大きくなる）と、1 往復の秒数
  title: {
    name: '珈琲サバイバル',
    subtitle: '〜 眠気に負けるな 〜',
    image: 'assets/images/title.jpg',
    background: '#0a0807',
    zoom: { amount: 0.025, periodSec: 12 },
  },
  // 画面の文字のフォント。Yusei Magic は assets/fonts に置き、css/style.css で読み込む
  font: { family: '"Yusei Magic", system-ui, sans-serif' },
  // 操作キャラ。品種 × 焙煎度の組み合わせで 1 体になる（仮実装）
  // 性能は焙煎度ごとに決める。speedRate・damageRate・attackIntervalRate は標準（中煎り）に対する倍率で、
  // attackIntervalRate は小さいほど攻撃の間隔が短い（連射が速い）。unlocked: false の品種は選択画面に鍵付きで出る
  characters: {
    defaultId: 'arabica-medium',
    varieties: [
      { id: 'arabica', name: 'アラビカ', unlocked: true },
    ],
    roasts: [
      { id: 'light', name: '浅煎り', trait: 'スピード', color: '#c9955e', crease: '#8a5a32', speedRate: 1.35, maxCaffeine: 75, damageRate: 0.8, attackIntervalRate: 0.75 },
      { id: 'medium', name: '中煎り', trait: 'バランス', color: '#8b5a2b', crease: '#4e2f16', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
      { id: 'dark', name: '深煎り', trait: 'パワー', color: '#4a2c1a', crease: '#22130a', speedRate: 0.8, maxCaffeine: 130, damageRate: 1.5, attackIntervalRate: 1.3 },
    ],
    // 条件を満たすと解放されるキャラ。roast は性能と色（品種 × 焙煎度のキャラと同じ形）
    // unlock.type：bossDefeat＝ボスを倒す、allWeaponsMax＝攻撃を上限の数までそろえてすべて最大 Lv、launches＝ゲームを count 回起動、
    //   plays＝ゲームを count 回始める、playTime＝累計プレイ時間が seconds 秒以上（例：{ type: 'playTime', seconds: 3600, text: '…' }）、
    //   distance＝累計移動距離が pixels 以上（マップの端から端は 2000）、kills＝累計撃破数が count 以上
    // drawScale は見た目の大きさの倍率（当たる範囲は変わらない）
    specials: [
      {
        id: 'liberica-large', name: 'リベリカ大粒', drawScale: 1.15,
        roast: { trait: '体力', color: '#7b5434', crease: '#3f2614', speedRate: 0.85, maxCaffeine: 180, damageRate: 1, attackIntervalRate: 1.05 },
        unlock: { type: 'bossDefeat', text: 'ボスを倒してクリアすると解放' },
      },
      {
        id: 'robusta-shot', name: '散弾ロブスタ', startWeapon: 'beanShotgun',
        roast: { trait: 'ショットガン', color: '#5b3b25', crease: '#2b180c', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        unlock: { type: 'allWeaponsMax', text: '1 回のプレイで、攻撃 3 つを\nすべて最大まで強化すると解放' },
      },
      {
        id: 'baby', name: '赤ちゃん豆',
        roast: { trait: '成長', color: '#d9a86c', crease: '#9a6a3e', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        // Lv 1 で from 倍、maxLevel で to 倍になる。見た目の大きさも scaleFrom → scaleTo に育つ
        growth: { from: 0.6, to: 1.8, maxLevel: 30, scaleFrom: 0.7, scaleTo: 1.05 },
        unlock: { type: 'launches', count: 3, text: 'ゲームを 3 回起動すると解放' },
      },
    ],
    // 選択画面に並べるマスの数（最終目標）。まだ中身のないマスは「？？？」として鍵付きで出す
    plannedTotal: 66,
    placeholderUnlockText: '条件達成で解放',
  },
  world: { width: 2000, height: 2000 },
  player: {
    radius: 18,
    speed: 220,
    maxCaffeine: 100,
    caffeineDecayPerSec: 2.5,
    invincibleSec: 0.6,
  },
  bean: {
    radius: 10,
    caffeine: 15,
    fakeCaffeine: 10,
    spawnIntervalSec: 1.0,
    spawnRadius: 600,
    maxCount: 40,
  },
  // 敵が落とす経験値の粒を拾うと経験値が入り、レベルアップごとに攻撃が 1 つ増える
  leveling: {
    baseXp: 5,
    xpGrowth: 4,
    enemyDropChance: 0.4,
    maxDroppedBeans: 60,
    // 全攻撃を手に入れた後のレベルアップで上がる攻撃力
    damageBonusPerLevel: 0.1,
  },
  // レベルアップで出る攻撃の候補の数と、攻撃の強化。Lv が 1 上がるごとに
  // ダメージが damagePerLevel、攻撃の間隔が intervalPerLevel の割合で変わる
  // 攻撃の間隔は、キャラ・強化・アイテムが重なっても元の minIntervalRate 倍より短くしない
  weaponLevels: { choices: 3, max: 8, damagePerLevel: 0.25, intervalPerLevel: 0.08, minIntervalRate: 0.3 },
  // 持てる数。weapons は最初の豆マシンガンを含む
  slots: { weapons: 3, items: 2 },
  // ステータス強化アイテム。perLevel は 1 段階（Lv）ごとの効果。最大 Lv は weaponLevels.max と同じ
  items: {
    area: { name: '範囲アップ', desc: 'すべての弾と範囲が\n大きくなる', perLevel: 0.1 },
    frequency: { name: '発生頻度アップ', desc: 'すべての攻撃の\n間隔が短くなる', perLevel: 0.06 },
    power: { name: '攻撃力アップ', desc: 'すべての攻撃の\nダメージが上がる', perLevel: 0.1 },
    xp: { name: '経験値アップ', desc: '経験値の粒から入る\n経験値が増える', perLevel: 0.15 },
  },
  // 攻撃。element が hot の攻撃はボスに効きやすく、ice は効きにくい
  weapons: {
    // 豆マシンガンは Lv ごとに決まった強化を受ける。共通の強化（ダメージ・間隔）は commonLevels の Lv だけ
    // range は敵を探す距離、豆が飛ぶ距離は（強化前の）range × flightRate
    beanGun: {
      name: '豆マシンガン', desc: '近い敵に豆を\n連射する', element: 'none', intervalSec: 0.35, speed: 520, radius: 6, damage: 1, range: 450, flightRate: 1.5,
      commonLevels: [3, 5, 7],
      upgrades: {
        2: { count: 2, spreadDeg: 10, desc: '豆が 2 つになる' },
        4: { flightRate: 1.4, desc: '豆が遠くまで飛ぶ' },
        6: { rangeRate: 1.3, desc: '遠くの敵も狙う' },
        8: { count: 3, spreadDeg: 12, pierce: true, damageRate: 0.7, desc: '豆が 3 つになり、\n敵を貫通する（威力 7 割）' },
      },
      commonDesc: 'ダメージが上がり、\n連射が速くなる',
      // Lv 8（MAX）の見た目。trail は残像の数と間隔（秒）、flash は撃った瞬間の光
      maxVisual: { glow: '#ffb347', core: '#ffe08a', glowScale: 2.4, trail: 4, trailGapSec: 0.018, flashSec: 0.12, flashRadius: 26 },
    },
    // 散弾ロブスタの最初の武器。豆マシンガンと同じ枠で、同じように強化できる。baseCount は最初の豆の数
    beanShotgun: {
      name: '豆ショットガン', desc: '近い敵に向けて\n豆を扇形にばらまく', element: 'none', intervalSec: 0.85, speed: 480, radius: 6, damage: 0.9, range: 300, flightRate: 1.1,
      baseCount: 5, baseSpreadDeg: 14,
      commonLevels: [3, 5, 7],
      upgrades: {
        2: { count: 6, spreadDeg: 13, desc: '豆が 6 つになる' },
        4: { flightRate: 1.4, desc: '豆が遠くまで飛ぶ' },
        6: { rangeRate: 1.3, desc: '遠くの敵も狙う' },
        8: { count: 8, spreadDeg: 11, pierce: true, damageRate: 0.7, desc: '豆が 8 つになり、\n敵を貫通する（威力 7 割）' },
      },
      commonDesc: 'ダメージが上がり、\n連射が速くなる',
      maxVisual: { glow: '#ffb347', core: '#ffe08a', glowScale: 2.4, trail: 4, trailGapSec: 0.018, flashSec: 0.12, flashRadius: 30 },
    },
    mill: { name: 'ミル・トルネード', desc: '2 枚の刃が\nまわりを回り続ける', element: 'none', count: 2, orbitRadius: 70, bladeRadius: 12, angularSpeed: 3, damage: 1, hitCooldownSec: 0.5 },
    mug: { name: 'マグカップ投げ', desc: '投げると戻ってくる。\n敵を貫通する', element: 'none', intervalSec: 1.6, speed: 380, radius: 14, damage: 2, range: 320, hitCooldownSec: 0.4 },
    drip: { name: 'ドリップの雨', desc: '敵の頭上に\n熱い雫を降らせる', element: 'hot', intervalSec: 1.2, drops: 3, radius: 40, delaySec: 0.6, damage: 3, range: 500 },
    steam: { areaKeys: ['range'], name: 'スチーム噴射', desc: '扇形に蒸気を吹き、\n敵を押し返す', element: 'hot', intervalSec: 1.8, range: 140, angleDeg: 70, damage: 2, knockback: 300 },
    puddle: { name: 'こぼれ珈琲', desc: '足元に熱い水たまりを作り、\nダメージを与え続ける', element: 'hot', intervalSec: 2, radius: 50, durationSec: 4, damage: 1, tickSec: 0.5 },
    ice: { name: 'アイス珈琲', desc: '氷を全方向に飛ばし、\n当たった敵を凍らせる', element: 'ice', intervalSec: 1.5, shards: 6, speed: 360, radius: 7, damage: 1, range: 300, freezeSec: 1.2 },
    espresso: { name: 'エスプレッソ・ショット', desc: '一直線に\n敵を貫く', element: 'hot', intervalSec: 2.5, range: 600, width: 10, damage: 6 },
    press: { name: 'フレンチプレス', desc: '近い敵を真上から\n押しつぶす（大ダメージ）', element: 'none', intervalSec: 4, radius: 90, delaySec: 0.8, damage: 10, range: 400 },
    latte: { name: 'ラテアート', desc: 'ハートの中の敵にダメージ。\n中にいると回復する', element: 'none', intervalSec: 6, radius: 130, durationSec: 2.5, damage: 2, tickSec: 0.5, healPerSec: 3 },
    shockwave: { name: 'カフェイン・ショックウェーブ', desc: 'カフェインが 7 割以上のとき\n衝撃波で押し返す', element: 'none', intervalSec: 3, minCaffeineRatio: 0.7, speed: 400, maxRadius: 250, thickness: 20, damage: 4, knockback: 400 },
  },
  // 倒した敵が落とす経験値の粒。magnetRadius 以内に近づくと吸い寄せられる
  // maxCount を超えたら新しい粒は作らず、今ある粒に経験値をまとめる
  xpOrb: { radius: 5, magnetRadius: 110, magnetSpeed: 420, maxCount: 300, color: '#f0d58a' },
  // 眠気の化身の手下。xp は倒したときに落とす経験値
  enemies: {
    sheep: { name: 'うとうと羊', color: '#e8e2d6', xp: 1, radius: 16, speed: 70, hp: 2, appearSec: 0, weight: 6, contactCaffeine: 5 },
    slime: { name: 'まぶたスライム', color: '#7a5c8e', xp: 2, radius: 18, speed: 50, hp: 4, appearSec: 120, weight: 2, drainPerSec: 12 },
    ghost: { name: 'ふとんゴースト', color: '#b9c4d8', xp: 2, radius: 20, speed: 90, hp: 3, appearSec: 240, weight: 2, slowSec: 1.5, slowFactor: 0.5 },
  },
  // 敵を倒したときのエフェクト
  effects: {
    defeat: { durationSec: 0.45, particles: 12, speed: 200 },
  },
  // 時間とともに敵が強くなる。出現した時点の生存時間（分）× 倍率ぶん、標準より強くなる
  // 例：hpPerMin 0.35 なら、10:00 に出た敵の体力は 1 + 0.35 × 10 = 4.5 倍
  enemyScaling: { hpPerMin: 0.35, speedPerMin: 0.04, damagePerMin: 0.06 },
  // 敵の出現。rampSec かけて、出現の間隔が start → min に縮み、1 回に出る数が startGroup → endGroup に増える
  spawn: {
    startIntervalSec: 0.9,
    minIntervalSec: 0.3,
    rampSec: 480,
    startGroup: 1,
    endGroup: 3,
    maxCount: 150,
  },
  night: { maxDarkness: 0.55 },
  // ラスボス：眠気の化身 ネムリーヌ
  boss: {
    name: '眠気の化身 ネムリーヌ',
    timeSec: 600,
    radius: 70,
    hp: 600,
    speed: 40,
    contactCaffeine: 30,
    elementMultiplier: { hot: 1.5, ice: 0.5 },
    // 目が開いている間は被ダメージが増える
    eyeCycleSec: 5,
    eyeOpenSec: 1.5,
    eyeOpenMultiplier: 3,
    // 形態ごとに使える攻撃（HP 割合が下がるほど増える）
    phases: [
      { minHpRatio: 2 / 3, abilities: ['yawn', 'summon'] },
      { minHpRatio: 1 / 3, abilities: ['yawn', 'summon', 'curtain', 'lullaby'] },
      { minHpRatio: 0, abilities: ['yawn', 'summon', 'curtain', 'lullaby', 'pull', 'dream'] },
    ],
    yawn: { intervalSec: 3.5, speed: 170, thickness: 16, maxRadius: 900, caffeine: 15 },
    summon: { intervalSec: 6, count: 5 },
    curtain: { visionRadius: 230 },
    lullaby: { lagSec: 0.35 },
    pull: { strength: 110 },
    dream: { fakeRatio: 0.4 },
  },
  // 音。BGM はブラウザの中で組み立てるローファイ調の曲（音楽ファイルは使わない）
  // chords は 1 小節ごとの和音（音名＋オクターブ）。bass は各小節の根音
  audio: {
    volume: { master: 0.8, music: 0.9, sfx: 0.6 },
    pausedMusicRate: 0.35,
    // 遊ぶ人が変えられる BGM の音量（%）。volume.music にこの割合をかける
    musicVolume: { default: 80, step: 10 },
    fadeOutSec: 2.5,
    crackle: 0.08,
    musicCutoffHz: 3200,
    swing: 0.28,
    music: {
      normal: {
        bpm: 72,
        chords: [
          ['D3', 'F3', 'A3', 'C4', 'E4'],
          ['G2', 'F3', 'B3', 'E4'],
          ['C3', 'E3', 'G3', 'B3', 'D4'],
          ['A2', 'G3', 'C4', 'E4'],
        ],
        bass: ['D2', 'G1', 'C2', 'A1'],
      },
      boss: {
        bpm: 80,
        chords: [
          ['A2', 'C3', 'E3', 'G3', 'B3'],
          ['F2', 'A2', 'C3', 'E3', 'G3'],
          ['D3', 'F3', 'A3', 'C4', 'E4'],
          ['E2', 'G#2', 'D3', 'F3'],
        ],
        bass: ['A1', 'F1', 'D2', 'E1'],
      },
    },
  },
  colors: {
    ground: '#2a1a12',
    grid: '#33221a',
    playerSlowed: '#8fa3c8',
    bean: '#8b5a3c',
    fakeBean: '#7d5a78',
    beanLine: '#3b2418',
    bullet: '#6b3e22',
    yawn: '#b7a6e0',
    hudBg: 'rgba(0,0,0,0.45)',
    hudBar: '#d9a066',
    xpBar: '#f0d58a',
    bossBar: '#9b7fd1',
    itemCard: '#8fc7a0',
    text: '#f3e6d8',
  },
};
