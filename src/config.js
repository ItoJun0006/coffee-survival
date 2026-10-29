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
  // 自分の記録（自己ベスト。仕様 001 の User Story 7。見せ方は C「3 枚のカード」）
  //   result：結果画面のカード（今回の数を大きく、下に自己ベスト）。titleCard：タイトル画面の右上の小さなカード
  records: {
    labels: { time: '生存時間', kills: '倒した敵', level: '到達レベル' },
    titleLabels: { time: '最長生存', kills: '最多撃破', level: '最高 Lv', clears: 'クリア' },
    none: '自己ベスト　記録なし',
    updated: '自己ベスト更新！',
    best: 'ベスト',
    result: { w: 150, h: 96, gap: 16, headingGap: 30, tallyGap: 18 },
    titleCard: { w: 92, h: 54, gap: 8, top: 56, right: 16 },
    colors: {
      panel: 'rgba(20, 12, 8, 0.85)', edge: 'rgba(243, 230, 216, 0.35)', titleEdge: 'rgba(240, 213, 138, 0.6)',
      label: 'rgba(243, 230, 216, 0.75)', best: 'rgba(243, 230, 216, 0.6)', value: '#f3e6d8', gold: '#f0d58a',
      ribbon: '#c0392b', ribbonText: '#fff4e2',
    },
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
    // 品種（仕様 016）。並びは選択画面の順（2 段目から）で、値段の安い順。品種 × 焙煎度（浅煎り・中煎り・深煎り）で 3 体になる
    //   origin：由来（買うポップアップに出す）、trait：特徴の一言、price：豆コインの値段（アラビカは最初から使える）、
    //   require：買えるようになる条件（高級品種だけ。書き方は下の specials の require と同じ）
    //   power：特別な力（powers のキー）、rates：焙煎度の性能に掛ける倍率（speed＝移動の速さ、caffeine＝カフェイン上限、
    //   damage＝攻撃力、interval＝攻撃の間隔）
    //   pattern は見た目の模様。kind は模様の種類（絵は entities/variety-look.js）、color は模様の色、
    //   lightColor は浅煎りのときの色（豆の色が明るく、color では目立たない模様だけ）
    varieties: [
      {
        id: 'arabica', name: 'アラビカ', origin: '珈琲豆の代表的な種類', trait: '基本', price: 0, power: null,
        rates: { speed: 1, caffeine: 1, damage: 1, interval: 1 }, pattern: null,
      },
      {
        id: 'bourbon', name: 'ブルボン', origin: 'インド洋のブルボン島（今のレユニオン島）で広まった品種', trait: '打たれ強い', price: 50, power: 'beanHeal',
        rates: { speed: 0.95, caffeine: 1.05, damage: 0.95, interval: 1 }, pattern: { kind: 'dots', color: '#f3dcb4', lightColor: '#604937' },
      },
      {
        id: 'typica', name: 'ティピカ', origin: '古くから育てられてきた品種', trait: 'まっすぐ', price: 60, power: 'area',
        rates: { speed: 1, caffeine: 0.95, damage: 1, interval: 1 }, pattern: { kind: 'vstripe', color: '#f0d9b0', lightColor: '#5f4836' },
      },
      {
        id: 'caturra', name: 'カトゥーラ', origin: 'ブルボンから生まれた、背の低い品種', trait: '小回り', price: 80, power: 'runGun',
        rates: { speed: 1.1, caffeine: 0.9, damage: 0.95, interval: 1 }, pattern: { kind: 'hstripe', color: '#e9c07a', lightColor: '#6f5335' },
      },
      {
        id: 'mocha', name: 'モカ', origin: 'イエメンのモカ港から積み出された小粒の豆', trait: '俊足', price: 100, power: 'magnet',
        rates: { speed: 1.15, caffeine: 0.85, damage: 0.97, interval: 1 }, pattern: { kind: 'freckles', color: '#fff2d6', lightColor: '#624d3e' },
      },
      {
        id: 'mundo-novo', name: 'ムンドノーボ', origin: 'ブラジルで生まれた丈夫な品種', trait: '粘り強い', price: 120, power: 'saver',
        rates: { speed: 0.9, caffeine: 1.1, damage: 0.95, interval: 1 }, pattern: { kind: 'belt', color: '#7fbf6a', lightColor: '#3d7f33' },
      },
      {
        id: 'kilimanjaro', name: 'キリマンジャロ', origin: 'タンザニアのキリマンジャロ山のふもと', trait: '力持ち', price: 140, power: 'standFirm',
        rates: { speed: 0.9, caffeine: 1.05, damage: 1.05, interval: 1.05 }, pattern: { kind: 'peak', color: '#ffffff' },
      },
      {
        id: 'mandheling', name: 'マンデリン', origin: 'インドネシア・スマトラ島', trait: '重厚', price: 160, power: 'guard',
        rates: { speed: 0.9, caffeine: 1.1, damage: 1, interval: 1.05 }, pattern: { kind: 'diag', color: '#d9a066', lightColor: '#62432c' },
      },
      {
        id: 'catuai', name: 'カトゥアイ', origin: 'ムンドノーボとカトゥーラを掛け合わせた品種', trait: '連射', price: 180, power: 'xp',
        rates: { speed: 1, caffeine: 1, damage: 0.9, interval: 0.95 }, pattern: { kind: 'checker', color: '#f0c674', lightColor: '#715534' },
      },
      {
        id: 'kona', name: 'コナ', origin: 'ハワイ島のコナ地区', trait: '軽快', price: 200, power: 'magnet',
        require: { type: 'playTime', seconds: 7200, text: '累計プレイ時間が 2 時間になる' },
        rates: { speed: 1.05, caffeine: 0.95, damage: 0.95, interval: 1 }, pattern: { kind: 'flower', color: '#ff8fb1', lightColor: '#e8457a' },
      },
      {
        id: 'pacas', name: 'パーカス', origin: 'エルサルバドルで見つかったブルボンの仲間', trait: '身軽', price: 240, power: 'runGun',
        rates: { speed: 1.1, caffeine: 0.95, damage: 0.9, interval: 1 }, pattern: { kind: 'star', color: '#ffe066', lightColor: '#6b3a10' },
      },
      {
        id: 'villa-sarchi', name: 'ビジャサルチ', origin: 'コスタリカで見つかったブルボンの仲間', trait: '早撃ち', price: 260, power: 'area',
        rates: { speed: 1, caffeine: 0.9, damage: 1, interval: 0.95 }, pattern: { kind: 'zigzag', color: '#f5b971', lightColor: '#735133' },
      },
      {
        id: 'sl28', name: 'SL28', origin: 'ケニアで選び出された品種', trait: '一撃', price: 280, power: 'standFirm',
        rates: { speed: 0.95, caffeine: 0.95, damage: 1.1, interval: 1.05 }, pattern: { kind: 'spots', color: '#d9534f', lightColor: '#b0302a' },
      },
      {
        id: 'yirgacheffe', name: 'イルガチェフェ', origin: 'エチオピアの産地。珈琲のふるさと', trait: '華やか', price: 360, power: 'xp',
        rates: { speed: 1.05, caffeine: 0.9, damage: 1, interval: 1 }, pattern: { kind: 'petals', color: '#fff4c2', lightColor: '#624e3a' },
      },
      {
        id: 'toraja', name: 'トラジャ', origin: 'インドネシア・スラウェシ島', trait: '堅実', price: 380, power: 'beanHeal',
        rates: { speed: 0.95, caffeine: 1, damage: 1, interval: 1 }, pattern: { kind: 'chevron', color: '#e74c3c', lightColor: '#b34031' },
      },
      {
        id: 'blue-mountain', name: 'ブルーマウンテン', origin: 'ジャマイカのブルーマウンテン山脈', trait: '万能', price: 400, power: 'magnet',
        require: { type: 'kills', count: 5000, text: '倒した敵が累計 5,000 体になる' },
        rates: { speed: 0.98, caffeine: 0.98, damage: 0.98, interval: 1 }, pattern: { kind: 'mountains', color: '#6fa8dc', lightColor: '#3f6fb0' },
      },
      {
        id: 'geisha', name: 'ゲイシャ', origin: 'エチオピアのゲシャ村から広まった、高級な品種', trait: '一点豪華', price: 1000, power: 'area',
        require: { type: 'extraClear', text: 'エクストラステージをクリアする' },
        rates: { speed: 1.05, caffeine: 0.85, damage: 1.1, interval: 1.05 }, pattern: { kind: 'sparkle', color: '#ffe9a8', lightColor: '#fffdf2' },
      },
    ],
    roasts: [
      { id: 'light', name: '浅煎り', trait: 'スピード', color: '#c9955e', crease: '#8a5a32', speedRate: 1.35, maxCaffeine: 75, damageRate: 0.8, attackIntervalRate: 0.75 },
      { id: 'medium', name: '中煎り', trait: 'バランス', color: '#8b5a2b', crease: '#4e2f16', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
      { id: 'dark', name: '深煎り', trait: 'パワー', color: '#4a2c1a', crease: '#22130a', speedRate: 0.8, maxCaffeine: 130, damageRate: 1.5, attackIntervalRate: 1.3 },
    ],
    // ピーベリー（仕様 017）：攻撃の数（countKeys）をいつも 1 にし、本来の数 N に応じて威力を N^damageExp 倍、
    // 攻撃の間隔を N^intervalExp 分の 1 にする。数のない武器（offWeapons）は、レベルアップの候補に出る割合を offRate 倍にする。
    // ダイスケ豆（仕様 019）：periodSec ごとに、startSec 秒目から stopSec 秒のあいだ、移動と攻撃が止まる。
    // 止まっていた間に出ていたはずの回数ぶんを、止まり終わった瞬間にまとめて撃つ（maxBurst 回まで）
    // 固まっている間は、豆が石のように灰色になり、頭の上の砂時計の砂が落ちていく。解けた瞬間に石が弾ける
    // （burstSec 秒、大きさ shardSize px のかけら shards 個が burstDist px まで飛ぶ）
    freeze: { periodSec: 60, startSec: 55, stopSec: 5, maxBurst: 30, countdownColor: '#9cc7e8',
      glass: '#e6d6b8', sand: '#f0d58a', stone: 'rgba(120, 110, 100, 0.55)', stoneShard: '#8a8078', burstSec: 0.5, shards: 12, burstDist: 64, shardSize: 10 },
    // こーひー3兄弟（仕様 018）：攻撃の数（focus.countKeys）を countRate 倍にし、その攻撃の 1 発の威力を damageRate 倍にする。
    // 吹く向きは、それぞれの左右 sideDeg にも足す。弾が同じ向きに重ならないよう、広がりを spreadDeg 以上にする。
    // 見た目は、浅煎り・中煎り・深煎りの 3 粒を串に刺したもの（stick は串の色、tiltDeg は串の傾き）
    multi: { countRate: 3, damageRate: 0.2, sideDeg: 25, spreadDeg: 10, stick: '#c9a46a', stickDark: '#8a6a3a', tiltDeg: 15 },
    focus: { countKeys: ['count', 'drops', 'shots', 'directionsDeg'], damageExp: 0.65, intervalExp: 0.35, offWeapons: ['puddle', 'shockwave', 'ice'], offRate: 0.5 },
    // クリエイター豆（仕様 021）：珈琲豆が出ず、レベルアップの 3 枚のうち 1 枚が必ずエナジードリンク（選ぶと上限の healRate 回復）。
    // startLevel より上は、Lv が 1 上がるごとにダメージ・攻撃の速さ・移動の速さが rate 倍ずつ伸びる（maxRate 倍まで）。経験値は xpRate 倍。
    // 見た目は赤いヘッドホンとエナジードリンクの缶（band はヘッドホンの輪、cup は耳あて、can は缶、bolt は缶の稲妻、rim は缶のふち）
    creator: {
      startLevel: 10, rate: 1.15, maxRate: 10, xpRate: 1.2,
      drink: { name: 'エナジードリンク', desc: 'カフェインを\n上限まで回復する', healRate: 1, text: 'エナジードリンクで目が覚めた！' },
      colors: { band: '#2b2b33', cup: '#e04848', can: '#2fd06a', bolt: '#ffe14a', rim: '#c9d3d9' },
    },
    // ドラゴン豆（仕様 022）：レベルアップの画面で、1 回の画面につき 1 度、豆コイン price 枚で「もう 1 つ選ぶ」を買える（1 回のプレイで maxPerRun 回まで）。
    // 仕入れの条件は、1 面のクリア後に bossChance の確率で現れるドラゴンのボスを倒すこと（ボスは敵係）。
    // 見た目は角（horn）と濃い緑の翼としっぽ（wing）、吊り目（eyeCut：目の内側の上を豆の色でかくす割合）
    dragon: {
      price: 30, maxPerRun: 3, bossChance: 0.05,
      colors: { horn: '#f3e3b0', wing: '#1f5a2a' }, eyeCut: 0.55,
    },
    // 双子豆（仕様 080）：同じ武器をいくつでも持てる（どれも攻撃の枠を 1 つ使う）。同じ武器の 2 つ目からは威力 copyDamageRate 倍で、
    // 攻撃の間隔を N 等分した時間ずつずらして撃ち、青白い光の縁（copyGlow）を付けて描く（武器の仕組みと絵はメイン）。
    // キャラの見た目は、roastIds の 2 粒（size は 1 粒の大きさ、gap は 2 粒の間。どちらも r に対する割合）が手（hand の色）をつなぐ形
    twin: {
      copyDamageRate: 0.7, copyGlow: '#9fe3ff',
      roastIds: ['medium', 'dark'], size: 0.62, gap: 0.55, hand: '#e9c79a',
    },
    // 豆の形（shape）。ふつうの豆は楕円で、shape のあるキャラだけこの形で描く。値は r に対する割合。
    // drop（しずく形。リベリカ大粒。2026-10-27 の朝のデザイン案から A に決めた）：start から、3 次ベジェ曲線（制御点 2 つと終点）を順につなぐ
    shapes: {
      drop: {
        start: [0, -1.08],
        curves: [
          [0.55, -0.95, 0.92, -0.2, 0.86, 0.35],
          [0.8, 0.85, 0.4, 1.05, 0, 1.05],
          [-0.4, 1.05, -0.8, 0.85, -0.86, 0.35],
          [-0.92, -0.2, -0.55, -0.95, 0, -1.08],
        ],
      },
    },
    // 新しいキャラを足すために外した品種（仕様 016 FR-022。カティモールはクリエイター豆、マラゴジッペはドラゴン豆、パカマラは双子豆のため、仕様 021・022・080）。前に買っていた人には、値段の豆コインを返す
    removedVarieties: [{ id: 'kent', price: 220 }, { id: 'catimor', price: 300 }, { id: 'maragogipe', price: 340 }, { id: 'pacamara', price: 320 }],
    // 特別なキャラ。require の条件を満たすと仕入れられるようになり、price の豆コインで買う（仕様 016 FR-018）。
    // roast は性能と色（品種 × 焙煎度のキャラと同じ形）、origin と desc は買うポップアップに出す
    // require.type：clearCaffeine＝カフェインが上限の ratio 以上のまま 1 面をクリア、maxClears＝Lv 8 の攻撃を持ったまま 1 面をクリアした品種（特別なキャラはそれぞれ 1 種類）の数が count 以上、extraClear＝エクストラステージをクリア、bossDefeat＝ボスを倒す、allWeaponsMax＝攻撃を上限の数までそろえてすべて最大 Lv、launches＝ゲームを count 回起動、
    //   plays＝ゲームを count 回始める、playTime＝累計プレイ時間が seconds 秒以上（例：{ type: 'playTime', seconds: 3600, text: '…' }）、
    //   distance＝累計移動距離が pixels 以上（マップの端から端は 2000）、kills＝累計撃破数が count 以上、beans＝累計の拾った豆が count 以上、
    //   maxLevel＝1 回のプレイで Lv level になる、dragonDefeat＝ドラゴンのボスを倒す（仕様 022）
    // drawScale は見た目の大きさの倍率（当たる範囲は変わらない）
    specials: [
      {
        id: 'liberica-large', name: 'リベリカ大粒', drawScale: 1.15, price: 150, shape: 'drop',
        origin: '大きくて硬いリベリカ種の豆', desc: 'カフェインの上限がとても多い',
        roast: { trait: '体力', color: '#7b5434', crease: '#3f2614', speedRate: 0.85, maxCaffeine: 180, damageRate: 1, attackIntervalRate: 1.05 },
        require: { type: 'bossDefeat', text: 'ボスを倒してクリアする' },
      },
      {
        id: 'robusta-shot', name: '散弾ロブスタ', startWeapon: 'beanShotgun', price: 200,
        origin: '苦みの強いロブスタ種の豆', desc: '最初の攻撃が豆ショットガン',
        roast: { trait: 'ショットガン', color: '#5b3b25', crease: '#2b180c', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: { type: 'allWeaponsMax', text: '1 回のプレイで、攻撃 3 つをすべて最大まで強化する' },
      },
      {
        id: 'baby', name: '赤ちゃん豆', price: 300,
        origin: '育つほど強くなる、小さな若い豆', desc: 'レベルが上がるほど強く、大きくなる',
        roast: { trait: '成長', color: '#d9a86c', crease: '#9a6a3e', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        // Lv 1 で from 倍、maxLevel で to 倍になる。見た目の大きさも scaleFrom → scaleTo に育つ
        growth: { from: 0.6, to: 1.8, maxLevel: 30, scaleFrom: 0.7, scaleTo: 1.05 },
        require: { type: 'launches', count: 3, text: 'ゲームを 3 回起動する' },
      },
      {
        // 攻撃の数がいつも 1 つになるかわりに、1 つが強く速い（仕様 017）。focus の値は下の focus を使う
        id: 'peaberry', name: 'ピーベリー', price: 390, focus: true, eyes: 'one',
        origin: '1 つの実に 1 つだけ丸く育った珈琲豆', desc: '攻撃の数がいつも 1 つ。そのかわり 1 つが強く速い',
        roast: { trait: '一点集中', color: '#7a4a2a', crease: '#3e2414', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: { type: 'maxClears', count: 3, text: '3 種類の品種で、Lv 8 の攻撃を持ったまま 1 面をクリアする' },
      },
      {
        // 攻撃の数が 3 倍になるかわりに、1 発の威力が 20%（仕様 018）。値は下の multi を使う。値段と条件は仮
        // drawScale：3 粒を串に刺すと 1 粒が小さくなるので、見た目だけ大きくする（当たる範囲は変わらない）
        id: 'brothers', name: 'こーひー3兄弟', price: 390, multi: true, drawScale: 1.25,
        origin: 'いつも 3 粒いっしょの兄弟の豆', desc: '攻撃の数が 3 倍。そのかわり 1 発は 20%',
        roast: { trait: '数で押す', color: '#8b5a2b', crease: '#4e2f16', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: null,
      },
      {
        // 毎分 5 秒固まり、止まっていた分の弾を解けた瞬間にまとめて撃つ（仕様 019）。値は下の freeze を使う。値段は仮
        id: 'daisuke', name: 'ダイスケ豆', price: 390, freeze: true, drawScale: 1.3,
        origin: '大きくて、ときどき固まってしまう豆', desc: '毎分 5 秒固まるが、解けた瞬間にためた弾をまとめて撃つ',
        roast: { trait: 'ため撃ち', color: '#6e4426', crease: '#38200f', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: { type: 'clearCaffeine', ratio: 0.5, text: '眠気 50% 以下（カフェイン 50% 以上）のまま 1 面をクリアする' },
      },
      {
        // 豆が出ず、エナジードリンクで眠気をしのぐ。Lv 10 から 1.15 倍ずつ伸びる（仕様 021）。値は上の creator を使う
        id: 'creator', name: 'クリエイター豆', price: 800, creator: true,
        origin: '徹夜で作り続ける、エナジードリンク好きの豆', desc: '豆は出ないが、Lv 10 から 1.15 倍ずつ強くなる',
        roast: { trait: '徹夜', color: '#7d5636', crease: '#3f2818', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: { type: 'maxLevel', level: 30, text: '1 回のプレイで Lv 30 になる' },
      },
      {
        // 豆コインでレベルアップの「もう 1 つ」を買える（仕様 022）。値は上の dragon を使う
        id: 'dragon', name: 'ドラゴン豆', price: 500, dragon: true,
        origin: '豆コインの山を抱えて眠る、竜の子どもの豆', desc: 'レベルアップのとき、豆コインでもう 1 つ選べる',
        roast: { trait: '宝の山', color: '#7a5a2e', crease: '#3d2a12', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: { type: 'dragonDefeat', text: '1 面のクリア後にまれに現れる、ドラゴンのボスを倒す' },
      },
      {
        // 同じ武器をいくつでも持てる（仕様 080）。値は上の twin を使う。drawScale：2 粒並べると 1 粒が小さくなるので、見た目だけ大きくする
        id: 'twin', name: '双子豆', price: 500, twin: true, drawScale: 1.2,
        origin: 'いつも 2 粒いっしょの、ふたごの豆', desc: '同じ攻撃をいくつでも持てる。2 つ目からは威力 70%',
        roast: { trait: 'ふたご', color: '#8b5a2b', crease: '#4e2f16', speedRate: 1, maxCaffeine: 100, damageRate: 1, attackIntervalRate: 1 },
        require: null,
      },
    ],
    // 選択画面に並べるマスの数（最終目標）。まだ中身のないマスは「？？？」として鍵付きで出す
    plannedTotal: 66,
    placeholderUnlockText: '条件達成で解放',
    // 品種の特別な力（仕様 016）。name と desc は選択画面と買うポップアップに出す
    //   beanHealRate：珈琲豆で回復する量の倍率、magnetRate：経験値の粒を吸い寄せ始める距離の倍率、
    //   invincibleSec：攻撃を受けたあとの無敵時間、decayRate：カフェインが時間で減る速さの倍率、
    //   xpRate：経験値の倍率、areaRate：弾と範囲の大きさの倍率、
    //   movingIntervalRate：動いている間の攻撃の間隔の倍率、standingDamageRate：止まっている間のダメージの倍率
    powers: {
      beanHeal: { name: '豆の回復アップ', desc: '珈琲豆で回復する量が 30% 増える', beanHealRate: 1.3 },
      magnet: { name: '吸い寄せ', desc: '経験値の粒を遠くから吸い寄せる', magnetRate: 1.6 },
      guard: { name: '無敵時間アップ', desc: '攻撃を受けたあとの無敵時間が長い', invincibleSec: 1.0 },
      saver: { name: '省エネ', desc: 'カフェインの減りが 20% 遅い', decayRate: 0.8 },
      xp: { name: '経験値アップ', desc: '経験値が 15% 多く入る', xpRate: 1.15 },
      area: { name: '範囲アップ', desc: 'すべての弾と範囲が 10% 大きい', areaRate: 1.1 },
      runGun: { name: '走り撃ち', desc: '動いている間は攻撃の間隔が 10% 短い', movingIntervalRate: 0.9 },
      standFirm: { name: '踏ん張り', desc: '止まっている間はダメージが 20% 上がる', standingDamageRate: 1.2 },
    },
    // 選択画面の性能のバーの範囲（66 体の値がほとんど入る範囲）
    statBars: { speed: [0.6, 1.6], caffeine: [50, 200], power: [0.5, 1.75], rapid: [0.5, 1.5] },
  },
  // 豆コイン（仕様 016）。1 回のプレイが終わったとき（ゲームオーバー・クリア）にたまり、品種を買うのに使う
  //   perMinute：生き延びた 1 分ごとの枚数、killsPerCoin：倒した敵この数ごとに 1 枚、
  //   clear：ボスを倒してクリアしたとき、extraClear：エクストラステージをクリアしたとき
  coins: {
    name: '豆コイン',
    unit: '枚',
    // 2026-10-27 にすべて 2 倍にした（1 分 5 → 10 枚・100 体 → 50 体ごと・クリア 30 → 60 枚・エクストラ 40 → 80 枚。仕様 082）
    perMinute: 10,
    killsPerCoin: 50,
    clear: 60,
    extraClear: 80,
    // 結果画面の数え上げ。rowSec：行が出る間隔、countSec：1 行を数え上げる時間、totalSec：合計に足す時間（秒）
    tally: {
      rowSec: 0.45, countSec: 0.6, totalSec: 0.6,
      labels: { time: '生き延びた時間', kills: '倒した敵', cards: 'レベルアップのカード', clear: 'ボスを倒した', extraClear: 'エクストラステージをクリア' },
      skipHint: '（Space / Enter / クリックで飛ばす）',
      panel: 'rgba(24, 14, 9, 0.88)', border: '#d9a066', text: '#f3e6d8', sub: 'rgba(243, 230, 216, 0.7)', total: '#f0d58a',
    },
    // 豆コインの絵の色（ふち・面・真ん中の豆）
    icon: { edge: '#b8862e', face: '#f2c94c', bean: '#8b5a2b' },
    // 品種を買うメニュー風のポップアップ（喫茶店のメニュー）
    menu: {
      paper: '#f4e8d0', frame: '#8b5a2b', ink: '#3b2418', sub: '#7a5a40', alert: '#c0392b',
      tag: '#3b2418', tagText: '#f0d58a', button: '#d9a066', buttonIdle: 'rgba(59, 36, 24, 0.12)',
      head: '― MENU ―', order: '注文する', cancel: 'やめる', close: 'とじる', shadowAlpha: 0.35,
    },
    // 値段が足りている鍵の色
    affordableLock: '#f0d58a',
    // 豆の証（仕様 081）：1 面の手下を倒すと dropChance の確率で落ちる（1 回のクリアで約 3,400 体倒すので、10 回のクリアで約 1 個）。
    // 拾った証は、そのプレイをクリアしたときだけ自分のものになり、ずっと持ち続ける（max 個まで）。持っている 1 個につき、
    // 結果画面でもらう豆コインが ratePer ずつ増える（足し算。10 個で 2 倍）。max 個持っているときに拾った分は overflowCoins 枚になる。
    // 見た目は青い盾に金のふちと豆（shield・rim・bean・crease）。落ちている証は radius の大きさで、glow の光の輪を付ける
    badge: {
      name: '豆の証', max: 10, ratePer: 0.1, dropChance: 1 / 34000, overflowCoins: 50, radius: 10,
      colors: { shield: '#3d5a8f', rim: '#f2c94c', bean: '#6b3f1f', crease: '#2e1808', glow: 'rgba(255, 230, 140, 0.35)' },
      texts: { picked: '豆の証を拾った！（クリアすると自分のものになる）', row: '豆の証 ×{n}（+{p}%）', overflow: '豆の証（{max} 個をこえた分）×{n}' },
    },
    // 豆をがまんした（仕様 082）：1 回のプレイで出た珈琲豆（偽物を除く）のうち、拾わなかった割合 × max 枚 ×（生き延びた時間 ÷ fullSec 秒。1 まで）。
    // やられてももらえる。豆の証の倍率はかけない。豆が 1 つも出なかったプレイ（クリエイター豆など）はもらえない
    abstain: { max: 100, fullSec: 600, label: '豆をがまんした', detail: '（拾った豆 {picked} / {total} 個）' },
    texts: {
      unlocked: '新しい品種『{name}』が解放された！（浅煎り・中煎り・深煎り）',
      unlockedOne: '新しいキャラ『{name}』が解放された！',
      ready: '『{name}』が仕入れられるようになった！（{price}）',
      require: '条件：{text}',
    },
  },
  // ステージ（仕様 011）。main＝1 面、extra＝1 面をクリアしたあとのエクストラステージ
  //   world：マップの広さ、enemySpeedRate：敵の速さの倍率（enemySpeedRates で種類ごとに上書き）、
  //   caffeineDecay：カフェインが時間で減るか、levelUpHealRate：レベルが 1 上がるごとに回復する量（上限に対する割合）、
  //   maxLevel：攻撃とアイテムの上限の Lv、overCapChance：Lv 8 から先（限界突破）の候補が、レベルアップのたびに出る確率
  //   敵の出方（仕様 060。書いていなければ 1 面と同じ）：enemyTimeOffsetSec：出る数・種類・強さを「経過時間 + この秒数」で決める、
  //   enemyMaxCount：同時に出ている敵の上限、bigWaveMaxCount：ビッグウェーブの間の上限、bigWaveIntervalSec：ビッグウェーブの間隔 [最短, 最長]
  stages: {
    main: { name: '1 面', world: { width: 2000, height: 2000 }, enemySpeedRate: 1, enemySpeedRates: {}, caffeineDecay: true, levelUpHealRate: 0, maxLevel: 8, overCapChance: 0 },
    extra: { name: 'エクストラステージ', world: { width: 1414, height: 1414 }, enemySpeedRate: 1.2, enemySpeedRates: {}, caffeineDecay: false, levelUpHealRate: 0.1, maxLevel: 16, overCapChance: 0.2,
      enemyTimeOffsetSec: 480, enemyMaxCount: 250, bigWaveMaxCount: 330, bigWaveIntervalSec: [60, 90] },
  },
  player: {
    radius: 18,
    // 歩く速さのもとの値（2026-10-24 に 220 から 0.7 倍の 154 にした）
    speed: 154,
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
  // 次のレベルに必要な経験値は baseXp + xpGrowth ×（Lv − 1）+ xpGrowthSq ×（Lv − 1）²（仕様 036。後半ほど上がりにくい）。
  // coinCard：レベルアップの候補に、chance の確率で「豆コイン ＋amount 枚」のカードを 1 枚まぜる（仕様 036）
  leveling: {
    baseXp: 5,
    xpGrowth: 4,
    xpGrowthSq: 1.2,
    // amount は 2026-10-27 に 5 → 10 枚（豆コイン 2 倍、仕様 082）
    coinCard: { chance: 0.5, amount: 10, name: '豆コイン ＋10 枚', desc: '豆コインを 10 枚もらう\n（プレイが終わると\n手に入る）', text: '豆コインを 10 枚もらった！' },
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
  // levelFloor：Lv の強化だけで縮む間隔の倍率の下限（限界突破で 0 以下にならないように）
  // startChoices は、1 面の始めに選ぶ最初の攻撃の候補の数。startGuardMs は、その画面を開いてからクリックを受け付けない時間（仕様 032）
  weaponLevels: { choices: 3, startChoices: 3, startGuardMs: 400, max: 8, damagePerLevel: 0.25, intervalPerLevel: 0.08, minIntervalRate: 0.25, overCapItemRate: 0.5, levelFloor: 0.05 },
  // Lv 2・4・6 で上がる見た目の段階（仕様 014）：攻撃の縁（当たる範囲の内側）に光る線を描く。
  // tiers は段階が上がる Lv。MAX（Lv 8）は武器ごとの maxVisual で描く。配列の値は段階 1・2・3 の順。
  // colors は属性ごとの線の色、width は線の太さ（px）、alpha は濃さ
  weaponLevelVisual: {
    tiers: [2, 4, 6],
    colors: {
      hot: ['#c9733a', '#ff9a3c', '#ffd9a0'],
      ice: ['#4f9fd8', '#7fd8ff', '#e0f8ff'],
      none: ['#a07a58', '#d9a066', '#ffcf8a'],
    },
    width: [3, 3, 6],
    alpha: [0.75, 0.9, 1],
  },
  // 攻撃を強化した直後の見た目（仕様 002 の FR-004。C「金色」）。sec 秒で消える。
  //   ring：攻撃の絵の縁の外側に付ける金色の輪（gap は縁からのすき間）。label：プレイヤーの頭の上に出る「アイコン Lv N ↑」の札
  upgradeFlash: {
    sec: 1.2,
    ring: { color: '#f0d58a', width: 3, gap: 2 },
    label: { offsetY: 96, rise: 24, fadeFrom: 0.6, iconSize: 26, w: 124, h: 36, panel: 'rgba(20, 12, 8, 0.85)', color: '#f0d58a', text: 'Lv {level} ↑' },
  },
  // 持てる数。weapons は最初の豆マシンガンを含む
  slots: { weapons: 3, items: 2 },
  // レベルアップの画面（仕様 015）。カードは黒板のメニュー、出るときは 1 枚ずつめくって表に返す
  levelUpScreen: {
    // 属性ごとの色（属性の表示・NEW の色）
    elementColors: { none: '#7a4f2e', hot: '#c8642a', ice: '#3f7fb0' },
    // カードが 1 枚ずつ出てくる間隔と、1 枚がめくり終わるまでの時間（秒）
    staggerSec: 0.08,
    appearSec: 0.25,
    // 次で MAX になるカードの縁の色
    maxEdge: '#e8c060',
    // カード（黒板のメニュー）。edge は木の枠、text は名前、sub は説明、muted は番号やまだの ● の色
    card: { bg: '#1f2a24', edge: '#6b4a2c', edgeWidth: 7, text: '#f3efe6', sub: 'rgba(243, 239, 230, 0.8)', muted: 'rgba(243, 239, 230, 0.25)' },
    // 種類ごとの色（カードの帯・選んでいるときの光）
    kindColors: { weapon: '#d9a066', item: '#8fc7a0', bonus: '#f0d58a', carry: '#b9a0e0', coins: '#f2c94c' },
    // ドラゴン豆の「もう 1 つ選ぶ」の 4 枚目のカード「竜の宝」（仕様 038）。値段と回数は characters.dragon
    extraPick: {
      title: '竜の宝',
      name: 'もう 1 つ選ぶ',
      leadTwo: '竜の宝で、2 つ選べる！ 1 つ目を選ぶ',
      leadOne: 'もう 1 つ選ぶ',
      notEnough: '豆コインが足りない',
      usedUp: 'このプレイではもう使えない',
      colors: { gold: '#e8c060', scaleBg: '#173d24', scale: 'rgba(120, 200, 140, 0.25)', text: '#f3efe6' },
    },
    // エナジードリンク（仕様 033）：カードの代わりに描く缶。sizeRate はカードの高さに対する缶の高さ、widthRate は缶の高さに対する幅。
    // bobPx・bobSpeed は上下に揺れる幅（px）と速さ、tiltRad は傾きの最大（ラジアン）、bubbles は泡の数
    drink: {
      sizeRate: 0.7,
      widthRate: 0.5,
      bobPx: 5,
      bobSpeed: 3,
      tiltRad: 0.06,
      bubbles: 6,
      title: 'エナジードリンク！',
      text: '眠気を全回復！',
      colors: { body: '#2fb85e', glow: '#7dff9e', rim: '#c9d3d9', rimDark: '#8a959c', bolt: '#ffe14a', tab: '#c9d3d9', bubble: 'rgba(210, 255, 220, 0.8)', title: '#9be8a8' },
    },
  },
  // 攻撃の見え方（仕様 035）：攻撃の絵をまとめて薄くする割合（%）。ポーズメニューで steps を順に切り替え、ブラウザに保存する。
  // previewBackdrop はポーズメニューでこの段を選んでいる間の、後ろを暗くする濃さ（ふだんは 0.6）。後ろのゲーム画面で濃さを確かめられる
  weaponAlpha: {
    steps: [100, 75, 50, 25],
    default: 100,
    label: '攻撃の見え方',
    previewBackdrop: 0.15,
  },
  // レコード棚（仕様 039）：タイトルから入り、豆コインで BGM を買って選ぶ。price は 1 曲の値段（最初の曲は買わなくてよい）。
  // spine は背表紙の大きさ、covers は曲ごとの装丁の色、jacket は曲ごとのジャケットの絵
  recordShelf: {
    price: 150,
    title: 'レコード棚',
    button: '♪ レコード棚（R キー）',
    // 背表紙（布の装丁に紙のラベル）。w・h・gap は 1 冊の幅・高さ・すき間（px）
    spine: { w: 92, h: 270, gap: 16 },
    // 曲ごとの装丁の色。シック（いつもの一杯・真夜中のハンドドリップ）とポップ（モーニングブレンド・ボサノバ）を 2 冊ずつ。
    // main は布の地、sub は上下の帯、foil は値段の札の字、paper はラベルの紙、ink はラベルの字
    covers: {
      normal: { main: '#4a2c1c', sub: '#6b4630', foil: '#d8b46a', paper: '#efe2c4', ink: '#3b2418' },
      midnightDrip: { main: '#1d2747', sub: '#2f3d66', foil: '#c9ced8', paper: '#e6e4dc', ink: '#1d2747' },
      morningBlend: { main: '#e8a33a', sub: '#f3c45e', foil: '#7a2e1c', paper: '#fff4d6', ink: '#a8381e' },
      cafeBossa: { main: '#2f9a8a', sub: '#5cc0a8', foil: '#fff1c8', paper: '#fff4e2', ink: '#1f6a5e' },
    },
    // ジャケット：選んでいる曲の絵を、棚の右の壁に額で飾る。size は絵の一辺の大きさの上限（px）、
    // shelfX は棚のまん中の位置（画面の幅に対する割合。額の分だけ左に寄せる）
    jacket: {
      size: 320,
      shelfX: 0.38,
      images: {
        normal: 'assets/images/art/soundtrack-cover-sepia.jpg',
        morningBlend: 'assets/images/art/cup-moon-sun-logo.jpg',
        midnightDrip: 'assets/images/art/cafe-bean-vs-sleep-cloud.jpg',
        cafeBossa: 'assets/images/art/bean-characters-shelf.jpg',
      },
    },
    // 本棚の木と真鍮の色
    wood: { back: '#2a1a12', side: '#5a3a24', top: '#7a5234', dark: '#3a2416', grain: 'rgba(0, 0, 0, 0.22)', brass: '#c9a25a' },
    texts: {
      playing: '♪ この曲を流している',
      owned: 'Enter / クリックでこの曲にする',
      buy: 'Enter / クリックで買う（豆コイン {price}）',
      notEnough: '豆コインが足りない',
      bought: '「{name}」を買った！',
      help: '←→ で選ぶ　Enter / クリックで決定　Esc / R で戻る',
    },
    colors: { bg: '#1b1310', title: '#f0d58a', sub: 'rgba(243, 230, 216, 0.75)', accent: '#f0d58a', warn: '#e88a6a' },
  },
  // 隠し要素。cafeAuLait：タイトルで word を打つと、豆がカフェオレ色になる（もう一度打つと戻る。仕様 037）
  secrets: {
    cafeAuLait: {
      word: 'COFFEE',
      onText: '隠しコマンド！ 豆がカフェオレ色になった',
      offText: 'カフェオレ色をやめた',
      // カフェオレ色（3 案から A）。color は豆の色、crease は割れ目の色
      look: { color: '#c49a6c', crease: '#7a5232' },
    },
  },
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
      // Lv 2・4・6 の縁の色（仕様 014）。弾が小さく縁で塗りつぶされるので、経験値の粒（金色）と見分けやすい赤銅色にする
      levelColors: ['#a07a58', '#c9733a', '#d0603a'],
      commonLevels: [3, 5, 7],
      upgrades: {
        2: { count: 2, spreadDeg: 10, desc: '豆が 2 つになる' },
        4: { flightRate: 1.4, desc: '豆が遠くまで飛ぶ' },
        6: { rangeRate: 1.3, desc: '遠くの敵も狙う' },
        8: { count: 3, spreadDeg: 12, pierce: 3, damageRate: 0.6, desc: '豆が 3 つになり、\n3 体まで貫通（威力 60%）' },
      },
      commonDesc: 'ダメージが上がり、\n連射が速くなる',
      // Lv 8（MAX）の見た目。trail は残像の数と間隔（秒）、flash は撃った瞬間の光
      maxVisual: { glow: '#ffb347', core: '#ffe08a', glowScale: 2.4, trail: 4, trailGapSec: 0.018, flashSec: 0.12, flashRadius: 26 },
      // 2 色の豆（仕様 014 の FR-007）。body は豆の色、front は進む側の半分の明るい色。max〜 は Lv 8（MAX）のときの色
      // frontY は明るい部分の中心を進む側へずらす量、frontW・frontH はその大きさ（どれも豆の大きさ radius に対する割合）
      twoTone: { body: '#5a321b', front: '#e8c79a', maxBody: '#8a3f1c', maxFront: '#ffe08a', frontY: 0.3, frontW: 0.58, frontH: 0.6 },
    },
    // 散弾ロブスタの最初の武器。豆マシンガンと同じ枠で、同じように強化できる。baseCount は最初の豆の数
    beanShotgun: {
      name: '豆ショットガン', desc: '近い敵に向けて\n豆を扇形にばらまく', element: 'none', intervalSec: 0.85, speed: 480, radius: 6, damage: 0.9, range: 300, flightRate: 1.1,
      // Lv 2・4・6 の縁の色（仕様 014）。弾が小さく縁で塗りつぶされるので、経験値の粒（金色）と見分けやすい赤銅色にする
      levelColors: ['#a07a58', '#c9733a', '#d0603a'],
      baseCount: 5, baseSpreadDeg: 14,
      commonLevels: [3, 5, 7],
      upgrades: {
        2: { count: 6, spreadDeg: 13, desc: '豆が 6 つになる' },
        4: { flightRate: 1.4, desc: '豆が遠くまで飛ぶ' },
        6: { rangeRate: 1.3, desc: '遠くの敵も狙う' },
        8: { count: 8, spreadDeg: 11, pierce: true, damageRate: 0.7, desc: '豆が 8 つになり、\n敵を貫通する（威力 70%）' },
      },
      commonDesc: 'ダメージが上がり、\n連射が速くなる',
      maxVisual: { glow: '#ffb347', core: '#ffe08a', glowScale: 2.4, trail: 4, trailGapSec: 0.018, flashSec: 0.12, flashRadius: 30 },
    },
    // 豆マシンガン以外の 8 種類は、毎 Lv 共通の強化を受けたうえで、upgrades の Lv に特別な強化を受ける。
    // upgrades の値は Rate で終わるものはかけ算、それ以外は上書きで重なる。true の値は、その武器の同じ名前の設定を使い始める
    mill: {
      // knockback：刃に当たった敵を、プレイヤーから外向きに押し返す速さ（ボスには効かない）
      // overflow：当たる間隔の強化が下限（weaponLevels.minIntervalRate）からあふれた分を、刃の数に変える。
      //   あふれた割合が perBlade たまるごとに刃を 1 枚足す（maxExtra 枚まで）。ピーベリーは数が 1 のままなので足さない
      name: 'ミル・トルネード', desc: '2 枚の刃が\nまわりを回り続け、\n敵を押し返す', element: 'none', count: 2, orbitRadius: 70, bladeRadius: 12, angularSpeed: 3, damage: 1, hitCooldownSec: 0.5, knockback: 200,
      overflow: { perBlade: 0.2, maxExtra: 6 },
      // slowSpin：Lv untilLevel になるまでは、回る速さを rate 倍にする（2026-10-24）
      slowSpin: { untilLevel: 8, rate: 0.5 },
      // focusSpinExp：ピーベリーは刃が 1 枚になる代わりに、回る速さを「本来の刃の数 ^ focusSpinExp」倍にする（1 なら枚数と同じ倍率。2026-10-24）
      focusSpinExp: 1,
      // limitBreak：限界突破（Lv 9 から）では、everyLevels Lv ごとに刃を 1 枚足し、刃の大きさを shrinkRate 倍にする。
      // fitRate：どの Lv でも、刃どうしが重ならないよう、刃の半径を「隣の刃との距離の半分 × fitRate」までに抑える
      limitBreak: { everyLevels: 2, shrinkRate: 0.9, desc: '刃が 1 枚増え、\n少し小さくなる' },
      fitRate: 0.9,
      upgrades: {
        2: { count: 3, desc: '刃が 3 枚になる' },
        4: { bladeRate: 1.35, desc: '刃が大きくなる' },
        6: { count: 4, spinRate: 1.2, desc: '刃が 4 枚になり、\n回転が速くなる' },
        // hitCooldownRate：同じ敵に当たる間隔のもとの値（hitCooldownSec）にかける倍率（0.5 秒 → 0.35 秒）
        8: { count: 6, bladeRate: 1.3, knockbackRate: 1.3, hitCooldownRate: 0.7, desc: '刃が 6 枚・大きくなり、\n速く当たって強く押し返す' },
      },
      commonDesc: 'ダメージが上がり、\n当たる間隔が縮む',
      // Lv 8（MAX）の見た目：削る熱で赤く光る刃と、飛び散る火花。edgeRate は光る縁の幅（刃の半径に対する割合）、sparkDist は火花が飛ぶ距離（px）
      maxVisual: {
        blade: '#5e5a58', edge: '#ff9a3c', edgeRate: 0.22, hub: '#2e2622', glow: '#ff7a2a', glowScale: 2.2, glowAlpha: 0.55,
        spark: '#ffd27a', sparkWidth: 3, sparks: 4, sparkSpeed: 2.2, sparkDist: 26, sparkLen: 6, sparkAlpha: 0.65,
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
      // Lv 8（MAX）の見た目：熱い珈琲でなみなみのマグ・オレンジの光と湯気・しぶきの円と雫
      maxVisual: {
        coffee: '#4a2a17', crema: '#c98a4b', glow: '#ff9a3c', glowScale: 2.2, glowAlpha: 0.5,
        steam: '#f4efe6', steamAlpha: 0.5, wisps: 3, wispHeight: 26, wispSize: 4,
        splashFill: 'rgba(110, 60, 30, 0.45)', splashEdge: '#e8964a', drop: '#7a4526', drops: 9, dropSize: 3,
      },
    },
    drip: {
      // rainRadius：雫を落とすプレイヤーのまわりの範囲（px）。この中のランダムな場所に落とし、敵は狙わない（2026-10-23 に変更）
      areaKeys: ['rainRadius'],
      name: 'ドリップの雨', desc: 'まわりのランダムな所に\n熱い雫を降らせる', element: 'hot', intervalSec: 1.2, drops: 3, radius: 40, delaySec: 0.6, damage: 3, rainRadius: 220,
      // 雫が落ち始める高さと、着弾の輪が消えるまでの時間。dropSize は落ちてくる雫の大きさ
      fallHeight: 220, splashSec: 0.3, dropSize: 6,
      // MAX の、着弾点に残る湯気
      linger: { durationSec: 1, tickSec: 0.5, damageRate: 0.35 },
      upgrades: {
        2: { drops: 4, desc: '雫が 4 つになる' },
        4: { radiusRate: 1.25, desc: '雫の範囲が広がる' },
        6: { drops: 5, rainRate: 1.25, desc: '雫が 5 つになり、\n降らせる範囲が広がる' },
        8: { drops: 8, linger: true, damageRate: 0.75, desc: '雫が 8 つになり、\n着弾点に湯気が残る' },
      },
      commonDesc: 'ダメージが上がり、\n降らせる間隔が縮む',
      // Lv 8（MAX）の見た目：落とす所の上に小さなドリッパーが現れて落とす・珈琲色の湯気の範囲。mist は着弾点に残る湯気の範囲、crown は着弾で跳ねる雫の数
      maxVisual: {
        dripper: '#b8733a', dripperRim: '#e0a36a', dripperSize: 11, dripperFadeSec: 0.12,
        drop: '#6b3e22', glow: '#ff9a3c', glowRadius: 14, glowAlpha: 0.45,
        steam: '#f4efe6', steamAlpha: 0.5,
        splash: '#c98a4b', crown: 6, crownLift: 10, mistFill: 'rgba(70, 38, 20, 0.45)', mistEdge: '#8a5a32', wisps: 5, wispHeight: 46,
      },
    },
    steam: {
      areaKeys: ['range'],
      name: 'スチーム噴射', desc: '扇形に蒸気を吹き、\n敵を押し返す', element: 'hot', intervalSec: 1.8, range: 140, angleDeg: 70, damage: 2, knockback: 300,
      // 吹いた蒸気が消えるまでの時間
      puffLifeSec: 0.35,
      // Lv 2・4・6 の見た目の目印（仕様 014）：扇のふちに count 個並べる。radius は目印の半径（px）
      levelSpot: { count: 5, radius: 10 },
      upgrades: {
        2: { angleDeg: 100, desc: '扇が広がる' },
        4: { rangeRate: 1.3, desc: '蒸気が遠くまで届く' },
        // directionsDeg：狙った向きから何度の向きに吹くか（180 は真後ろ）
        6: { directionsDeg: [0, 180], desc: '後ろにも吹く' },
        8: { angleDeg: 360, knockbackRate: 1.4, damageRate: 0.8, desc: '全方向に吹き、\n押し返しが強くなる' },
      },
      commonDesc: 'ダメージが上がり、\n吹く間隔が縮む',
      // Lv 8（MAX）の見た目：外へ散っていく湯気の粒。core は芯の暖色の光（coreScale は当たる半径に対する大きさ）
      maxVisual: { core: '#ffb070', coreScale: 0.7, coreAlpha: 0.5, puff: '#fbf7f0', puffs: 70, puffSize: 9, puffAlpha: 0.8, depth: 0.9 },
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
      // Lv 8（MAX）の見た目：濃い琥珀色の表面・オレンジの縁取り・ふくらんではじける泡・立ちのぼる湯気。bubbles・wisps は普通の大きさの水たまり 1 つあたりの数
      maxVisual: {
        surface: 'rgba(122, 62, 22, 0.65)', rim: '#e8863a', bubble: '#d9a066', bubbles: 6, bubbleSize: 4, bubbleSpeed: 0.7,
        steam: '#f4efe6', steamAlpha: 0.45, wisps: 4, wispHeight: 36,
      },
    },
    // 氷を 1 つだけ、directions 方向からランダムに選んだ向きに飛ばす。敵に当たるか range まで飛んだら、その場で氷塊になり、
    // blockRadius の中の敵にまとめてダメージを与えて凍らせる（仕様 012 FR-011。2026-10-23 に作り変えた）
    ice: {
      areaKeys: ['blockRadius'],
      name: 'アイス珈琲', desc: '氷を 1 つ飛ばし、当たると\n氷塊になって周りを凍らせる', element: 'ice', intervalSec: 1.2, directions: 60, speed: 360, radius: 7, range: 300,
      blockRadius: 60, damage: 3, freezeSec: 1.2, refreezeGuardSec: 0.6,
      upgrades: {
        2: { blockRate: 1.3, desc: '氷塊の範囲が\n広くなる' },
        4: { freezeRate: 1.35, desc: '長く凍らせる' },
        // shatterRate：氷塊の範囲で凍っている敵へのダメージの倍率（その敵の凍りは解ける）
        6: { shatterRate: 1.6, desc: '凍った敵を砕いて\n大ダメージ' },
        // floor：氷塊のあとに残る氷の床。sec だけ残り、tickSec ごとに上にいる敵を凍らせる
        8: { floor: { sec: 1.5, tickSec: 0.25 }, desc: '氷塊のあとに\n氷の床が残る' },
      },
      commonDesc: 'ダメージが上がり、\n飛ばす間隔が縮む',
      // 氷塊が割れる演出（blockSec 秒。氷の塊が現れて割れ、破片が飛び散る）と、MAX の氷の床の見た目
      blockVisual: { blockSec: 0.45, ice: '#cfeaff', light: '#ffffff', floor: 'rgba(170, 225, 255, 0.28)', floorEdge: 'rgba(220, 245, 255, 0.6)' },
      // Lv 8（MAX）の見た目：白い芯とシアンの淡い光をまとい、回りながら飛ぶ 6 本腕の雪の結晶。sparkle は後ろに残るきらめき（sparkleGap は 1 つ分の間隔 px）
      maxVisual: { arm: '#e6f7ff', core: '#ffffff', glow: '#5fd0ff', glowScale: 2.6, glowAlpha: 0.6, spin: 6, sparkle: '#bff0ff', sparkles: 4, sparkleGap: 8, sparkleAlpha: 0.65 },
    },
    espresso: {
      name: 'エスプレッソ・ショット', desc: '一直線に\n敵を貫く', element: 'hot', intervalSec: 2.5, range: 600, width: 10, coreRate: 0.5, damage: 6,
      // 線が消えるまでの時間と、1 体しかいないときに 2 本目を撃つまでの時間
      beamLifeSec: 0.25, shotGapSec: 0.12,
      // Lv 2・4・6 の見た目の目印（仕様 014）を線の上に置く間隔（px）
      levelSpotGap: 60,
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
      // Lv 8（MAX）の見た目：うねる液体の線と、先から飛び散る雫。waveWidth・coreRate は当たる太さに対する太さ（うねりの幅まで含めて当たる太さ）。playerGlow は撃っている間のプレイヤーの光
      maxVisual: {
        rim: '#c98a4b', core: '#f6e3c2', coreRate: 0.25, waveWidth: 0.6, waves: 9, segments: 60, flow: 1.2,
        drop: '#e0b07a', drops: 10, dropDist: 40, glow: '#ffb070', playerGlow: 30, playerGlowAlpha: 0.6,
      },
    },
    shockwave: {
      name: 'カフェイン・ショックウェーブ', desc: 'カフェインが 70% 以上のとき\n衝撃波で押し返す', element: 'none', intervalSec: 3, minCaffeineRatio: 0.7, speed: 400, maxRadius: 250, thickness: 20, damage: 4, knockback: 400,
      // Lv 2・4・6 の見た目の目印（仕様 014）を 1 つの輪に置く数
      levelSpotCount: 12,
      upgrades: {
        2: { minCaffeineRatio: 0.5, desc: 'カフェイン 50% から\n発動する' },
        4: { radiusRate: 1.3, desc: '衝撃波が遠くまで\n広がる' },
        6: { knockbackRate: 1.5, desc: '押し返しが強くなる' },
        // waves 個の波を waveGapSec おきに出し、押し返すのは最後の波だけ。発動のたびにカフェインを caffeineCost 使う
        8: { waves: 3, waveGapSec: 0.15, caffeineCost: 4, desc: '3 重の波が出る。\nカフェインを 4 使う' },
      },
      commonDesc: 'ダメージが上がり、\n発動の間隔が縮む',
      // Lv 8（MAX）の見た目：クレマ色の波紋と、縁に並ぶ泡。flash は発動の瞬間にプレイヤーが光る時間と大きさ
      maxVisual: {
        band: 'rgba(217, 160, 102, 0.55)', line: '#f3d9b5', foam: '#fff4e2', foamSize: 3, pushFoam: 5,
        flash: '#f3d9b5', flashSec: 0.25, flashRadius: 40,
      },
    },
  },
  // 倒した敵が落とす経験値の粒。magnetRadius 以内に近づくと吸い寄せられる
  // maxCount を超えたら新しい粒は作らず、今ある粒に経験値をまとめる
  xpOrb: { radius: 5, magnetRadius: 110, magnetSpeed: 420, maxCount: 300, color: '#f0d58a' },
  // 眠気の化身の手下。xp は倒したときに落とす経験値
  // drainMaxStack：吸い取る敵に何体触れていても、吸い取りは強い方からこの体数分までしか重ならない
  enemies: {
    sheep: { name: 'うとうと羊', color: '#e8e2d6', xp: 1, radius: 16, speed: 70, hp: 2, appearSec: 0, weight: 6, contactCaffeine: 5 },
    slime: { name: 'まぶたスライム', color: '#7a5c8e', xp: 2, radius: 18, speed: 50, hp: 4, appearSec: 120, weight: 2, drainPerSec: 12, drainMaxStack: 2 },
    ghost: { name: 'ふとんゴースト', color: '#b9c4d8', xp: 2, radius: 20, speed: 90, hp: 3, appearSec: 240, weight: 2, slowSec: 1.5, slowFactor: 0.5 },
    // ねぶくろイモムシ（仕様 020）。knockbackRate：押し返しを受ける割合。colors：寝袋・縫い目・チャック・顔の色
    caterpillar: {
      name: 'ねぶくろイモムシ', color: '#b5743a', xp: 5, radius: 26, speed: 35, hp: 16, appearSec: 360, weight: 1, contactCaffeine: 8, knockbackRate: 0.5,
      colors: { bag: '#b5743a', seam: '#8a5428', zipper: '#e8c070', face: '#9fd36a', eye: '#1e120c' },
    },
    // ゆめのながれぼし（仕様 062）：プレイヤーを追いかける速さが、プレイヤーの今の動きの速さ × chaseRate と speed（止まっているときの速さ）の大きい方になる。
    // knockbackRate：押し返しを受ける割合。tailLength は光の尾の長さ（半径の何倍か）。colors：星・顔・目・尾・きらめきの色
    star: {
      name: 'ゆめのながれぼし', color: '#b9c6ff', xp: 2, radius: 15, speed: 110, hp: 2, appearSec: 60, weight: 1, contactCaffeine: 5, knockbackRate: 0.3,
      chaseRate: 1.1, tailLength: 3.2,
      colors: { star: '#b9c6ff', face: '#e4e9ff', eye: '#4a4f80', tail: '170, 190, 255', sparkle: 'rgba(230, 235, 255, 0.9)' },
    },
  },
  // 敵を倒したときのエフェクト
  effects: {
    defeat: { durationSec: 0.45, particles: 12, speed: 200 },
  },
  // 時間とともに敵が強くなる。出現した時点の生存時間（分）× 倍率ぶん、標準より強くなる
  // 例：hpPerMin 0.35 なら、10:00 に出た敵の体力は 1 + 0.35 × 10 = 4.5 倍
  // 手下全体の体力の倍率（仕様 061）：時間による倍率とは別にかける。出た時点の時間で hpRateStart から hpRateEnd へ
  // hpRateRampSec かけて直線で上がり、そのあとは hpRateEnd。ボスにはかけない
  // damageRate：手下全体の攻撃力（触れたときに減るカフェイン・吸い取り）の倍率（仕様 063）。時間による倍率とは別にかける。ボスにはかけない
  enemyScaling: { hpPerMin: 0.35, speedPerMin: 0.04, damagePerMin: 0.06, hpRateStart: 1, hpRateEnd: 3, hpRateRampSec: 180, damageRate: 2 },
  // 敵の出現。rampSec かけて、出現の間隔が start → min に縮み、1 回に出る数が startGroup → endGroup に増える
  spawn: {
    startIntervalSec: 0.9,
    minIntervalSec: 0.3,
    rampSec: 480,
    startGroup: 1,
    endGroup: 3,
    maxCount: 200,
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
    maxCount: 280,
    stopBeforeBossSec: 30,
    title: 'ビッグウェーブ！',
    text: '眠気が押し寄せてくる…',
  },
  // ねぶくろキャンプ（仕様 020）：minSec〜maxSec のどこかで 1 回、type の敵 count 体がプレイヤーを輪のように取り囲んで現れる。
  // 輪の半径は画面の対角線の半分 + extraRadius。ビッグウェーブの最中なら、終わるまで待つ
  bagCamp: {
    minSec: 360,
    maxSec: 480,
    type: 'caterpillar',
    count: 12,
    extraRadius: 40,
    title: 'ねぶくろキャンプ！',
    text: '寝袋に取り囲まれた…',
  },
  // 珈琲店の木の床（仕様 005）。横長の板を、継ぎ目をずらして並べた板張り
  // size はドット 1 マスの大きさ（pixelArt.size と合わせる）、periodDots は柄 1 枚の大きさ（ドットの数）
  // enabled を false にすると、背景のタイルの床（scenery.floor）になる
  floor: {
    enabled: true,
    size: 3,
    periodDots: 192,
    planks: { width: 8, length: 32 },
    // woods は板の色の種類（濃い茶・少し赤みの茶・少し灰色がかった茶）。板ごとに 1 つ選ぶ（2026-10-24 の朝のデザイン案の A）
    colors: { woods: [[54, 35, 24], [62, 35, 25], [50, 40, 32]], tone: 0.1, gap: [30, 19, 13], grain: 0.08, knot: 0.2 },
  },
  night: { maxDarkness: 0.55 },
  // プレイ中の背景：夜の珈琲店の店内（background.js）。配置は seed から毎回同じに決まる（当たり判定はない）
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
    // 外周の石積みの壁（仕様 005 の FR-004）。thickness はマップの外側に描く厚さ
    // stoneH は石 1 段の高さ、stoneLens は石の長さの候補、stones は石の色の候補、mortar は石の間の色、gap は石の間の幅
    // highlight・highlightH は石の上側の明るい筋の色と太さ
    wall: {
      thickness: 70, stoneH: 24, stoneLens: [30, 40, 50, 60], stones: ['#423a32', '#4a4036', '#3a332d'], mortar: '#1f1914', gap: 2,
      highlight: 'rgba(255, 255, 255, 0.06)', highlightH: 3, top: '#5c3a2c', shadow: 'rgba(0, 0, 0, 0.45)',
    },
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
      // 夜にランプの下を照らす暖かい色（仕様 005 の FR-005）。radius の丸いにじみを、夜の暗さの rate 倍の濃さで足す
      warm: { color: 'rgba(140, 70, 20, 0.5)', radius: 190, rate: 0.9 },
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
  // ドラゴンのボス「まどろみ宝竜」（仕様 064）。1 面のクリアのあと、まれに挑める。出る確率はキャラ係の characters.dragon.bossChance。
  // 体に触れたときのダメージと属性の倍率は、ネムリーヌ（boss）と同じ
  dragonBoss: {
    name: 'まどろみ宝竜',
    hp: 1200,
    radius: 85,
    speed: 45,
    // 竜の宝：ドラゴン豆がもう仕入れられる（2 回目以降に倒した）ときに、もらえる豆コイン
    treasureCoins: 500,
    // ねむけの息：intervalSec ごとに warnSec 予告してから blowSec 吐く。range・angleDeg の扇形に当たるとカフェインが caffeine 減る
    breath: { intervalSec: 4, warnSec: 1, blowSec: 0.6, range: 420, angleDeg: 55, caffeine: 20, warn: 'rgba(190, 170, 255, 0.18)', mist: 'rgba(200, 185, 255, 0.55)' },
    // 豆コインの雨：intervalSec ごとに count 枚を、プレイヤーから spreadRadius 以内に fallSec かけて落とす。
    // 落ちた瞬間に hitRadius 以内ならカフェインが caffeine 減る。外れたコインは lifeSec 落ちていて、pickRadius 以内で拾うと豆コインが coins 枚入る
    coinRain: { intervalSec: 6, count: 6, spreadRadius: 260, fallSec: 1.1, fallHeight: 260, hitRadius: 26, caffeine: 12, lifeSec: 6, pickRadius: 24, coins: 1, size: 10 },
    colors: { body: '#1f5a2a', bodyDark: '#163f1e', line: '#0e2a13', belly: '#f3e2b8', bellyLine: '#d8c495', horn: '#f3e2b8', eye: '#f4efe6', pupil: '#1e120c', shadow: 'rgba(0, 0, 0, 0.35)' },
    texts: {
      offerTitle: '宝の山で眠っていた竜が、物音で目を覚ました！',
      offerText: '挑む：Space / Enter　　やめる：Esc',
      win: 'まどろみ宝竜を倒した！',
      lose: '竜は宝の山に戻って、また眠った…',
      pickup: '拾った豆コイン：{n} 枚',
      treasure: '竜の宝を手に入れた！　豆コイン +{n}',
    },
  },
  // 音。BGM はブラウザの中で組み立てるローファイ調の曲（音楽ファイルは使わない）
  // chords は 1 小節ごとの和音（音名＋オクターブ）。bass は各小節の根音
  audio: {
    volume: { master: 0.8, music: 0.9, sfx: 0.6 },
    pausedMusicRate: 0.35,
    // 遊ぶ人が変えられる BGM の音量（%）。volume.music にこの割合をかける
    musicVolume: { default: 80, step: 10 },
    fadeOutSec: 2.5,
    // 曲を切り替えるとき（普通 ⇔ ボス、曲を選び直したとき）に重ねる秒数
    crossfadeSec: 2.5,
    crackle: 0.08,
    musicCutoffHz: 3200,
    swing: 0.28,
    // 選べる曲の並び（ポーズメニューなどで出す順）。'normal' は最初から使える。ほかは豆コインで買う（仕様 101）
    tracks: ['normal', 'morningBlend', 'midnightDrip', 'cafeBossa'],
    // 曲の楽譜。chords と bass は 1 小節に 1 つ。melody は 1 小節を 8 つの記号で書く
    // （音名で鳴らし始め、'-' はのばす、'.' は休み）。style はリズムの型（src/music/player.js）、lead はメロディーの楽器
    music: {
      normal: {
        name: 'いつもの一杯',
        mood: 'こもったローファイ・ジャズ。最初から使える',
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
        pad: true,
        chords: [
          ['A2', 'C3', 'E3', 'G3', 'B3'],
          ['F2', 'A2', 'C3', 'E3', 'G3'],
          ['D3', 'F3', 'A3', 'C4', 'E4'],
          ['E2', 'G#2', 'D3', 'F3'],
        ],
        bass: ['A1', 'F1', 'D2', 'E1'],
      },
      morningBlend: {
        name: 'モーニングブレンド',
        mood: '朝の光のような、明るく軽いローファイ。口笛のメロディー',
        bpm: 80,
        style: 'morning',
        lead: 'whistle',
        chords: [
          ['F3', 'A3', 'C4', 'E4'], ['G3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['E3', 'G3', 'A#3', 'D4'],
          ['A3', 'D4', 'F4'], ['G3', 'C4', 'E4'], ['F3', 'A#3', 'D4'], ['E3', 'G3', 'A#3', 'D4'],
          ['F3', 'A3', 'C4', 'E4'], ['G3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['F3', 'A3', 'D4'],
          ['A3', 'D4', 'F4'], ['G3', 'C4', 'E4'], ['F3', 'A#3', 'D4'], ['F3', 'A#3', 'D4', 'G4'],
        ],
        bass: ['F2', 'A1', 'D2', 'C2', 'A#1', 'A1', 'G1', 'C2', 'F2', 'A1', 'D2', 'C2', 'A#1', 'A1', 'G1', 'C2'],
        melody: [
          '. A5 - C6 - . A5 G5', 'E5 - - . C5 . E5 G5', 'F5 - A5 - . G5 F5 E5', 'G5 - - - . . . .',
          '. D6 - C6 A5 - F5 .', 'G5 - E5 - . . C5 D5', 'F5 - D5 - . A#4 C5 D5', 'E5 - - - . . . .',
          '. A5 - C6 - . A5 C6', 'E6 - - . D6 C6 . A5', 'F5 - A5 - C6 - A5 .', 'G5 - - . F5 E5 . .',
          '. F5 A5 C6 - . D6 .', 'C6 - A5 - G5 - E5 .', 'F5 - - . G5 . A5 .', 'G5 - - - - - . .',
        ],
      },
      midnightDrip: {
        name: '真夜中のハンドドリップ',
        mood: '雨の夜にしっとり。ゆっくりのピアノと鉄琴',
        bpm: 64,
        style: 'night',
        lead: 'bell',
        leadVel: 0.9,
        swing: 0.18,
        ambient: { kind: 'rain', level: 0.06 },
        chords: [
          ['G3', 'B3', 'C4', 'E4'], ['E3', 'A3', 'C4'], ['F3', 'A3', 'C4', 'E4'], ['G#3', 'B3', 'D4', 'F4'],
          ['G3', 'B3', 'C4', 'E4'], ['G3', 'B3', 'E4'], ['E3', 'A3', 'C4'], ['A3', 'B3', 'D4'],
          ['F3', 'A3', 'C4', 'E4'], ['F3', 'B3', 'D4'], ['G3', 'B3', 'E4'], ['E3', 'A3', 'C4'],
          ['A3', 'D4', 'F4'], ['G#3', 'B3', 'D4', 'F4'], ['G3', 'B3', 'C4', 'E4'], ['A3', 'B3', 'D4'],
        ],
        bass: ['A1', 'F1', 'D2', 'E1', 'A1', 'C2', 'F1', 'E1', 'D2', 'G1', 'C2', 'F1', 'B1', 'E1', 'A1', 'E1'],
        melody: [
          'E5 - - - . B4 C5 -', 'A4 - - - . . . .', '. . F5 - E5 - D5 -', 'G#4 - - - . . B4 .',
          'C5 - - - E5 - . .', 'G5 - - - . . E5 .', 'A5 - - G5 - - E5 -', 'D5 - - - - - . .',
          '. . A5 - - C6 - .', 'B5 - - - A5 - G5 .', 'E5 - - - - - . .', '. . C5 - E5 - A5 .',
          'F5 - - - D5 - . .', 'B4 - - G#4 - - . .', 'A4 - - - . . . .', '. . . . B4 - - -',
        ],
      },
      cafeBossa: {
        name: '昼下がりのカフェ・ボサノバ',
        mood: '喫茶店の昼下がり。ギターとボサノバのリズム',
        bpm: 100,
        style: 'bossa',
        lead: 'flute',
        swing: 0,
        chords: [
          ['F#3', 'A3', 'C#4', 'E4'], ['D3', 'G3', 'B3'], ['E3', 'A3', 'C#4'], ['D#3', 'A3', 'C#4'],
          ['D3', 'G3', 'B3'], ['G3', 'C#4', 'F#4'], ['F#3', 'A3', 'C#4', 'E4'], ['G3', 'D4', 'E4'],
          ['F#3', 'B3', 'D4'], ['E3', 'A#3', 'D4'], ['E3', 'A3', 'C#4'], ['D#3', 'A3', 'C#4'],
          ['D3', 'G3', 'B3'], ['G3', 'C#4', 'F#4'], ['F#3', 'A3', 'C#4', 'E4'], ['G3', 'C#4', 'E4'],
        ],
        bass: ['D2', 'E2', 'F#2', 'B1', 'E2', 'A1', 'D2', 'A1', 'G2', 'G2', 'F#2', 'B1', 'E2', 'A1', 'D2', 'A1'],
        melody: [
          'F#5 - - E5 F#5 - A5 -', 'G5 - - F#5 E5 - . .', 'E5 - - C#5 E5 - A5 .', 'F#5 - - - D#5 - . .',
          'D5 - - B4 D5 - G5 -', 'E5 - C#5 - . A4 C#5 .', 'D5 - - - - - . .', '. . E5 F#5 G5 - A5 .',
          'B5 - - A5 F#5 - D5 .', 'A#5 - - A5 G5 - E5 .', 'A5 - - - E5 - C#5 .', 'D#5 - F#5 - A5 - . .',
          'G5 - - F#5 E5 - D5 -', 'C#5 - E5 - G5 - F#5 E5', 'F#5 - - - - - . .', '. . E5 - C#5 - A4 .',
        ],
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
