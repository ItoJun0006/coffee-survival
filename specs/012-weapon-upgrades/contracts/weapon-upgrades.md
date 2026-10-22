# Contract: 武器の強化の書き方（CONFIG.weapons.&lt;id&gt;）

武器のコード（`src/weapons/*.js`）と設定（`src/config.js`）の間の約束。強化の値はすべて設定に書き、武器のコードは `this.stats` から読む。

## 書き方

```js
mill: {
  // 今ある項目（Lv 1 の性能）
  name: 'ミル・トルネード', desc: '…', element: 'none', count: 2, orbitRadius: 70, bladeRadius: 12, angularSpeed: 3, damage: 1, hitCooldownSec: 0.5,
  // Lv ごとの特別な強化。キーは Lv（2・4・6・8）
  upgrades: {
    2: { count: 3, desc: '刃が 3 枚になる' },
    4: { bladeRate: 1.35, desc: '刃が大きくなる' },
    6: { count: 4, spinRate: 1.2, desc: '刃が 4 枚になり、\n回転が速くなる' },
    8: { count: 6, pulse: { minRate: 0.65, maxRate: 1.45, periodSec: 2.4 }, desc: '…' },
  },
  // 共通の強化だけが入る Lv（3・5・7）のカードの説明
  commonDesc: 'ダメージが上がり、\n当たる間隔が縮む',
  // Lv 8 の見た目
  maxVisual: { blade: '#d08a45', edge: '#ffd9a0', /* … */ },
},
```

（値は [spec.md](../spec.md) の FR-004〜FR-011 の初期案。上はミルの例）

## 重ね方の決まり

1. `stats` は、武器の基本値の一部ではなく「強化の結果」だけを持つ。初期値は武器ごとに決める（例：ミルは `{ count: 2, bladeRate: 1, spinRate: 1 }`）。
2. `upgrades` を Lv の小さい順に、今の Lv 以下のものだけ重ねる。
3. キー名が `Rate` で終わる値は、それまでの値にかける。それ以外の値（`count`・`pierce`・`slow`・`pulse` など）は上書きする。
4. `desc` は重ねない（カードの説明にだけ使う）。
5. `*Rate` は、範囲アップ（006）を反映したあとの設定の値にかける。範囲アップとかけ算で重なる。

## カードの説明

- 次の Lv に `upgrades[次の Lv].desc` があればそれを、なければ `commonDesc` を出す。どちらもなければ武器の `desc`。
- 1 行 12 字程度 × 2 行まで（`\n` で改行）。

## 共通の強化

- `commonLevels` を書かない武器は、毎 Lv 共通の強化（ダメージ +25%、間隔 −8%）を受ける。8 種類はすべて書かない。
- 豆マシンガン・豆ショットガンは `commonLevels: [3, 5, 7]` のまま。

## MAX の見た目の 3 案

- 比較中だけ `maxVisual.variant: 'A' | 'B' | 'C'` を持ち、武器のコードは `variant` で描き方を切り替える。
- 選んだあとは `variant` と、選ばなかった案の描き方・設定を消す。

## 確認用の URL パラメータ

- `?weapons=<id>:<Lv>[,<id>:<Lv>…]` で、指定した武器を指定した Lv で持って始める（例：`?weapons=mill:8,drip:5`）。`id` は `CONFIG.weapons` のキー。
- 持てる数（攻撃 3 つ）は、確認用でも超えない。
- `?boss`・`?level=N` と同じく、動作確認のためだけに使う。
