export const CONFIG = {
  title: { name: 'コーヒーサバイバル', subtitle: '〜 眠気に負けるな 〜' },
  // 操作キャラ。品種 × 焙煎度の組み合わせで 1 体になる（仮実装）
  // 性能は焙煎度ごとの倍率。unlocked: false の品種は選択画面に鍵付きで出る
  characters: {
    defaultId: 'arabica-medium',
    varieties: [
      { id: 'arabica', name: 'アラビカ', unlocked: true },
    ],
    roasts: [
      { id: 'light', name: '浅煎り', trait: 'すばやい', color: '#c9955e', crease: '#8a5a32', speedRate: 1.15, maxCaffeine: 85, damageRate: 1 },
      { id: 'medium', name: '中煎り', trait: 'バランス型', color: '#8b5a2b', crease: '#4e2f16', speedRate: 1, maxCaffeine: 100, damageRate: 1 },
      { id: 'dark', name: '深煎り', trait: '力強い', color: '#4a2c1a', crease: '#22130a', speedRate: 0.9, maxCaffeine: 100, damageRate: 1.25 },
    ],
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
  // 豆を拾うと経験値が入り、レベルアップごとに攻撃が 1 つ増える
  leveling: {
    xpPerBean: 1,
    baseXp: 5,
    xpGrowth: 5,
    enemyDropChance: 0.4,
    maxDroppedBeans: 60,
    // 全攻撃を手に入れた後のレベルアップで上がる攻撃力
    damageBonusPerLevel: 0.1,
  },
  // 攻撃。element が hot の攻撃はボスに効きやすく、ice は効きにくい
  weapons: {
    beanGun: { name: '豆マシンガン', element: 'none', intervalSec: 0.35, speed: 520, radius: 6, damage: 1, range: 450 },
    mill: { name: 'ミル・トルネード', element: 'none', count: 2, orbitRadius: 70, bladeRadius: 12, angularSpeed: 3, damage: 1, hitCooldownSec: 0.5 },
    mug: { name: 'マグカップ投げ', element: 'none', intervalSec: 1.6, speed: 380, radius: 14, damage: 2, range: 320, hitCooldownSec: 0.4 },
    drip: { name: 'ドリップの雨', element: 'hot', intervalSec: 1.2, drops: 3, radius: 40, delaySec: 0.6, damage: 3, range: 500 },
    steam: { name: 'スチーム噴射', element: 'hot', intervalSec: 1.8, range: 140, angleDeg: 70, damage: 2, knockback: 300 },
    puddle: { name: 'こぼれ珈琲', element: 'hot', intervalSec: 2, radius: 50, durationSec: 4, damage: 1, tickSec: 0.5 },
    ice: { name: 'アイス珈琲', element: 'ice', intervalSec: 1.5, shards: 6, speed: 360, radius: 7, damage: 1, range: 300, freezeSec: 1.2 },
    espresso: { name: 'エスプレッソ・ショット', element: 'hot', intervalSec: 2.5, range: 600, width: 10, damage: 6 },
    press: { name: 'フレンチプレス', element: 'none', intervalSec: 4, radius: 90, delaySec: 0.8, damage: 10, range: 400 },
    latte: { name: 'ラテアート', element: 'none', intervalSec: 6, radius: 130, durationSec: 2.5, damage: 2, tickSec: 0.5, healPerSec: 3 },
    shockwave: { name: 'カフェイン・ショックウェーブ', element: 'none', intervalSec: 3, minCaffeine: 70, speed: 400, maxRadius: 250, thickness: 20, damage: 4, knockback: 400 },
  },
  // 眠気の化身の手下
  enemies: {
    sheep: { name: 'うとうと羊', radius: 16, speed: 70, hp: 2, appearSec: 0, weight: 6, contactCaffeine: 5 },
    slime: { name: 'まぶたスライム', radius: 18, speed: 50, hp: 4, appearSec: 60, weight: 2, drainPerSec: 12 },
    ghost: { name: 'ふとんゴースト', radius: 20, speed: 90, hp: 3, appearSec: 120, weight: 2, slowSec: 1.5, slowFactor: 0.5 },
  },
  spawn: {
    startIntervalSec: 1.6,
    minIntervalSec: 0.4,
    rampSec: 240,
    maxCount: 80,
  },
  night: { maxDarkness: 0.55 },
  // ラスボス：眠気の化身 ネムリーヌ
  boss: {
    name: '眠気の化身 ネムリーヌ',
    timeSec: 300,
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
    text: '#f3e6d8',
  },
};
