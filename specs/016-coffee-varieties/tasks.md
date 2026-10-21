---
description: "Task list for 016-coffee-varieties"
---

# Tasks: 珈琲豆の品種を増やしてキャラを 66 体にする

**Input**: Design documents from `/specs/016-coffee-varieties/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: 自動テストの仕組みはない。確認は [quickstart.md](./quickstart.md) の手順でブラウザで行う。

**共通の約束**:
- 数値・色・文言は `src/config.js` の `CONFIG.characters`・`CONFIG.coins` に置く（憲法 III）。初期値は [data-model.md](./data-model.md) と [research.md](./research.md) の R2〜R4。
- 仕様と実装は別のコミットにする。コミット・プッシュの前にはユーザーに確認する。

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup（見た目を決める）

**Purpose**: 見た目を 3 案から選ぶ（CLAUDE.md）

- [x] T001 品種の見た目の 3 案（形と大きさ・割れ目／豆の上の模様／頭や首の飾り）を、実際の描画処理とドット絵の層で 66 マスに並べた画像にし、選んでもらう。→ 豆の上の模様
- [x] T002 浅煎りでも模様が見えるよう、紛れる模様に浅煎り用の色（`lightColor`）を決め、66 マスの画像を作り直す
- [x] T003 品種を買うポップアップと、結果画面の豆コインの 3 案を画像にし、選んでもらう。→ 喫茶店のメニュー風／内わけを数え上げる

---

## Phase 2: Foundational（設定と保存）

**Purpose**: どのストーリーにも要る土台

- [x] T004 src/config.js の `CONFIG.characters.varieties` に、21 品種の `origin`・`trait`・`rates`・`power`・`price`・`pattern` を research R2・R4 の値で書く。`CONFIG.characters.powers`（8 種類）と `statBars`（性能のバーの範囲）を足す
- [x] T005 src/config.js に `CONFIG.coins`（たまり方・数え上げの速さ・メニューの色・文言）を data-model.md の値で足す
- [x] T006 src/progress.js に豆コインの量（`coins`）を足す：読み込み・保存、`coins()`・`addCoins(n)`、品種を買う `buyVariety(ids, price)`（足りなければ何もしない）。`?unlockAll`（すべて解放済みとして扱う）と `?coins=N`（N 枚持った状態）を読み、そのときは保存しない

**Checkpoint**: 設定と保存の土台ができた

---

## Phase 3: User Story 1 - 66 体のキャラが並び、品種ごとに違う遊び心地で遊べる（Priority: P1）🎯 MVP

**Goal**: 66 体が並び、品種ごとに性能・特別な力・模様が違う

**Independent Test**: quickstart §1・§2（`?unlockAll`）

- [x] T007 [US1] src/characters.js：品種 × 焙煎度のキャラを、焙煎度の性能に品種の `rates` を掛けて作る（`roast` に `id` を残す）。`power` を付け、アラビカ以外は `unlock: { price }` にする。並びは、アラビカの 3 体 → 特別なキャラ 3 体 → ほかの品種（research R1）
- [x] T008 [US1] src/characters.js：性能のバーの範囲を `CONFIG.characters.statBars` から読む。`describeStats` は倍率を小数 2 桁までで出し、特徴の一言と特別な力（名前・効果）を返せるようにする
- [x] T009 [P] [US1] src/entities/variety-look.js（模様 20 種類）と src/entities/player.js（豆の色のあとに模様を描く。浅煎りは `lightColor`）。アラビカと特別なキャラは今の見た目のまま
- [x] T010 [US1] 特別な力を効かせる：src/game.js（豆の回復・経験値・範囲・動いている間の攻撃の間隔・止まっている間のダメージ）、src/entities/player.js（無敵時間・カフェインの減り）、src/entities/xp-orb.js（吸い寄せる距離）。力の値は `CONFIG.characters.powers`
- [x] T011 [US1] src/character-select.js：右側の詳しい表示に、特徴の一言と特別な力を出す
- [x] T012 [US1] quickstart §1・§2 を行う

**Checkpoint**: `?unlockAll` で 66 体を選んで遊べる

---

## Phase 4: User Story 2 - 遊んで豆コインをため、品種を買って解放する（Priority: P2）

**Goal**: 豆コインがたまり、結果画面で数え上がり、選択画面で品種を買える

**Independent Test**: quickstart §3・§4

- [x] T013 [US2] src/game.js：そのプレイで倒した敵の数（`runKills`）を数え、`#finish` で豆コインの内わけ（生き延びた時間・倒した敵・クリア／エクストラステージのクリア）を計算して `addCoins` し、結果画面の数え上げ（`coinTally`）を始める。ポーズから「タイトルへ戻る」では足さない
- [x] T014 [US2] src/coin-ui.js を新しく作る：豆コインの絵（`drawCoin`）、結果画面の数え上げ（`drawCoinTally`。暗い地のパネルに明るい文字、行が順に出て数え上がり、合計に足される）、メニュー風のポップアップ（`drawMenuPopup`）
- [x] T015 [US2] src/game.js：結果画面に数え上げを出す。数え上げの途中で Space / Enter / クリックを押すと、すぐ最後の表示にする（やり直しにはしない）。タイトル画面のポイントカードの近くに、今持っている豆コインを出す
- [x] T016 [US2] src/character-select.js：鍵の品種のマスの下に値段を出し、今の量で買える品種は鍵を金色にする。決定するとメニュー風のポップアップを開き、←→ とクリックで「注文する」「やめる」（足りないときは「とじる」）を選ぶ。注文すると `buyVariety` し、知らせを出して、その品種の中煎りを選ぶ。特別なキャラは今までどおり解放条件のポップアップ
- [x] T017 [US2] quickstart §3・§4 を行う

**Checkpoint**: 豆コインで品種を買って遊べる

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T018 src/coin-ui-candidates.js（選ばなかった案）を消す
- [x] T019 [P] specs/001-game-baseline/spec.md の FR-082・FR-085・FR-086 と Assumptions の該当する所、specs/ideas.md の #3 を、016 に合わせて書き直す
- [x] T020 [P] README.md・CLAUDE.md に、品種・豆コイン・`?unlockAll`・`?coins=N` と食い違う記述がないか確かめ、あればユーザーに報告する（断りなく編集しない）
- [x] T021 quickstart §5（移動・ポーズ・リトライ・エクストラステージ・コンソールのエラー、`localStorage` を元に戻す）

---

## Dependencies & Execution Order

- **Phase 1**: 済み
- **Phase 2**: すぐ始められる。T004 → T005（同じファイル）、T006 は並行できる
- **Phase 3（US1）**: Phase 2 のあと。T007 → T008 → T010 → T011（T009 は別ファイルなので並行できる）
- **Phase 4（US2）**: Phase 2 と T007 のあと。T013 → T014 → T015 → T016
- **Phase 5**: すべてのあと

## Implementation Strategy

1. Phase 2・3 → `?unlockAll` で 66 体を遊んで確かめる（MVP）
2. Phase 4 で豆コインと買う流れを入れる
3. Phase 5 で仕様 001 と ideas を合わせる
