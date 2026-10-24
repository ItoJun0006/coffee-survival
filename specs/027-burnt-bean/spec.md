# Feature Specification: 眠いほど強くなる「焦げ豆」

**Feature Branch**: `027-burnt-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "（追加案）眠気が強い（カフェインが少ない）ほど攻撃力が上がる。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] 上がり方（カフェイン 20% で 1.8 倍など。まっすぐ上がるか、少なくなるほど急に上がるか）
- [NEEDS CLARIFICATION] 今どれくらい強くなっているか分かる表示（焦げて煙が出るなど）。見た目なので 3 案から選ぶ
- [NEEDS CLARIFICATION] 空いたマスのどこに入れるか（外す品種はカティモール・マラゴジッペ・パカマラ・ビジャサルチと決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ギリギリで戦う（Priority: P1）

焦げ豆は、カフェインが減って眠くなるほどダメージが上がる。珈琲豆をすぐ拾わずに強いまま戦うか、安全を取って拾うか、駆け引きが生まれる。

**Independent Test**: 焦げ豆で、カフェインが多いときと少ないときで同じ攻撃のダメージが変わることで確認できる。

**Acceptance Scenarios**:

1. **Given** 焦げ豆のカフェインが 100%, **When** 攻撃する, **Then** ダメージは 1 倍
2. **Given** 焦げ豆のカフェインが 20%, **When** 攻撃する, **Then** ダメージが上がっている（例：1.8 倍）

### Edge Cases

- エクストラステージ（011）ではカフェインが時間で減らないので、強くなりにくい。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「焦げ豆」を特別なキャラとして加えなければならない。
- **FR-002**: 焦げ豆は、カフェインが少ないほどすべての攻撃のダメージを上げなければならない。
- **FR-003**: ダメージの上がり方は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
