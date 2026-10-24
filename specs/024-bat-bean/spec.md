# Feature Specification: 周りを飛ぶコウモリが攻撃する「コウモリ豆」

**Feature Branch**: `024-bat-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "特別な武器を持っていて、周りにコウモリが飛んでいて定期的に攻撃してくれる。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] コウモリの動き（キャラの周りを回る／敵へ飛んでいって戻る）と攻撃のしかた（体当たり／超音波）
- [NEEDS CLARIFICATION] Lv で何が増えるか（数・速さ・間隔）と、MAX（Lv 8）の見た目（012・014）
- [NEEDS CLARIFICATION] このキャラしか持てない武器にするか、ほかのキャラもレベルアップで拾えるようにするか
- [NEEDS CLARIFICATION] 「珈琲 × 眠気」の世界観とのつなげ方（夜型の豆？）（憲法 IV）
- [NEEDS CLARIFICATION] コウモリの見た目。3 案から選ぶ
- [NEEDS CLARIFICATION] 空いたマスのどこに入れるか（外す品種はカティモール・マラゴジッペ・パカマラ・ビジャサルチと決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - コウモリを連れて戦う（Priority: P1）

コウモリ豆は、専用の武器「コウモリ」を最初から持っている。周りを飛ぶコウモリが、定期的に近くの敵を攻撃してくれる。

**Independent Test**: コウモリ豆で遊び、最初からコウモリが周りを飛び、定期的に敵へダメージを与えることで確認できる。

**Acceptance Scenarios**:

1. **Given** コウモリ豆で始める, **When** プレイが始まる, **Then** 周りをコウモリが飛んでいる
2. **Given** 近くに敵がいる, **When** 攻撃の間隔がたつ, **Then** コウモリが敵を攻撃してダメージを与える
3. **Given** コウモリを強化する, **When** Lv が上がる, **Then** コウモリが強くなる（数・速さ・間隔など）

### Edge Cases

- 最初の攻撃を変えるしくみは、散弾ロブスタの `startWeapon` と同じものを使う。
- 攻撃の枠（3 つ）のうち 1 つをコウモリが使う。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「コウモリ豆」を特別なキャラとして加えなければならない。
- **FR-002**: コウモリ豆は、最初の攻撃として専用の武器「コウモリ」を持たなければならない。
- **FR-003**: コウモリはキャラの周りを飛び、定期的に敵を攻撃しなければならない。
- **FR-004**: コウモリの数・ダメージ・間隔・Lv ごとの強化は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
