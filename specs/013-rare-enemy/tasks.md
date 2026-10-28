---
description: "Task list for 013-rare-enemy"
---

# Tasks: 倒すと攻撃の枠が 4 つになるレア敵

**Input**: Design documents from `/specs/013-rare-enemy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: 自動テストの仕組みはない。確認は [quickstart.md](./quickstart.md) の手順でブラウザで行う。

**始める前に**: 012（`specs/012-weapon-upgrades`）を進めている別セッションが `src/game.js`・`src/config.js` の編集を終えてから、Phase 2 以降を始める（同じファイルを同時に触らない）。Phase 1 の見た目の 3 案は、src を変えずに作れる。

**共通の約束**:
- 数値・色・文言は `src/config.js` の `CONFIG.rareEnemy` に置く（憲法 III）。初期値は [data-model.md](./data-model.md) の表。
- 仕様と実装は別のコミットにする。2026-10-23 を過ぎたら `013-rare-enemy` ブランチで進める（憲法 V）。コミット・プッシュ・ブランチ作成の前にはユーザーに確認する。

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup（見た目を決める）

**Purpose**: 見た目を 3 案から選ぶ（CLAUDE.md、FR-008）。src は変えない

- [x] T001 レア敵の見た目の 3 案（research R7 の例：A 夢見るヒツジの子、B まくらウサギ、C あくびホタル）を、ドット絵の層（`src/pixel-layer.js`）を通した実際の描画で作り、ふつうの敵 3 種類・ボス・経験値の粒・珈琲豆と並べた比較画像にする。描画のコードは確認用の一時的なもの（scratchpad など）に置き、src は変えない
- [x] T002 比較画像をユーザーに見せ、1 案と名前を選んでもらう（ユーザーの返事を待つ）。→ まくらウサギ（B 案）

---

## Phase 2: Foundational（攻撃の枠と設定）

**Purpose**: どのストーリーにも要る土台。**012 の別セッションが終わってから始める**

- [x] T003 src/config.js に `CONFIG.rareEnemy` を data-model.md の表の初期値で追加する。`look` には T002 で選んだ案の色・大きさを、`texts` には選んだ名前と「レア敵が現れた！」「攻撃の枠が 4 つになった！」「レア敵は逃げてしまった…」を入れる
- [ ] T004 src/game.js に `weaponSlots` を足す：`reset()` で `CONFIG.slots.weapons`（3）にし、`CONFIG.slots.weapons` を読んでいるすべての所（レベルアップの候補、確認用の `?weapons`、左上の「攻撃 n/m」、キャラの解放条件 `allWeaponsMax`）を `this.weaponSlots` に置き換える（research R5）。挙動は変えない（まだ 4 にする処理はない）（2026-10-28：`game.weaponSlots` を用意し、倒したら 4 にするところまで敵係で実装。読んでいる 3 か所の読み替えはメインにお願いした）
- [x] T005 specs/001-game-baseline/spec.md の FR-025 を「持てる攻撃は 3 つまで（レア敵を倒したプレイでは 4 つまで。013）」に書き直す

**Checkpoint**: 枠の上限が 1 か所で変えられるようになった

---

## Phase 3: User Story 1 - レア敵を追いかけて倒し、攻撃の枠を増やす（Priority: P1）🎯 MVP

**Goal**: レア敵が出て、距離で動きを変え、倒すと枠が 4 つになる

**Independent Test**: quickstart §1（`?rare`）

- [x] T006 [US1] src/entities/rare-enemy.js を新しく作る：`Enemy`（src/entities/enemy.js）を土台にした `RareEnemy`。体力は出た時点の羊の体力 × `hpRate`、半径・`contactCaffeine`・`xp` は `CONFIG.rareEnemy`。`update(dt, player)` で、距離が `approachDist` より遠いと `approachSpeed` で近づき、`fleeDist` より近いと `fleeSpeed` で離れる向きに逃げ、その間は `wanderTurnSec` ごとに向きを変えながら `wanderSpeed` でうろうろする。凍っている間は動かず、足どめ・押し返しはふつうの敵と同じく効く。マップの端では壁に向かう成分を消し、角では壁から離れる向きを足して抜け出す（research R4）。`draw(ctx)` は T002 で選んだ見た目を `CONFIG.rareEnemy.look` で描く
- [x] T007 [US1] src/game.js：`?rare` のとき `reset()` で `rareAt = 3`（秒）にする（FR-009）。`rareAt` を過ぎたら、画面の外（ふつうの敵と同じ `#spawnPoint()` で、マップの内側の画面に映らない所）に `RareEnemy` を 1 体出して `this.rare` と `this.enemies` に入れ、知らせ（`notice`）と効果音を出す。ふつうの敵の上限（150 体）を数えるときはレア敵を除く（research R2）
- [ ] T008 [P] [US1] src/sound.js にレア敵が出たとき（`rareAppear`）と倒したとき（`rareDefeat`）の効果音を足す。今の効果音と同じ作り方（ブラウザの中で組み立てる。音楽ファイルは使わない）で、ふつうの撃破・ボス出現と聞き分けられる音にする（2026-10-28：`sound.js` は音楽係の受け持ち。今は `rareEnemy.sounds` で今ある音を使う。音楽係にお願いした）
- [x] T009 [US1] src/game.js：レア敵が倒れたら（`#removeDeadEnemies`）、`weaponSlots` を `CONFIG.rareEnemy.slots`（4）にし、「攻撃の枠が 4 つになった！」と知らせ、`rareDefeat` の音、ふつうより大きな撃破エフェクト（`DefeatEffect` の粒の数・広がりを増やす値を `CONFIG.rareEnemy` に置く）を出し、`xp` の経験値の粒を落とす。`this.rare` と `rareAt` を `null` にする
- [x] T010 [US1] src/game.js：レア敵が画面の外にいる間、HUD の層（ドット絵にしない層）で、画面の端に向きを示す矢印を描く（research R6）。色と大きさは `CONFIG.rareEnemy.look`
- [x] T011 [US1] quickstart §1 を行う（出る・動く・角・倒す・4 つ目を選べる・やり直すと 3 に戻る）。SC-001（30 秒以内に倒せる）と SC-002（立ち止まっていると 60 秒倒れない）に合わない場合は `CONFIG.rareEnemy` の速さ・距離・体力を調整する

