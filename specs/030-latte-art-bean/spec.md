# Feature Specification: 歩いた跡のミルクで攻撃する「ラテアート豆」

**Feature Branch**: `030-latte-art-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "（追加案）歩いた跡にミルクの線が残り、踏んだ敵にダメージ。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] 線が残る秒数・ダメージ・太さ。Lv で何が伸びるか。MAX（Lv 8）の見た目
- [NEEDS CLARIFICATION] このキャラしか持てない武器にするか
- [NEEDS CLARIFICATION] 線の見た目（ハートや葉っぱの模様など）。3 案から選ぶ
- [NEEDS CLARIFICATION] 空いたマスのどこに入れるか（外す品種はカティモール・マラゴジッペ・パカマラ・ビジャサルチと決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ミルクの線で囲む（Priority: P1）

ラテアート豆は、歩いた跡にミルクの線が数秒残り、その上にいる敵にダメージを与える。敵の群れの周りをぐるっと回ると、線で囲んで倒せる。止まっていると何も起きない。

**Independent Test**: ラテアート豆で歩き回り、跡にミルクの線が残り、線の上の敵にダメージが入ることで確認できる。

**Acceptance Scenarios**:

1. **Given** ラテアート豆, **When** 歩く, **Then** 跡にミルクの線が残る
2. **Given** ミルクの線の上に敵がいる, **When** 時間がたつ, **Then** 敵にダメージが入る
3. **Given** 数秒たつ, **When** 線が古くなる, **Then** 線は消える

### Edge Cases

- 散弾ロブスタの `startWeapon` と同じしくみで、最初の攻撃にする。
- 線の数が多いと重くなる（敵 150 体で 16.7ms 以内）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「ラテアート豆」を特別なキャラとして加えなければならない。
- **FR-002**: ラテアート豆は、最初の攻撃として専用の武器「ミルクの線」を持たなければならない。
- **FR-003**: 歩いた跡に線が残り、決まった秒数で消え、線の上の敵にダメージを与えなければならない。
- **FR-004**: 残る秒数・ダメージ・太さ・Lv ごとの強化は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
