# Feature Specification: 時間で眠くならないが打たれ弱い「デカフェ豆」

**Feature Branch**: `026-decaf-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "（追加案）カフェインが時間で減らないが、上限が低く、敵に触れると大きく減る。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] カフェインの上限（例：60）と、敵に触れて減る量の倍率（例：1.5 倍）
- [NEEDS CLARIFICATION] 珈琲豆を拾ったときの回復はそのままか
- [NEEDS CLARIFICATION] 空いたマスのどこに入れるか（外す品種はカティモール・マラゴジッペ・パカマラ・ビジャサルチと決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 当たらなければ眠くならない（Priority: P1）

デカフェ豆は、放っておいても眠くならない。そのかわりカフェインの上限が低く、敵に当たると一気に眠くなる。逃げ回るのがうまい人向けのキャラ。

**Independent Test**: デカフェ豆で遊び、時間がたってもカフェインが減らず、敵に触れたときの減り方が大きいことで確認できる。

**Acceptance Scenarios**:

1. **Given** デカフェ豆, **When** 時間がたつ, **Then** カフェインは減らない
2. **Given** デカフェ豆, **When** 敵に触れる, **Then** カフェインがほかのキャラの 1.5 倍減る
3. **Given** デカフェ豆, **When** 始める, **Then** カフェインの上限が低い（例：60）

### Edge Cases

- エクストラステージ（011）は、もともとカフェインが時間で減らない。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「デカフェ豆」を特別なキャラとして加えなければならない。
- **FR-002**: デカフェ豆は、カフェインが時間で減ってはならない。
- **FR-003**: デカフェ豆は、カフェインの上限が低く、敵に触れて減る量が多くなければならない。
- **FR-004**: 上限と倍率は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
