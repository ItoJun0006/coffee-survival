export const CONFIG = {
  // タイトル画面。image はロゴ入りのイラストで、読み込めるまでは name を文字で描く
  // zoom はイラストをゆっくり拡大・縮小させる量（0.025 で最大 2.5% 大きくなる）と、1 往復の秒数
  title: {
    name: '珈琲サバイバル',
    subtitle: '〜 眠気に負けるな 〜',
    image: 'assets/images/title.webp',
    background: '#0a0807',
    zoom: { amount: 0.025, periodSec: 12 },
  },
  // プレイ中の絵（キャラ・敵・攻撃など）のドット絵化。size は 1 マスの大きさ（px）。
  // 縁取りは、濃さが solidAlpha 以上のマスの隣で、emptyAlpha 以下のマスに付ける。outline を null にすると縁取りなし
  pixelArt: { enabled: true, size: 3, outline: [20, 12, 8], solidAlpha: 0.7, emptyAlpha: 0.15 },
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
    //   distance＝累計移動距離が pixels 以上（マップの端から端は 2000）、kills＝累計撃破数が count 以上、beans＝累計の拾った豆が count 以上
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
  // ステージ（仕様 011）。main＝1 面、extra＝1 面をクリアしたあとのエクストラステージ
  //   world：マップの広さ、enemySpeedRate：敵の速さの倍率（enemySpeedRates で種類ごとに上書き）、
  //   caffeineDecay：カフェインが時間で減るか、levelUpHealRate：レベルが 1 上がるごとに回復する量（上限に対する割合）、
  //   maxLevel：攻撃とアイテムの上限の Lv、overCapChance：Lv 8 から先（限界突破）の候補が、レベルアップのたびに出る確率
  stages: {
    main: { name: '1 面', world: { width: 2000, height: 2000 }, enemySpeedRate: 1, enemySpeedRates: {}, caffeineDecay: true, levelUpHealRate: 0, maxLevel: 8, overCapChance: 0 },
    extra: { name: 'エクストラステージ', world: { width: 1414, height: 1414 }, enemySpeedRate: 0.85, enemySpeedRates: { ghost: 0.8 }, caffeineDecay: false, levelUpHealRate: 0.1, maxLevel: 16, overCapChance: 0.2 },
  },
  player: {
    radius: 18,
    speed: 220,
    maxCaffeine: 100,
    caffeineDecayPerSec: 2.5,
    invincibleSec: 0.6,
    // 目の色。ドット絵のときは、白目 dotsW × dotsH マス、黒目 pupilW × pupilH マスの四角で描く
    eyes: { white: '#fff8ee', pupil: '#1e120c', dotsW: 3, dotsH: 4, pupilW: 2, pupilH: 2 },
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
  // max は 1 面の上限。エクストラステージでは stages.extra.maxLevel まで上げられ（限界突破）、
  // アイテムの限界突破した段階は、1 段階の効果が overCapItemRate 倍になる
  weaponLevels: { choices: 3, max: 8, damagePerLevel: 0.25, intervalPerLevel: 0.08, minIntervalRate: 0.3, overCapItemRate: 0.5 },
  // 持てる数。weapons は最初の豆マシンガンを含む
  slots: { weapons: 3, items: 2 },
  // ステータス強化アイテム。perLevel は 1 段階（Lv）ごとの効果。最大 Lv は weaponLevels.max と同じ
  items: {
    area: { name: '範囲アップ', desc: 'すべての弾と範囲が\n大きくなる', perLevel: 0.1 },
    frequency: { name: '発生頻度アップ', desc: 'すべての攻撃の\n間隔が短くなる', perLevel: 0.06 },
    power: { name: '攻撃力アップ', desc: 'すべての攻撃の\nダメージが上がる', perLevel: 0.1 },
    xp: { name: '経験値アップ', desc: '経験値の粒から入る\n経験値が増える', perLevel: 0.15 },
  },
  // レア強化「椿の花」（仕様 010）。レベルアップの選択画面を開くたびに chance の確率で、まだ受け取っていない種類が
  // 4 枚目のカードとして出る。アイテムの枠は使わない。1 輪ごとに攻撃の間隔が intervalRate 倍、ダメージが damageRate 倍
  camellia: {
    chance: 0.02,
    intervalRate: 0.75,
    damageRate: 0.9,
    desc: 'すべての攻撃の間隔が\n大きく短くなるが、\nダメージが少し下がる',
    // 種類ごとの名前とカードの色。見た目（アイコン・カードの下地）は item-icons.js と level-up-menu.js で描き分ける
    kinds: {
      yabu: { name: '椿の花・藪椿', color: '#e0566a' },
      coffee: { name: '椿の花・珈琲椿', color: '#f0d58a' },
      ochi: { name: '椿の花・落ち椿', color: '#f2a7b8' },
    },
    // 1 回の挑戦で 3 種類そろえると、実績を解除してスキンを手に入れる
    achievement: { id: 'skin-camellia', text: '実績解除：椿三輪　アラビカのスキン「椿」を手に入れた！' },
    // スキン「椿」を付けられる品種
    skin: { name: '椿', variety: 'arabica' },
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
        8: { count: 3, spreadDeg: 12, pierce: 3, damageRate: 0.6, desc: '豆が 3 つになり、\n3 体まで貫通（威力 6 割）' },
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
    // 豆マシンガン以外の 10 種類は、毎 Lv 共通の強化を受けたうえで、upgrades の Lv に特別な強化を受ける。
    // upgrades の値は Rate で終わるものはかけ算、それ以外は上書きで重なる。true の値は、その武器の同じ名前の設定を使い始める
    mill: {
      name: 'ミル・トルネード', desc: '2 枚の刃が\nまわりを回り続ける', element: 'none', count: 2, orbitRadius: 70, bladeRadius: 12, angularSpeed: 3, damage: 1, hitCooldownSec: 0.5,
      upgrades: {
        2: { count: 3, desc: '刃が 3 枚になる' },
        4: { bladeRate: 1.35, desc: '刃が大きくなる' },
        6: { count: 4, spinRate: 1.2, desc: '刃が 4 枚になり、\n回転が速くなる' },
        // pulse：回る半径が periodSec 周期で minRate〜maxRate 倍に伸び縮みする
        8: { count: 6, pulse: { minRate: 0.65, maxRate: 1.45, periodSec: 2.4 }, desc: '刃が 6 枚になり、\n輪が伸び縮みする' },
      },
      commonDesc: 'ダメージが上がり、\n当たる間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。trailArc は残像の弧の長さ（ラジアン）、edgeRate は明るい縁の幅（刃の半径に対する割合）
      maxVisual: {
        variant: 'A',
        // A：真鍮〜銅色の刃・残像の弧・通り道の帯・舞う挽いた粉
        A: {
          band: 'rgba(120, 70, 35, 0.28)', blade: '#c98a45', edge: '#ffd9a0', edgeRate: 0.25, hub: '#6e3f1f',
          trail: 3, trailArc: 0.7, trailColor: '#d08a45', trailAlpha: 0.45,
          grounds: '#b07848', groundCount: 3, groundSpeed: 1.6, groundDist: 22, groundAlpha: 0.6,
        },
        // B：白銀の刃と、輪の中を渦巻く風の筋
        B: {
          blade: '#dfe6ea', edge: '#ffffff', edgeRate: 0.2, hub: '#6f7c84',
          wind: '#eef4f6', windWidth: 3, windAlpha: 0.6, windSpin: 7, streaks: 8, streakArc: 0.9, trailArc: 0.9,
        },
        // C：削る熱で赤く光る刃と、飛び散る火花
        C: {
          blade: '#5e5a58', edge: '#ff9a3c', edgeRate: 0.22, hub: '#2e2622', glow: '#ff7a2a', glowScale: 2.2, glowAlpha: 0.55,
          spark: '#ffd27a', sparkWidth: 3, sparks: 4, sparkSpeed: 2.2, sparkDist: 26, sparkLen: 6, sparkAlpha: 0.65,
        },
      },
    },
    mug: {
      areaKeys: ['splashRadius'],
      name: 'マグカップ投げ', desc: '投げると戻ってくる。\n敵を貫通する', element: 'none', intervalSec: 1.6, speed: 380, radius: 14, damage: 2, range: 320, hitCooldownSec: 0.4,
      // MAX の、折り返す瞬間に散る熱いしぶき
      splashRadius: 55, splashDamage: 3, splashElement: 'hot',
      upgrades: {
        2: { count: 2, spreadDeg: 14, desc: 'マグが 2 つになる' },
        4: { sizeRate: 1.3, desc: 'マグが大きくなる' },
        6: { rangeRate: 1.3, desc: 'マグが遠くまで飛ぶ' },
        8: { count: 3, spreadDeg: 14, splash: true, speedRate: 0.85, desc: 'マグが 3 つになり、\n折り返しで熱いしぶき' },
      },
      commonDesc: 'ダメージが上がり、\n投げる間隔が縮む',
      // MAX のしぶきの見た目が消えるまでの時間
      splashFxSec: 0.35,
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。tailGapSec は尾の 1 つ分が何秒前の位置か
      maxVisual: {
        variant: 'A',
        // A：熱い珈琲でなみなみのマグ・オレンジの光と湯気・しぶきの円と雫
        A: {
          coffee: '#4a2a17', crema: '#c98a4b', glow: '#ff9a3c', glowScale: 2.2, glowAlpha: 0.5,
          steam: '#f4efe6', steamAlpha: 0.5, wisps: 3, wispHeight: 26, wispSize: 4,
          splashFill: 'rgba(110, 60, 30, 0.45)', splashEdge: '#e8964a', drop: '#7a4526', drops: 9, dropSize: 3,
        },
        // B：赤く焼けたほうろうのマグと炎の尾・放射状に飛ぶしぶき
        B: {
          body: '#d9542b', rim: '#fff1dc', coffee: '#3d2314', glow: '#ff7a2a', glowHot: '#ffc35a', glowAlpha: 0.6, tail: 4, tailGapSec: 0.035,
          spike: '#ffb050', spikes: 14,
        },
        // C：キャラメル色の縁の白いマグと湯気の輪・王冠のように跳ねるしぶき
        C: {
          rim: '#d9a066', coffee: '#4a2a17', crema: '#d9a066', steam: '#f4efe6', steamAlpha: 0.45, tail: 3, tailGapSec: 0.05,
          ring: '#f0c896', drop: '#9a5a30', drops: 12, dropSize: 4, dropLift: 8,
        },
      },
    },
    drip: {
      name: 'ドリップの雨', desc: '敵の頭上に\n熱い雫を降らせる', element: 'hot', intervalSec: 1.2, drops: 3, radius: 40, delaySec: 0.6, damage: 3, range: 500,
      // 雫が落ち始める高さと、着弾の輪が消えるまでの時間
      fallHeight: 220, splashSec: 0.3,
      // 狙う敵が足りないとき、余った雫を落とすプレイヤーのまわりの範囲
      scatterRadius: 180,
      // MAX の、着弾点に残る湯気
      linger: { durationSec: 1, tickSec: 0.5, damageRate: 0.35 },
      upgrades: {
        2: { drops: 4, desc: '雫が 4 つになる' },
        4: { radiusRate: 1.25, desc: '雫の範囲が広がる' },
        6: { drops: 5, spreadTargets: true, desc: '雫が 5 つになり、\n別々の敵を狙う' },
        8: { drops: 8, linger: true, damageRate: 0.75, desc: '雫が 8 つになり、\n着弾点に湯気が残る' },
      },
      commonDesc: 'ダメージが上がり、\n降らせる間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。mist は着弾点に残る湯気の範囲、crown は着弾で跳ねる雫の数
      maxVisual: {
        variant: 'A',
        // A：頭上に銅色のドリッパー・淡いオレンジの芯と光の雫・湯気の尾・湯気の輪
        A: {
          dripper: '#b8733a', dripperRim: '#e0a36a', dripperSize: 10, dripperLift: 40,
          drop: '#a8602e', core: '#ffcf8a', glow: '#ff9a3c', glowRadius: 18, glowAlpha: 0.55,
          steam: '#f4efe6', steamAlpha: 0.45, tail: 3, tailGap: 6,
          splash: '#ffcf8a', crown: 6, mistFill: 'rgba(240, 225, 210, 0.18)', mistEdge: 'rgba(250, 240, 228, 0.8)', wisps: 4, wispHeight: 40,
        },
        // B：光る琥珀色の雨の筋・オレンジに光る湯気の範囲
        B: {
          drop: '#e0883a', glow: '#ffb050', glowRadius: 16, glowAlpha: 0.6, streak: '#ffc87a', streakAlpha: 0.6, streakLen: 34,
          steam: '#ffe2c4', steamAlpha: 0.35,
          splash: '#ffb050', crown: 8, mistFill: 'rgba(255, 140, 60, 0.22)', mistEdge: '#ff9a3c', wisps: 3, wispHeight: 30,
        },
        // C：狙った所の上に小さなドリッパーが現れて落とす・珈琲色の湯気の範囲
        C: {
          dripper: '#b8733a', dripperRim: '#e0a36a', dripperSize: 11,
          drop: '#6b3e22', glow: '#ff9a3c', glowRadius: 14, glowAlpha: 0.45,
          steam: '#f4efe6', steamAlpha: 0.5,
          splash: '#c98a4b', crown: 6, mistFill: 'rgba(70, 38, 20, 0.45)', mistEdge: '#8a5a32', wisps: 5, wispHeight: 46,
        },
      },
    },
    steam: {
      areaKeys: ['range'],
      name: 'スチーム噴射', desc: '扇形に蒸気を吹き、\n敵を押し返す', element: 'hot', intervalSec: 1.8, range: 140, angleDeg: 70, damage: 2, knockback: 300,
      // 吹いた蒸気が消えるまでの時間
      puffLifeSec: 0.35,
      upgrades: {
        2: { angleDeg: 100, desc: '扇が広がる' },
        4: { rangeRate: 1.3, desc: '蒸気が遠くまで届く' },
        // directionsDeg：狙った向きから何度の向きに吹くか（180 は真後ろ）
        6: { directionsDeg: [0, 180], desc: '後ろにも吹く' },
        8: { angleDeg: 360, knockbackRate: 1.4, damageRate: 0.8, desc: '全方向に吹き、\n押し返しが強くなる' },
      },
      commonDesc: 'ダメージが上がり、\n吹く間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。core は芯の暖色の光（coreScale は当たる半径に対する大きさ）
      maxVisual: {
        variant: 'A',
        // A：もこもこした蒸気の雲（芯が暖色・外が白）。外周のかたまりが膨らむ
        A: { core: '#ff9a50', coreScale: 0.8, coreAlpha: 0.6, cloud: '#fbf7f0', cloudAlpha: 0.9, lumps: 22, lumpSize: 18, inner: '#fff1e0', innerAlpha: 0.3 },
        // B：全方向へ吹き出す蒸気の筋と、筋の先の湯気の玉
        B: { core: '#ff9a50', coreScale: 0.6, coreAlpha: 0.6, jet: '#fbf7f0', jetWidth: 5, jetAlpha: 0.85, jets: 16, tipSize: 7 },
        // C：外へ散っていく湯気の粒
        C: { core: '#ffb070', coreScale: 0.7, coreAlpha: 0.5, puff: '#fbf7f0', puffs: 70, puffSize: 9, puffAlpha: 0.8, depth: 0.9 },
      },
    },
    puddle: {
      name: 'こぼれ珈琲', desc: '足元に熱い水たまりを作り、\nダメージを与え続ける', element: 'hot', intervalSec: 2, radius: 50, durationSec: 4, damage: 1, tickSec: 0.5,
      // Lv 6 からの足どめ：上にいる敵の速さを rate 倍にし、離れても sec 秒続く
      slow: { rate: 0.6, sec: 0.3 },
      // MAX の、歩いた跡にこぼれる小さな水たまり。stepPx 進むごとに 1 つ、最大 max 個
      trail: { stepPx: 45, radiusRate: 0.55, durationSec: 1.8, damageRate: 0.6, max: 16 },
      upgrades: {
        2: { durationRate: 1.5, desc: '水たまりが\n長く残る' },
        4: { radiusRate: 1.3, desc: '水たまりが広がる' },
        6: { slow: true, desc: '上にいる敵の\n足が遅くなる' },
        8: { trail: true, desc: '歩いた跡に\n珈琲がこぼれ続ける' },
      },
      commonDesc: 'ダメージが上がり、\nこぼす間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。bubbles・wisps・shimmers は普通の大きさの水たまり 1 つあたりの数
      maxVisual: {
        variant: 'A',
        // A：濃い琥珀色の表面・オレンジの縁取り・ふくらんではじける泡・立ちのぼる湯気
        A: {
          surface: 'rgba(122, 62, 22, 0.65)', rim: '#e8863a', bubble: '#d9a066', bubbles: 6, bubbleSize: 4, bubbleSpeed: 0.7,
          steam: '#f4efe6', steamAlpha: 0.45, wisps: 4, wispHeight: 36,
        },
        // B：回るクレマの渦と、まわりのオレンジの光
        B: {
          surface: 'rgba(80, 42, 20, 0.65)', rim: '#d9a066', glow: '#ff8a3c', glowScale: 1.25, glowAlpha: 0.35,
          swirl: '#e0b07a', swirlAlpha: 0.7, arms: 2, spin: 1.2,
          steam: '#f4efe6', steamAlpha: 0.35, wisps: 3, wispHeight: 30,
        },
        // C：芯が赤く光って煮え立つ表面と、ゆらめく熱
        C: {
          surface: 'rgba(90, 36, 16, 0.55)', rim: '#ff7a3c', heat: '#ff5a1e', heatAlpha: 0.7, bubble: '#ffb070', bubbles: 8, bubbleSize: 3, bubbleSpeed: 1.2,
          shimmer: '#ffd2a0', shimmerAlpha: 0.4, shimmers: 4, shimmerHeight: 30,
        },
      },
    },
    ice: {
      name: 'アイス珈琲', desc: '氷を全方向に飛ばし、\n当たった敵を凍らせる', element: 'ice', intervalSec: 1.5, shards: 6, speed: 360, radius: 7, damage: 1, range: 300, freezeSec: 1.2, refreezeGuardSec: 0.6,
      upgrades: {
        2: { shards: 8, desc: '氷が 8 個になる' },
        4: { freezeRate: 1.35, desc: '長く凍らせる' },
        // shatterRate：凍っている敵に当たったときのダメージの倍率（その敵の凍りは解ける）
        6: { shatterRate: 1.6, desc: '凍った敵を砕いて\n大ダメージ' },
        // pierce：1 個の氷が当たれる敵の数
        8: { shards: 12, pierce: 3, damageRate: 0.7, desc: '氷が 12 個になり、\n3 体まで貫通' },
      },
      commonDesc: 'ダメージが上がり、\n飛ばす間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。sparkle は後ろに残るきらめき（sparkleGap は 1 つ分の間隔 px）
      maxVisual: {
        variant: 'A',
        // A：白い芯とシアンの淡い光をまとい、回りながら飛ぶ 6 本腕の雪の結晶
        A: { arm: '#e6f7ff', core: '#ffffff', glow: '#5fd0ff', glowScale: 2.6, glowAlpha: 0.6, spin: 6, sparkle: '#bff0ff', sparkles: 4, sparkleGap: 8, sparkleAlpha: 0.65 },
        // B：進む向きにとがった氷の槍と、後ろに残る霜
        B: { body: '#a8dcff', core: '#ffffff', width: 0.5, glow: '#5fa8ff', glowScale: 2.4, glowAlpha: 0.55, sparkle: '#d8f2ff', sparkles: 6, sparkleGap: 6, sparkleAlpha: 0.6 },
        // C：回りながらきらめく八角の氷の宝石
        C: { body: '#8fd6ff', core: '#ffffff', glow: '#7fe0ff', glowScale: 2.4, glowAlpha: 0.55, spin: 3, star: '#ffffff', starDist: 1.3, starSize: 0.8, twinkle: 9, sparkle: '#bff0ff', sparkles: 3, sparkleGap: 9, sparkleAlpha: 0.5 },
      },
    },
    espresso: {
      name: 'エスプレッソ・ショット', desc: '一直線に\n敵を貫く', element: 'hot', intervalSec: 2.5, range: 600, width: 10, coreRate: 0.5, damage: 6,
      // 線が消えるまでの時間と、1 体しかいないときに 2 本目を撃つまでの時間
      beamLifeSec: 0.25, shotGapSec: 0.12,
      // MAX のストリーム：durationSec 撃ち続け、狙った向きを中心に sweepDeg なぎ払う。同じ敵には hitCooldownSec ごと
      stream: { durationSec: 0.8, sweepDeg: 50, hitCooldownSec: 0.2 },
      upgrades: {
        2: { shots: 2, desc: '近い 2 体へ\n2 本撃つ' },
        4: { widthRate: 1.6, desc: '線が太くなる' },
        // knockback：当たった敵を撃った向きへ押し返す速さ
        6: { knockback: 180, desc: '当たった敵を\n押し返す' },
        8: { stream: true, damageRate: 0.4, desc: '撃ち続けて\nなぎ払う' },
      },
      commonDesc: 'ダメージが上がり、\n撃つ間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。haloRate・coreRate は当たる太さに対する太さ。playerGlow は撃っている間のプレイヤーの光
      maxVisual: {
        variant: 'A',
        // A：クリーム色の芯・クレマ色の縁・ごく薄いオレンジの光の 3 層と、線の上を流れる湯気の粒
        A: {
          halo: 'rgba(255, 170, 100, 0.22)', haloRate: 2.2, rim: '#c98a4b', core: '#f6e3c2', coreRate: 0.45,
          steam: '#fbf3e6', steamAlpha: 0.6, particles: 14, flow: 1.6, glow: '#ffb070', playerGlow: 34, playerGlowAlpha: 0.7,
        },
        // B：赤く光る縁と濃いエスプレッソの芯。先へ走る光の輪
        B: {
          halo: 'rgba(255, 90, 40, 0.25)', haloRate: 2, rim: '#ff6a2a', core: '#3d2314', coreRate: 0.5,
          pulse: '#ffd27a', pulses: 6, flow: 2.2, glow: '#ff6a2a', tipGlow: 22, playerGlow: 34, playerGlowAlpha: 0.7,
        },
        // C：うねる液体の線と、先から飛び散る雫
        C: {
          rim: '#c98a4b', core: '#f6e3c2', coreRate: 0.25, waveWidth: 0.6, waves: 9, segments: 60, flow: 1.2,
          drop: '#e0b07a', drops: 10, dropDist: 40, glow: '#ffb070', playerGlow: 30, playerGlowAlpha: 0.6,
        },
      },
    },
    press: {
      name: 'フレンチプレス', desc: '近い敵を真上から\n押しつぶす（大ダメージ）', element: 'none', intervalSec: 4, radius: 90, delaySec: 0.8, damage: 10, range: 400,
      // MAX で敵が集まっている所を探すとき、ボスを何体分と数えるか
      bossWeight: 5,
      upgrades: {
        2: { radiusRate: 1.2, desc: '押しつぶす範囲が\n広がる' },
        4: { delayRate: 0.6, desc: '早く落ちる' },
        6: { targets: 2, desc: '2 体を同時に狙う' },
        // crowd：敵が一番集まっている所に落とす。knockback：押しつぶした敵を外へ押し返す速さ
        8: { targets: 1, crowd: true, radiusRate: 1.6, damageRate: 1.5, knockback: 260, desc: '巨大なプレスが\n敵の群れに落ちる' },
      },
      commonDesc: 'ダメージが上がり、\n落とす間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。widthRate・heightRate は当たる半径に対するプレスの大きさ、
      // emptyRate は容器の上の空いている割合、fallHeight は落ち始める高さ、landSec は着地の見た目が消えるまでの時間
      maxVisual: {
        variant: 'A',
        landSec: 0.4,
        // A：予告円と残り時間の線・ガラスの容器のプレス・着地の衝撃の輪と挽いた粉
        A: {
          zone: 'rgba(240, 200, 150, 0.12)', ring: '#f0c896', timer: '#ff9a3c',
          widthRate: 1.1, heightRate: 1.3, emptyRate: 0.45, fallHeight: 320, frame: '#8a8f93', glass: 'rgba(205, 228, 238, 0.5)', coffee: '#4a2a17', crema: '#c98a4b', lid: '#9aa0a4', knob: '#2e2a28', glow: '#fff1dc', glowAlpha: 0.15,
          shock: '#fff1dc', grounds: '#8a5a32', groundCount: 18,
        },
        // B：濃くなっていく影と狙いの十字・銀色のプレス・縁の土ぼこりと床のひび
        B: {
          shadow: 'rgba(10, 6, 4, 0.5)', ring: '#ff8a5a',
          widthRate: 1.1, heightRate: 1.3, emptyRate: 0.45, fallHeight: 320, frame: '#d6dde2', glass: 'rgba(205, 228, 238, 0.45)', coffee: '#3d2314', crema: '#b07848', lid: '#e6ecef', knob: '#6f7c84', glow: '#ffffff', glowAlpha: 0.12,
          crack: '#f0c896', cracks: 9, dust: '#d8c8b0', dustCount: 16, dustSize: 16,
        },
        // C：外から縮んでくる輪・銅色のプレス・王冠のように跳ねる珈琲
        C: {
          ring: '#e0a36a', closing: '#ffcf8a', closingRings: 2, closingSpread: 0.5,
          widthRate: 1.1, heightRate: 1.3, emptyRate: 0.45, fallHeight: 320, frame: '#b8733a', glass: 'rgba(205, 228, 238, 0.45)', coffee: '#4a2a17', crema: '#d9a066', lid: '#c98a45', knob: '#6e3f1f', glow: '#ffb070', glowAlpha: 0.2,
          splash: 'rgba(110, 60, 30, 0.6)', drop: '#7a4526', drops: 16, dropLift: 16,
        },
      },
    },
    latte: {
      name: 'ラテアート', desc: 'ハートの中の敵にダメージ。\n中にいると回復する', element: 'none', intervalSec: 6, radius: 130, durationSec: 2.5, damage: 2, tickSec: 0.5, healPerSec: 3,
      upgrades: {
        2: { durationRate: 1.4, desc: '模様が長く残る' },
        4: { radiusRate: 1.2, desc: '模様が広がる' },
        6: { healRate: 1.5, desc: '中にいるときの\n回復が増える' },
        // follow：模様はいつも 1 枚で、プレイヤーの足元についてくる
        8: { follow: true, healRate: 0.5, desc: '模様が足元に\nついてくる' },
      },
      commonDesc: 'ダメージが上がり、\n描く間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。pulse はゆっくり脈打つ大きさの幅、heartSize は当たる半径に対するハートの大きさ
      maxVisual: {
        variant: 'A',
        // A：チューリップ風の 3 重のハート・キャラメル色の縁・回る泡の点・回復中に浮かぶ白いハート
        A: {
          base: 'rgba(196, 150, 108, 0.45)', layers: ['#faf0e1', '#c98a4b', '#faf0e1'], heartSize: 0.55, pulse: 0.05, pulseSpeed: 2.5,
          rim: '#b8733a', foam: '#fff6ea', foamDots: 14, spin: 0.6, healHeart: '#ffffff', healHearts: 4,
        },
        // B：ロゼッタ（葉の模様）と、回復中のやわらかな光
        B: {
          base: 'rgba(196, 150, 108, 0.45)', milk: '#faf0e1', lineWidth: 5, leaves: 7, pulse: 0.04, pulseSpeed: 2.5,
          rim: '#d9a066', healGlow: 40, healGlowColor: '#ffe2b0',
        },
        // C：大きなハートと、縁の内側を回る小さなハートの輪
        C: {
          base: 'rgba(170, 120, 80, 0.45)', milk: '#faf0e1', heartSize: 0.5, pulse: 0.05, pulseSpeed: 2.5,
          ringHeart: '#f3d9b5', ringHearts: 12, ringHeartSize: 8, spin: 0.5,
          rim: '#c98a4b', healHeart: '#ffffff', healHearts: 3,
        },
      },
    },
    shockwave: {
      name: 'カフェイン・ショックウェーブ', desc: 'カフェインが 7 割以上のとき\n衝撃波で押し返す', element: 'none', intervalSec: 3, minCaffeineRatio: 0.7, speed: 400, maxRadius: 250, thickness: 20, damage: 4, knockback: 400,
      upgrades: {
        2: { minCaffeineRatio: 0.5, desc: 'カフェイン 5 割から\n発動する' },
        4: { radiusRate: 1.3, desc: '衝撃波が遠くまで\n広がる' },
        6: { knockbackRate: 1.5, desc: '押し返しが強くなる' },
        // waves 個の波を waveGapSec おきに出し、押し返すのは最後の波だけ。発動のたびにカフェインを caffeineCost 使う
        8: { waves: 3, waveGapSec: 0.15, caffeineCost: 4, desc: '3 重の波が出る。\nカフェインを 4 使う' },
      },
      commonDesc: 'ダメージが上がり、\n発動の間隔が縮む',
      // Lv 8（MAX）の見た目の 3 案（variant で選ぶ）。flash は発動の瞬間にプレイヤーが光る時間と大きさ
      maxVisual: {
        variant: 'A',
        // A：外側が白っぽい黄色・内側がオレンジの光る円環と火花。3 つ目の波は縁が太い
        A: {
          outer: '#fff2b0', inner: '#ff9a3c', edge: '#fffbe6', pushEdge: 6, spark: '#ffd27a', sparks: 18, sparkLen: 16, sparkAlpha: 0.65,
          flash: '#ffd27a', flashSec: 0.25, flashRadius: 44,
        },
        // B：帯の中をジグザグに走る稲妻の輪
        B: {
          bolt: '#fff27a', width: 3, pushWidth: 6, zigPx: 14, haze: '#ffe066', hazeAlpha: 0.25,
          flash: '#fff27a', flashSec: 0.25, flashRadius: 44,
        },
        // C：クレマ色の波紋と、縁に並ぶ泡
        C: {
          band: 'rgba(217, 160, 102, 0.55)', line: '#f3d9b5', foam: '#fff4e2', foamSize: 3, pushFoam: 5,
          flash: '#f3d9b5', flashSec: 0.25, flashRadius: 40,
        },
      },
    },
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
    // 現れる場所（001 の FR-030）。画面の端から viewPad 外側より遠く、プレイヤーが角から cornerRadius 以内にいるときはその角から cornerRadius 以上離す。
    // 探し方：画面の外の円周上（半径を ringSteps 倍ずつ）を ringTries 回ずつ、だめならマップ全体を anywhereTries 回
    viewPad: 40,
    cornerRadius: 450,
    ringTries: 8,
    ringSteps: [1, 1.3, 1.7],
    anywhereTries: 40,
  },
  // ビッグウェーブ：ときどき durationSec のあいだ、敵の出る量が spawnRate 倍になる。
  // 最初は firstSec、次からは前の始まりから minIntervalSec〜maxIntervalSec 後。ボスの stopBeforeBossSec 前からは来ない
  bigWave: {
    firstSec: 90,
    minIntervalSec: 90,
    maxIntervalSec: 130,
    durationSec: 5,
    spawnRate: 3,
    // ビッグウェーブの間だけ、同時に出ている敵の上限をこの数に上げる
    maxCount: 230,
    stopBeforeBossSec: 30,
    title: 'ビッグウェーブ！',
    text: '眠気が押し寄せてくる…',
  },
  // 珈琲店の木の床（仕様 005）。横長の板を、継ぎ目をずらして並べた板張り
  // size はドット 1 マスの大きさ（pixelArt.size と合わせる）、periodDots は柄 1 枚の大きさ（ドットの数）
  // enabled を false にすると、背景のタイルの床（scenery.floor）になる
  floor: {
    enabled: true,
    size: 3,
    periodDots: 192,
    planks: { width: 8, length: 32 },
    colors: { base: [54, 35, 24], tone: 0.18, gap: [30, 19, 13], grain: 0.08, knot: 0.2 },
  },
  night: { maxDarkness: 0.55 },
  // プレイ中の背景：夜の焙煎工房（background.js）。配置は seed から毎回同じに決まる（当たり判定はない）
  // 床・小物の色は、拾うもの（豆・経験値の粒）や敵より目立たない暗い色にする。
  // floor はタイルの床で、木の床（上の floor）を使わないときだけ描く
  scenery: {
    seed: 20261021,
    // true なら、壁・小物・ランプも木の床と同じ大きさ（pixelArt.size）のドット絵にする
    pixelate: true,
    // ドット絵にしたとき、はっきりした絵（不透明度が pixelArt.solidAlpha より上）の右下 1 マスに落とす影
    dotShadow: { color: [0, 0, 0], alpha: 0.43 },
    outside: '#120c09',
    floor: {
      tileSize: 100,
      tileColors: ['#2c231e', '#2a211c', '#2e2520', '#28201b'],
      tileJitter: 0.05,
      grout: '#1d1612',
      groutWidth: 2,
      stains: 45,
      stainColor: 'rgba(12, 7, 4, 0.28)',
      cracks: 30,
      crackColor: 'rgba(15, 10, 7, 0.55)',
    },
    // 外周のレンガの壁。thickness はマップの外側に描く厚さ
    wall: { thickness: 70, brickW: 46, brickH: 20, brick: '#4a2c22', brickAlt: '#43271e', mortar: '#24170f', top: '#5c3a2c', shadow: 'rgba(0, 0, 0, 0.45)' },
    // 小物。weight は出やすさ、minGap は小物どうしの最小の間隔、clearRadius はスタート地点のまわりの空ける範囲
    props: {
      count: 30,
      minGap: 240,
      edgeMargin: 90,
      clearRadius: 220,
      types: {
        roaster: { weight: 1 },
        sacks: { weight: 3 },
        pallet: { weight: 2 },
        cans: { weight: 2 },
      },
      colors: {
        iron: '#38322e', ironLight: '#4a433e', ironDark: '#231f1c', ember: 'rgba(214, 104, 48, 0.55)',
        burlap: '#5c4c3c', burlapDark: '#4a3d30', stitch: '#3a2f25',
        wood: '#4e3a2c', woodDark: '#3a2b20',
        can: '#5a5d5f', canLight: '#6f7375', canDark: '#3f4244',
      },
    },
    // 天井から下がるランプ。spacing ごとの格子から jitter だけずらして置く
    // 床には常に淡い光の輪を描き、夜の暗さは lightRadius の範囲だけ strength の割合で弱める
    lamps: {
      spacing: 430,
      jitter: 120,
      // ランプの笠は、経験値の粒と見間違えないように、明るい点を描かず暗い輪と支えの線だけにする
      shadeRadius: 13,
      shade: '#1c1714',
      shadeRim: '#4a3a2e',
      pool: 'rgba(255, 190, 120, 0.06)',
      poolRadius: 170,
      lightRadius: 210,
      strength: 0.7,
      // 夜の暗さを描くときの縮小率（小さいほど軽い）。ドット絵の 1 マス（3px）に合わせて 1/3 にする
      darkScale: 1 / 3,
    },
  },
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
