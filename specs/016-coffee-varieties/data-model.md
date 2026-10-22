# Data Model: 珈琲豆の品種を増やしてキャラを 66 体にする

## 設定（CONFIG.characters）

### 品種（`varieties`。21 個、並びは選択画面の順・値段の安い順）

| 項目 | 内容 |
| --- | --- |
| `id` / `name` | 例：`bourbon` / 「ブルボン」 |
| `origin` | 由来（メニュー風のポップアップに出す） |
| `trait` | 特徴の一言（例：「打たれ強い」） |
| `rates` | 性能の倍率 `{ speed, caffeine, damage, interval }`。焙煎度の性能に掛ける（research R2） |
| `power` | 特別な力の id（`powers` のキー）。アラビカは `null` |
| `price` | 値段（豆コインの枚数）。アラビカは `0`（最初から使える） |
| `pattern` | 模様 `{ kind, color, lightColor }`。アラビカは `null` |

### 特別な力（`powers`。8 種類）

| id | 名前 | 効果の値 | 効く所 |
| --- | --- | --- | --- |
| `beanHeal` | 豆の回復アップ | `beanHealRate: 1.3` | 珈琲豆で回復する量 |
| `magnet` | 吸い寄せ | `magnetRate: 1.6` | 経験値の粒を吸い寄せ始める距離 |
| `guard` | 無敵時間アップ | `invincibleSec: 1.0` | 攻撃を受けたあとの無敵時間 |
| `saver` | 省エネ | `decayRate: 0.8` | カフェインが時間で減る速さ |
| `xp` | 経験値アップ | `xpRate: 1.15` | 経験値の粒から入る経験値 |
| `area` | 範囲アップ | `areaRate: 1.1` | すべての弾と範囲 |
| `runGun` | 走り撃ち | `movingIntervalRate: 0.9` | 動いている間の攻撃の間隔 |
| `standFirm` | 踏ん張り | `standingDamageRate: 1.2` | 止まっている間のダメージ |

それぞれ `name`（名前）と `desc`（選択画面とポップアップに出す説明）を持つ。

### 性能のバー（`statBars`）

| バー | 範囲 |
| --- | --- |
| スピード | 0.6〜1.6 |
| 体力 | 50〜200 |
| パワー | 0.5〜1.75 |
| 連射 | 0.5〜1.5 |

## 設定（CONFIG.coins）

| 項目 | 初期値 | 内容 |
| --- | --- | --- |
| `name` / `unit` | 「豆コイン」/「枚」 | 表示の名前と数え方 |
| `perMinute` | 5 | 生き延びた 1 分ごとの枚数 |
| `killsPerCoin` | 100 | 倒した敵この数ごとに 1 枚 |
| `clear` | 30 | ボスを倒してクリアしたとき |
| `extraClear` | 40 | エクストラステージをクリアしたとき |
| `tally` | — | 数え上げの速さ：1 行が出る間隔 `rowSec: 0.45`、1 行を数え上げる時間 `countSec: 0.6`、合計に足す時間 `totalSec: 0.6` |
| `menu` | — | メニュー風のポップアップの色（紙・枠・文字・値段の札）と文言（「注文する」「やめる」「とじる」） |
| `texts` | — | 「新しい品種『〇〇』が解放された！（浅煎り・中煎り・深煎り）」など |

## 保存（progress.js の `coffee-survival.unlocks`）

| 項目 | 内容 |
| --- | --- |
| `coins` | 今持っている豆コインの枚数（足す：プレイの終わり、減らす：品種を買う） |
| `unlocked` | 今までどおり。品種を買うと、その品種の 3 体の id（例：`bourbon-light`・`bourbon-medium`・`bourbon-dark`）を入れる |

確認用の `?unlockAll`（すべて解放した状態）・`?coins=N`（N 枚持った状態）を付けて開いたときは、そのページを開いている間、記録を保存しない。

## キャラクター（characters.js が作る）

| 項目 | 内容 |
| --- | --- |
| `id` / `name` | `${品種}-${焙煎度}` /「品種名 焙煎度」 |
| `variety` | 品種の設定 |
| `roast` | 焙煎度の性能に品種の倍率を掛けたもの（`speedRate`・`maxCaffeine`・`damageRate`・`attackIntervalRate`、色、`id`） |
| `power` | 特別な力（`powers` の中身と id）。ないときは `null` |
| `unlock` | アラビカは `null`。ほかの品種は `{ price }`（買って解放） |

## ゲームの状態（Game）に足すもの

| 項目 | 内容 |
| --- | --- |
| `runKills` | そのプレイで倒した敵の数（豆コインの計算に使う） |
| `coinTally` | 結果画面の数え上げ：`rows`（内わけの行）、`total`、`before`（足す前の合計）、`startedAt`、`skipped` |

## 状態の移り方（品種）

```text
鍵（「？？？」＋値段） ──決定──▶ メニュー ──注文する（足りる）──▶ 解放（3 体、中煎りを選んだ状態）
                                  └──やめる／とじる／Esc──▶ 鍵のまま
```
