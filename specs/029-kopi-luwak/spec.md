# Feature Specification: 倒した敵が豆コインを落とす「コピ・ルアク」

**Feature Branch**: `029-kopi-luwak`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "（追加案）倒した敵がときどき豆コインを落とすが、本人は弱い。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] 落とす確率と 1 枚あたりの価値（1 プレイで何枚くらい増えるのがよいか）
- [NEEDS CLARIFICATION] ゲームオーバーになったとき、拾ったコインを全部もらえるか
- [NEEDS CLARIFICATION] 見た目（ジャコウネコの耳など）。3 案から選ぶ
- [NEEDS CLARIFICATION] どの品種を外して、そのマスに入れるか（66 マスは品種と入れ替えると決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - コインを稼ぐ（Priority: P1）

コピ・ルアクで倒した敵は、ときどき豆コインを落とす。本人の攻撃は弱めなので、生き延びながら稼ぐキャラ。高いキャラを買うための「お金稼ぎ役」。

**Independent Test**: コピ・ルアクで遊び、倒した敵がときどき豆コインを落とし、拾うと結果画面のコインに足されることで確認できる。

**Acceptance Scenarios**:

1. **Given** コピ・ルアク, **When** 敵を倒す, **Then** ときどき（例：2%）豆コインが落ちる
2. **Given** 落ちた豆コインを拾った, **When** プレイが終わる, **Then** 結果画面の豆コインに足される
3. **Given** コピ・ルアク, **When** 攻撃する, **Then** ダメージが 0.8 倍

### Edge Cases

- ドラゴン豆（022）と組み合わせると、稼いだコインでレベルアップを買える。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「コピ・ルアク」を特別なキャラとして加えなければならない。
- **FR-002**: コピ・ルアクで倒した敵は、決まった確率で豆コインを落とさなければならない。拾った豆コインは、プレイの終わりに足す（016 FR-011）。
- **FR-003**: コピ・ルアクのダメージは低めでなければならない。
- **FR-004**: 確率・枚数・ダメージの倍率は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
