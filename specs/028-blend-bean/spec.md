# Feature Specification: 攻撃の枠が 4 つ、アイテムの枠がない「ブレンド豆」

**Feature Branch**: `028-blend-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "（追加案）攻撃の枠が 4 つになるかわりに、アイテムの枠がない。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] まくらウサギ（013）を倒したら 5 つにするか
- [NEEDS CLARIFICATION] 椿の花（010）はアイテムの枠を使わないので、今までどおり出してよいか
- [NEEDS CLARIFICATION] どの品種を外して、そのマスに入れるか（66 マスは品種と入れ替えると決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 攻撃を混ぜて戦う（Priority: P1）

ブレンド豆は、攻撃を 4 つまで持てるが、ステータス強化アイテムを持てない。アイテムで底上げできない分、攻撃の組み合わせで勝負する。

**Independent Test**: ブレンド豆で遊び、攻撃を 4 つ持てること、レベルアップにアイテムのカードが出ないことで確認できる。

**Acceptance Scenarios**:

1. **Given** ブレンド豆, **When** 攻撃を集める, **Then** 4 つまで持てる
2. **Given** ブレンド豆, **When** レベルアップする, **Then** ステータス強化アイテムのカードは出ない

### Edge Cases

- レア敵まくらウサギ（013）を倒すと攻撃の枠が 4 つになる。ブレンド豆が倒したら 5 つにするか決める。
- 001 FR-025（攻撃は 3 つまで）の例外になる。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「ブレンド豆」を特別なキャラとして加えなければならない。
- **FR-002**: ブレンド豆は、攻撃の枠が 4 つ、アイテムの枠が 0 でなければならない。
- **FR-003**: 枠の数は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
