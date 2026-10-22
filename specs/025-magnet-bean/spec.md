# Feature Specification: 10 秒ごとに極が入れ替わる「磁石豆」

**Feature Branch**: `025-magnet-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "sn 極を 10 秒毎に切り替えて、経験値と豆を引き寄せたり引き離したりする。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] 引き寄せる距離と強さ。引き離す極の間は、落ちている粒を押し出すだけか、触れても拾えなくなるか
- [NEEDS CLARIFICATION] 敵にも効くか（引き離す極で敵を少し押し返すと、守りの時間になる）
- [NEEDS CLARIFICATION] 極の表示（色・残り秒数）と、入れ替わる直前の知らせ。見た目なので 3 案から選ぶ
- [NEEDS CLARIFICATION] 66 マスのどこに入れるか？ 今は 66 マスがすべてうまっている（016 FR-001）。マスを増やす（`plannedTotal`）か、品種を 1 つ外すか（016 FR-022 のケントと同じ）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 引き寄せと引き離しを使い分ける（Priority: P1）

磁石豆は、10 秒ごとに S 極と N 極が入れ替わる。引き寄せる極の間は経験値の粒と珈琲豆を遠くから集め、引き離す極の間は押し出してしまう。入れ替わるタイミングを見て動くのが大事になる。

**Independent Test**: 磁石豆で遊び、10 秒ごとに極が入れ替わり、経験値の粒と豆が近づいたり離れたりすることで確認できる。

**Acceptance Scenarios**:

1. **Given** 引き寄せる極, **When** 経験値の粒と豆が近くにある, **Then** 遠くからでも吸い寄せられる
2. **Given** 引き離す極, **When** 経験値の粒と豆が近くにある, **Then** 押し離される
3. **Given** 10 秒たつ, **When** 極が入れ替わる, **Then** 表示（色・残り秒数）が変わる

### Edge Cases

- 品種の力「吸い寄せ」（016、`magnetRate`）のしくみを使う。
- ポーズ中・レベルアップの選択中は、入れ替わるまでの時間も止まる。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「磁石豆」を特別なキャラとして加えなければならない。
- **FR-002**: 磁石豆は、10 秒ごとに「引き寄せる極」と「引き離す極」を入れ替えなければならない。
- **FR-003**: 引き寄せる極の間は経験値の粒と珈琲豆を遠くから吸い寄せ、引き離す極の間は押し離さなければならない。
- **FR-004**: 今どちらの極か分かる表示を出さなければならない。
- **FR-005**: 入れ替わる秒数・吸い寄せる距離・押す強さは設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
