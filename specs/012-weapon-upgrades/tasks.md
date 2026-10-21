---
description: "Task list for 012-weapon-upgrades"
---

# Tasks: 残り 10 種類の武器に Lv ごとの強化と MAX の見た目を付ける

**Input**: Design documents from `/specs/012-weapon-upgrades/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/weapon-upgrades.md, quickstart.md

**Tests**: 自動テストの仕組みはない（憲法 II）。各タスクの確認は [quickstart.md](./quickstart.md) の手順でブラウザで行う。テストのタスクは作らない。

**Organization**: ユーザーストーリーごとにまとめる。US1（強化）と US2（MAX の見た目）は武器ごとに独立して進められる。

**共通の約束**（全タスク）:
- 数値・色・文言は `src/config.js` の `CONFIG` に置き、コードに直接書かない（憲法 III）。書き方は [contracts/weapon-upgrades.md](./contracts/weapon-upgrades.md)。
- 強化の値は [spec.md](./spec.md) の FR-004〜FR-013 の表の初期案を使う。
- 1 タスク（または武器 1 種類ぶんのまとまり）ごとに、仕様と実装を分けて develop にコミットする。2026-10-23 を過ぎたら `develop` から `012-weapon-upgrades` ブランチを作って進める（憲法 V）。コミット・プッシュ・ブランチ作成の前にはユーザーに確認する。
- 見た目を変えるタスクは、3 案を画像で見せて選んでもらってから実装する（CLAUDE.md）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 別ファイルで、終わっていないタスクに依存しないので並行できる
- **[Story]**: US1（強化）、US2（MAX の見た目）、US3（不具合の修正の確認）

---

## Phase 1: Setup（確認用の仕組み）

**Purpose**: 武器と Lv を指定して始められるようにし、以降の確認を速くする（research R8）

- [x] T001 確認用の URL パラメータ `?weapons=<id>:<Lv>[,<id>:<Lv>…]` を src/game.js に追加する。`constructor` で `URLSearchParams` から読み（今の `debugBoss`・`debugLevel` の隣）、`reset()` の最後で、指定した武器を `WEAPON_ORDER`（src/weapons/index.js）から作って `this.weapons` に入れ、`level` を設定する。`id` は `CONFIG.weapons` のキーで、クラスとの対応は `new W(this).config.name === CONFIG.weapons[id].name` で引く。最初から持っている豆マシンガン（または豆ショットガン）は残し、持てる数（`CONFIG.slots.weapons`、3 つ）を超える分は無視する。Lv は 1〜`CONFIG.weaponLevels.max` に収める
- [x] T002 確認用の URL パラメータ `?maxVariant=A|B|C` を src/game.js に追加し、src/weapons/base.js に `get maxVariant()` を足す（パラメータがあればそれを、なければ `this.config.maxVisual?.variant ?? 'A'` を返す）。MAX の見た目の 3 案（US2）の見比べに使う
- [x] T003 T001・T002 を確かめる：`?weapons=mill:8,drip:5` で始めるとミル Lv 8・ドリップ Lv 5 を持ち、左上の一覧に出る。`?weapons=` なしでは今までどおり始まる。移動・ポーズ・リトライ・コンソールのエラーを確認（quickstart §5）

---

## Phase 2: Foundational（共通の仕組みと不具合の修正）

**Purpose**: 全武器で共有する仕組み（research R1〜R6）と、強化の前に直す不具合（FR-014）。**ここが終わるまで US1・US2 は始めない**

- [x] T004 `stats`・`commonUpgrades`・`upgradeDesc` を src/weapons/bean-gun.js から src/weapons/base.js の `Weapon` に移す。決まり（contracts/weapon-upgrades.md「重ね方の決まり」）：`baseStats()`（武器ごとに上書きできる初期値。既定は `{}`）から始め、`config.upgrades` の Lv の小さい順に、今の Lv 以下のものを重ねる。キー名が `Rate` で終わる値はかけ算、`desc` は飛ばし、それ以外は上書き。`commonUpgrades` は `config.commonLevels` があればその Lv 以下の数、なければ `level − 1`。`upgradeDesc(next)` は `upgrades[next]?.desc ?? config.commonDesc ?? null`
- [x] T005 src/weapons/bean-gun.js と src/weapons/bean-shotgun.js を T004 の共通の仕組みに合わせる。豆マシンガンは `baseStats()` で `{ count: c.baseCount ?? 1, spreadDeg: c.baseSpreadDeg ?? 0, flightRate: c.flightRate, rangeRate: 1, pierce: 1, damageRate: 1 }` を返し、`pierce: true` を何体でも（Infinity）として扱う処理は残す。挙動は一切変えない（007 の FR-003 の表どおり）
- [x] T006 src/weapons/base.js の `tick()` の中の倍率計算を `get intervalRate()`（キャラの攻撃間隔 × 共通の強化 × 発生頻度アップ、下限 `CONFIG.weaponLevels.minIntervalRate`）として外に出し、`tick()` はそれを使う（research R2）
- [x] T007 src/weapons/base.js の `hit(target, damage, element)` に属性を渡せるようにする。`element` を省略したら `this.config.element`（research R6）
- [x] T008 src/game.js の `targets()` を、1 フレームに 1 回だけ一覧を作って使い回す形にする（`update()` の始めで作り直し、`targetsInCircle` も同じ一覧を使う）。敵の死亡・追加がそのフレーム内で起きても、倒れた敵（`dead`）には当てない（research R4）
- [x] T009 [P] src/entities/enemy.js に足どめ（`slow(sec, rate)`：残り時間と倍率を持ち、移動の速さにかける。かけ直しは長い方・強い方を残す）を足し、src/game.js に `slow(target, sec, rate)` を足す（ボスには効かない。`freeze` と同じ形）（research R5）
- [x] T010 [P] src/entities/enemy.js の凍りを変える：`freeze(sec, guardSec)` は「凍っていない、かつ待ち時間が 0」のときだけ効き、凍っている間に当たっても延長しない。凍りが解けたら `guardSec` の待ち時間に入る。`thaw()`（すぐ解いて待ち時間に入る）を足す。src/game.js の `freeze(target, sec, guardSec)` に引数を足す（ボスは除く）。待ち時間の初期値は `CONFIG.weapons.ice.refreezeGuardSec: 0.6`（src/config.js）
- [x] T011 [P] FR-014：src/weapons/mill.js で、同じ敵に当たる間隔を毎フレーム `hitCooldownSec × this.intervalRate` にする（`HitTracker` の `cooldownSec` を更新）。下限は元の 0.3 倍
- [x] T012 [P] FR-014：src/weapons/puddle.js で、`HitTracker` を水たまりごとではなく武器に 1 つだけ持ち、重なっても同じ敵へのダメージは 1 つ分にする。あわせて、描く形（今は縦 0.8 倍の楕円）を当たり判定と同じ正円にする
- [x] T013 [P] FR-014：src/weapons/latte.js で、`HitTracker` を武器に 1 つだけ持ち、回復は「どれか 1 枚の中にいれば、そのフレームで 1 回」にする
- [x] T014 [P] FR-014：src/weapons/espresso.js で、外側の線（今は太さ 2 倍の半透明）を当たる太さ（`width`）以内に収め、はっきり描く部分と当たる範囲を一致させる
- [x] T015 Phase 2 を確かめる：`?weapons=` で豆マシンガン・豆ショットガンを Lv 1〜8 にして 007 の表どおりに変わること（T005）、ほかの武器の今の動きが変わっていないこと（T011〜T014 の修正点を除く）、コンソールのエラーがないこと

**Checkpoint**: 共通の仕組みと不具合の修正が入った。ここから武器ごとに US1・US2 を進められる

---

## Phase 3: User Story 1 - どの武器も、育てると撃ち方・効き方が変わる（Priority: P1）🎯 MVP

**Goal**: 10 種類の武器が Lv 2・4・6 で特別な強化、Lv 8 で MAX の変化を受け、カードに次の Lv で変わることが出る（FR-001〜FR-013）

**Independent Test**: quickstart §1。`?weapons=<id>:N` で Lv を変え、spec の表どおりに変わるかを武器ごとに見る

- [x] T016 [US1] src/config.js の 10 種類の武器（`mill`・`mug`・`shockwave`・`drip`・`steam`・`puddle`・`espresso`・`ice`・`press`・`latte`）に、`upgrades`（Lv 2・4・6・8、各 Lv に `desc`）と `commonDesc` を、spec.md の FR-004〜FR-013 の表の初期案で書く。武器ごとに必要な追加の値も置く：マグ `splashRadius: 55`・`splashDamage: 3`・`splashElement: 'hot'`（`areaKeys` に `splashRadius`）、ドリップ `scatterRadius: 180`・`linger: { durationSec: 1, tickSec: 0.5, damageRate: 0.35 }`・`fallHeight: 220`・`splashSec: 0.3`、こぼれ珈琲 `slow: { rate: 0.6, sec: 0.3 }`・`trail: { stepPx: 45, radiusRate: 0.55, durationSec: 1.8, damageRate: 0.6, max: 16 }`、エスプレッソ `beamLifeSec: 0.25`・`stream: { durationSec: 0.8, sweepDeg: 50, hitCooldownSec: 0.2 }`、スチーム `puffLifeSec: 0.35`、プレス `bossWeight: 5`。`commonLevels` は書かない（毎 Lv 共通の強化。FR-002）。カードの説明は 1 行 12 字程度 × 2 行まで
- [x] T017 [P] [US1] src/weapons/mill.js：`baseStats()` を `{ count: c.count, bladeRate: 1, spinRate: 1 }` にし、刃の数・刃の半径（当たり判定と描画の両方）・回る速さを `stats` から使う。Lv 8 の `pulse` で、回る半径を `periodSec` 周期で `minRate`〜`maxRate` 倍に伸び縮みさせる（FR-004）。敵との照合は `targets()` を 1 回取り、「回る半径の最大＋刃の半径＋敵の半径」の円に入る敵だけを刃と比べる
- [x] T018 [P] [US1] src/weapons/mug.js：マグの数とずらす角度（豆マシンガンと同じ式）、大きさ（`sizeRate`。当たり判定と描画の両方に使う半径をマグごとに持つ）、届く距離（`rangeRate`）を `stats` から使う。Lv 8 は、折り返す瞬間に 1 回だけ `targetsInCircle(x, y, splashRadius)` へ `splashDamage` を熱い属性（`hit` の第 3 引数）で当て、マグの速さを `speedRate` 倍にする（FR-005）。しぶきは `HitTracker` を通さない
- [ ] T019 [P] [US1] src/weapons/shockwave.js：発動の条件（`minCaffeineRatio`）、広がる半径（`radiusRate`）、押し返し（`knockbackRate`）を `stats` から使う。Lv 8 は、発動の瞬間の位置から `waveGapSec` おきに `waves` 個の波を出し、押し返すのは最後の波だけ。発動のたびにカフェインを `caffeineCost` 減らす（被弾の処理を通さず直接減らす。5 割未満では発動しないので 0 にはならない）（FR-006）
- [ ] T020 [P] [US1] src/weapons/drip.js：雫の数（`drops`）・当たる半径（`radiusRate`）を `stats` から使う。Lv 6 以降は `spreadTargets` で、範囲内の敵をシャッフルして重ならないように割り当て、余った雫はプレイヤーのまわり（`scatterRadius`）のランダムな位置に落とす（ボスに直撃するのは 1 回の発動で 1 つまで）。Lv 8 は着弾点に `linger.durationSec` の湯気を残し、武器に 1 つの `HitTracker(linger.tickSec)` で `damageRate` 倍のダメージ。直撃は `damageRate: 0.75`（FR-007）。コードに直接書かれている 220・0.3 を設定の `fallHeight`・`splashSec` に置き換える
- [ ] T021 [P] [US1] src/weapons/steam.js：扇の角度（`angleDeg`）・半径（`rangeRate`）を `stats` から使う。Lv 6 以降は向きのリスト（前・真後ろ）のどれかの扇に入れば 1 回だけ当たる。Lv 8 は 360°（角度の判定を省く）・押し返し `knockbackRate: 1.4`・ダメージ `damageRate: 0.8`（FR-008）。0.35 などの直書きを `puffLifeSec` に置き換える
- [ ] T022 [P] [US1] src/weapons/puddle.js：持続（`durationRate`）・半径（`radiusRate`）を `stats` から使う。Lv 6 以降は上にいる敵に `game.slow(t, slow.sec, slow.rate)`（T009）。Lv 8 は、プレイヤーが `trail.stepPx` 進むごとに小さな水たまり（半径 `radiusRate` 倍、`durationSec`、ダメージ `damageRate` 倍、最大 `max` 個）を置く。立ち止まっているときは出さない。こぼれ跡も T012 の武器共通の `HitTracker` を使う（FR-009）
- [ ] T023 [P] [US1] src/weapons/espresso.js：Lv 2 以降は近い順に 2 体へ 2 本（1 体なら `shotGapSec: 0.12` ずらして同じ敵へ）、太さ（`widthRate`）を `stats` から使う。Lv 6 以降は当たった敵を撃った向きへ `knockback: 180` 押し返す（`game.knockback`。ボスは除く）。Lv 8 はストリーム：`stream.durationSec` のあいだ毎フレーム、プレイヤーの位置から今の角度の線分で `distToSegment` の判定をし、狙った向きを中心に `sweepDeg` なぎ払う。同じ敵には `stream.hitCooldownSec` ごと、ダメージ `damageRate: 0.4`。同時に出ているストリームは `shots` 本まで（FR-010）
- [ ] T024 [P] [US1] src/weapons/ice.js：氷の数（`shards`）・凍る時間（`freezeRate`）を `stats` から使い、凍らせるときは `game.freeze(t, sec, refreezeGuardSec)`（T010）。Lv 6 以降は、凍っている敵に当たったら `shatterRate` 倍のダメージで `thaw()` する（凍らせ直さない）。Lv 8 は、かけらごとに当てた敵の `Set` を持ち 3 体まで貫通、ダメージ `damageRate: 0.7`（FR-011）
- [ ] T025 [P] [US1] src/weapons/press.js：予告を作るときに、そのときの半径（`radiusRate` をかけた値）を予告ごとに持ち、当たり判定と描画の両方に使う。落ちるまでの時間（`delayRate`）を `stats` から使う。Lv 6 は射程内の敵を距離順に並べて上から 2 体を同時に狙う。Lv 8 は 1 台で、射程内の敵それぞれを中心とした半径の中の敵の数（ボスは `bossWeight` 体分）が一番多い所に落とし、ダメージ `damageRate: 1.5`、押しつぶした敵を外へ `knockback: 260` 押し返す（FR-012）
- [ ] T026 [P] [US1] src/weapons/latte.js：持続（`durationRate`）・半径（`radiusRate`）・回復（`healRate`）を `stats` から使う。Lv 8 は模様をいつも 1 枚にし、毎フレーム位置をプレイヤーに合わせ、発動したら残り時間を戻すだけにする。回復は `healRate: 0.5` がかかった値（FR-013）。T013 の重なりの修正はそのまま
- [ ] T027 [US1] src/level-up-menu.js と src/game.js のカードの説明が、10 種類すべてで `upgradeDesc(次の Lv)` を出し、Lv 3・5・7 は `commonDesc` になることを確かめ、カードからはみ出す文言があれば src/config.js の `desc` を直す（FR-003）
- [ ] T028 [US1] quickstart §1 を 10 種類すべてで行う。Lv 2・4・6・8 の変化と MAX の代償、Lv 3・5・7 の共通の強化を確認し、結果を記録する

**Checkpoint**: 10 種類の強化が動く（見た目は Lv 7 以下と同じ描き方のまま）。ここで遊べる区切りとしてコミットしてよい

---

## Phase 4: User Story 2 - MAX の武器はひと目で分かる（Priority: P2）

**Goal**: 10 種類それぞれの Lv 8 の見た目を、3 案から選んで実装する（FR-015・FR-016）

**Independent Test**: quickstart §2。`?weapons=<id>:7` と `:8` を見比べる

**武器ごとの進め方**（3 タスク 1 組）：
1. 3 案を作る：src/weapons/&lt;id&gt;.js の描画に `this.isMax` のときの描き方を `this.maxVariant`（T002）で A・B・C に分けて作り、色や大きさは src/config.js の `maxVisual` に置く。A 案は spec の FR-004〜FR-013 の「MAX の見た目」、B・C 案は同じ武器らしさで違う方向の案にする。はっきり描く部分の大きさは当たる範囲と一致させ、熱い攻撃は暖色と湯気、冷たい攻撃は寒色と光にする。経験値の粒（金色の丸）・珈琲豆・敵と見間違えない色と形にする。重い光は作り置きした小さな絵を貼る（research R4）
2. 選んでもらう：`?weapons=<id>:8&maxVariant=A|B|C` と `?weapons=<id>:7` の画面を同じ場面で並べた比較画像を作ってユーザーに見せ、1 つ選んでもらう（ユーザーの返事を待つ）
3. 選んだ案を残す：選ばなかった案の描き方と設定、`maxVisual.variant` を消す

- [ ] T029 [US2] ミル・トルネードの MAX の見た目の 3 案を作る（src/weapons/mill.js、src/config.js `mill.maxVisual`）
- [ ] T030 [US2] ミル・トルネードの 3 案の比較画像を見せて選んでもらう
- [ ] T031 [US2] ミル・トルネードで選んだ案だけを残す（src/weapons/mill.js、src/config.js）
- [ ] T032 [US2] マグカップ投げの MAX の見た目の 3 案を作る（src/weapons/mug.js、src/config.js `mug.maxVisual`）
- [ ] T033 [US2] マグカップ投げの 3 案の比較画像を見せて選んでもらう
- [ ] T034 [US2] マグカップ投げで選んだ案だけを残す（src/weapons/mug.js、src/config.js）
- [ ] T035 [US2] カフェイン・ショックウェーブの MAX の見た目の 3 案を作る（src/weapons/shockwave.js、src/config.js `shockwave.maxVisual`）
- [ ] T036 [US2] カフェイン・ショックウェーブの 3 案の比較画像を見せて選んでもらう
- [ ] T037 [US2] カフェイン・ショックウェーブで選んだ案だけを残す（src/weapons/shockwave.js、src/config.js）
- [ ] T038 [US2] ドリップの雨の MAX の見た目の 3 案を作る（src/weapons/drip.js、src/config.js `drip.maxVisual`）
- [ ] T039 [US2] ドリップの雨の 3 案の比較画像を見せて選んでもらう
- [ ] T040 [US2] ドリップの雨で選んだ案だけを残す（src/weapons/drip.js、src/config.js）
- [ ] T041 [US2] スチーム噴射の MAX の見た目の 3 案を作る（src/weapons/steam.js、src/config.js `steam.maxVisual`）。ボスのあくびの波・ショックウェーブの輪と見分けられる形にする
- [ ] T042 [US2] スチーム噴射の 3 案の比較画像を見せて選んでもらう
- [ ] T043 [US2] スチーム噴射で選んだ案だけを残す（src/weapons/steam.js、src/config.js）
- [ ] T044 [US2] こぼれ珈琲の MAX の見た目の 3 案を作る（src/weapons/puddle.js、src/config.js `puddle.maxVisual`）。こぼれ跡も同じ描き方にする
- [ ] T045 [US2] こぼれ珈琲の 3 案の比較画像を見せて選んでもらう
- [ ] T046 [US2] こぼれ珈琲で選んだ案だけを残す（src/weapons/puddle.js、src/config.js）
- [ ] T047 [US2] エスプレッソ・ショットの MAX の見た目の 3 案を作る（src/weapons/espresso.js、src/config.js `espresso.maxVisual`）
- [ ] T048 [US2] エスプレッソ・ショットの 3 案の比較画像を見せて選んでもらう
- [ ] T049 [US2] エスプレッソ・ショットで選んだ案だけを残す（src/weapons/espresso.js、src/config.js）
- [ ] T050 [US2] アイス珈琲の MAX の見た目の 3 案を作る（src/weapons/ice.js、src/config.js `ice.maxVisual`）。結晶の腕の先までを当たる半径にする
- [ ] T051 [US2] アイス珈琲の 3 案の比較画像を見せて選んでもらう
- [ ] T052 [US2] アイス珈琲で選んだ案だけを残す（src/weapons/ice.js、src/config.js）
- [ ] T053 [US2] フレンチプレスの MAX の見た目の 3 案を作る（src/weapons/press.js、src/config.js `press.maxVisual`）
- [ ] T054 [US2] フレンチプレスの 3 案の比較画像を見せて選んでもらう
- [ ] T055 [US2] フレンチプレスで選んだ案だけを残す（src/weapons/press.js、src/config.js）
- [ ] T056 [US2] ラテアートの MAX の見た目の 3 案を作る（src/weapons/latte.js、src/config.js `latte.maxVisual`）
- [ ] T057 [US2] ラテアートの 3 案の比較画像を見せて選んでもらう
- [ ] T058 [US2] ラテアートで選んだ案だけを残す（src/weapons/latte.js、src/config.js）
- [ ] T059 [US2] quickstart §2 を 10 種類すべてで行う（Lv 7 と 8 の見比べ、当たる範囲との一致、見間違えないこと）

**Checkpoint**: 10 種類すべての MAX がひと目で分かる

---

## Phase 5: User Story 3 - 見た目と当たる範囲・重なり方の不具合がない（Priority: P3）

**Goal**: Phase 2 で直した不具合（FR-014）が、強化と MAX の見た目を入れたあとも直ったままであることを確かめる

**Independent Test**: quickstart §3

- [ ] T060 [US3] quickstart §3 の表（ミル・こぼれ珈琲・ラテアート・エスプレッソ）を、Lv 1 と Lv 8 の両方で確かめる。MAX のこぼれ跡やストリームでも、重なり・当たる範囲が正しいこと

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T061 quickstart §4：MAX の武器 3 つ（例：`?weapons=mill:8,ice:8,puddle:8`）で敵 150 体まで遊び、1 フレームが 16.7ms 以内か確かめる。重い武器があれば、光の作り置き・照合する敵の絞り込みで軽くする（SC-004）
- [ ] T062 Edge Cases を確かめる：範囲アップ Lv 8 と重ねたときの大きさ（プレス・ラテ・ショックウェーブ）、攻撃の間隔の下限 0.3 倍、ボスに効かないもの（凍り・押し返し・足どめ）、ドリップ MAX のボス戦の強さ、アイスの凍らせ続け、ラテの回復が毎秒 2.5 を上回らないこと。強すぎる・弱すぎるものは src/config.js の値で調整する
- [ ] T063 [P] specs/012-weapon-upgrades/spec.md の表を、調整した最終の値と選んだ MAX の見た目に合わせて書き直し、Status を Implemented にする。specs/007-weapon-max-level/spec.md の FR-002 と Assumptions（「豆マシンガン以外の 10 種類の特別な強化と MAX の見た目は範囲外」）を、012 で決めたことに合わせて直す
- [ ] T064 [P] specs/002-weapon-visuals/spec.md の FR-003（Lv が上がるほど見た目を豪華に）と、012 の MAX の見た目との関係を確かめ、食い違いがあればユーザーに報告する（勝手に直さない）
- [ ] T065 README.md・CLAUDE.md に、武器の強化や確認用 URL パラメータ（`?weapons`・`?maxVariant`）と食い違う記述がないか確かめ、あればユーザーに報告する（断りなく編集しない）
- [ ] T066 quickstart §5（移動・ポーズ・リトライ・コンソールのエラー）を最後にもう一度行う

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1（Setup）**: すぐ始められる
- **Phase 2（Foundational）**: Phase 1 のあと。US1・US2 をすべて止める
- **Phase 3（US1）**: Phase 2 のあと。T016（設定）が先、T017〜T026 はそのあと武器ごとに並行できる
- **Phase 4（US2）**: Phase 2 のあと。武器ごとに、その武器の US1 のタスク（T017〜T026 のどれか）が終わってから始める（MAX の挙動の上に見た目を載せるため）
- **Phase 5（US3）**: Phase 3・4 のあと
- **Phase 6（Polish）**: すべてのあと

### 武器ごとの依存（US1 → US2）

| 武器 | 不具合の修正 | 強化（US1） | MAX の見た目（US2） |
| --- | --- | --- | --- |
| ミル | T011 | T017 | T029 → T030 → T031 |
| マグ | — | T018 | T032 → T033 → T034 |
| ショックウェーブ | — | T019 | T035 → T036 → T037 |
| ドリップ | — | T020 | T038 → T039 → T040 |
| スチーム | — | T021 | T041 → T042 → T043 |
| こぼれ珈琲 | T012（T009 も） | T022 | T044 → T045 → T046 |
| エスプレッソ | T014 | T023 | T047 → T048 → T049 |
| アイス | — （T010） | T024 | T050 → T051 → T052 |
| プレス | — | T025 | T053 → T054 → T055 |
| ラテ | T013 | T026 | T056 → T057 → T058 |

### Within Each Weapon

- 不具合の修正 → 強化 → 3 案 → 選んでもらう（ユーザー待ち）→ 選んだ案を残す
- 「選んでもらう」タスクはユーザーの返事が来るまで止まる。その間は、ほかの武器のタスクを進めてよい

### Parallel Opportunities

- Phase 2：T009・T010（enemy.js は同じファイルなので、この 2 つは続けて行う）と、T011〜T014（武器のファイルが別）は並行できる
- Phase 3：T016 のあと、T017〜T026 は武器のファイルが別なので並行できる
- Phase 4：3 案を作るタスクは src/config.js も触るので、同時に 2 つ以上進めるときは config.js の編集がぶつからないように 1 つずつ書き込む

---

## Parallel Example: User Story 1

```text
# T016（src/config.js）が終わったら、武器ごとに同時に進められる：
Task: "T017 [US1] ミル・トルネードの強化 in src/weapons/mill.js"
Task: "T020 [US1] ドリップの雨の強化 in src/weapons/drip.js"
Task: "T024 [US1] アイス珈琲の強化 in src/weapons/ice.js"
```

## Parallel Example: User Story 2

```text
# 選んでもらうのを待っている間に、別の武器の 3 案を作る：
Task: "T030 [US2] ミルの 3 案を見せて選んでもらう"（ユーザー待ち）
Task: "T032 [US2] マグカップ投げの 3 案を作る"
```

---

## Implementation Strategy

### MVP First（User Story 1）

1. Phase 1・2 を終える（確認用の仕組み・共通の仕組み・不具合の修正）
2. Phase 3 を終える（10 種類の強化）
3. **止めて確かめる**：quickstart §1 を全武器で行い、遊べる区切りとしてコミットする

### Incremental Delivery

1. Phase 1・2 → 区切り
2. 武器 1 種類ずつ US1 → 確認 → コミット（MVP は 10 種類そろった時点）
3. 武器 1 種類ずつ US2（3 案 → 選択 → 実装）→ 確認 → コミット
4. US3・Polish で全体を確かめて仕様を最終の値に合わせる

---

## Notes

- 「[P]」は別ファイルで依存がないタスク。src/config.js はほぼ全タスクで触るので、同時に書き込まない
- 数値は初期案。遊んで決めた値は spec.md の表にも反映する（T063）
- 確認用の URL パラメータ（`?weapons`・`?maxVariant`）は、動作確認のためだけに使い、通常のプレイには影響させない