**Checkpoint**: `?rare` でレア敵を倒して 4 つ目の攻撃を持てる

---

## Phase 4: User Story 2 - 出会えるかどうか分からない（Priority: P2）

**Goal**: 10% の確率で 4:00〜7:00 に 1 回だけ出て、90 秒かボス出現で去る

**Independent Test**: quickstart §2・§3

- [x] T012 [US2] src/game.js の `reset()` で、メインのステージのときだけ `Math.random() < chance` なら `rareAt` を `appearFromSec`〜`appearToSec` のランダムな時刻に、そうでなければ `null` にする。エクストラステージ（011）では常に `null`（research R3）
- [x] T013 [US2] src/entities/rare-enemy.js と src/game.js：出てから `leaveAfterSec` たつか、ボスが出たら `leaving` にし、プレイヤーから離れる向きに `fleeSpeed` で走り去らせ、画面の外に出たら `this.enemies` から消して「レア敵は逃げてしまった…」と知らせる。去っている途中でも倒せば T009 の報酬を得る。ボスが予定の時刻より先に出たら、その時点で `rareAt` を `null` にする
- [x] T014 [US2] quickstart §2（90 秒で去る、ボスで去る）と §3（`reset()` を 200 回呼んで出る回数 10〜30 回、時刻がすべて 240〜420 秒）を行う

**Checkpoint**: ふつうに遊ぶと、10 回に 1 回くらいレア敵に出会える

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T015 Edge Cases を確かめる：触れるとカフェインが減る、凍る・足どめ・押し返しが効く、1 回のプレイで 2 体目は出ない、枠 4 のときの `allWeaponsMax` の解放条件は 4 つで数える、エクストラステージでは出ない
- [x] T016 [P] specs/013-rare-enemy/spec.md を、調整した値と選んだ名前・見た目に合わせて書き直し、Status を Implemented にする。specs/ideas.md の #4 の状態を「実装した（013）」にする
- [x] T017 [P] README.md・CLAUDE.md にレア敵・攻撃の枠・`?rare` と食い違う記述がないか確かめ、あればユーザーに報告する（断りなく編集しない）（2026-10-28：README の「確認用の URL パラメータ」の表に `?rare` がなく、`?weapons` の説明に「攻撃の枠 3 つまで」とある。ユーザーに報告した）
- [x] T018 quickstart §4（移動・ポーズ・リトライ・コンソールのエラー）

---

## Dependencies & Execution Order

- **Phase 1**: すぐ始められる（src を変えない）。T002 はユーザーの返事待ち
- **Phase 2**: T002 と、012 の別セッションの終了を待つ
- **Phase 3（US1）**: Phase 2 のあと。T006 → T007 → T009 → T010 の順（T008 は別ファイルなので並行できる）
- **Phase 4（US2）**: Phase 3 のあと（T013 は T006・T007 の上に作る）
- **Phase 5**: すべてのあと

## Parallel Example

```text
# T006（rare-enemy.js）と並行して：
Task: "T008 [US1] レア敵の効果音 in src/sound.js"
```

## Implementation Strategy

1. Phase 1 で見た目を決めておく（012 の作業中でも進められる）
2. 012 の別セッションが終わったら Phase 2・3 → `?rare` で遊んで確かめる（MVP）
3. Phase 4 で確率と去る仕組みを入れ、ふつうのプレイに組み込む
