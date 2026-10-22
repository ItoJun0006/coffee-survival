# Feature Specification: 豆コインでレベルアップを買える「ドラゴン豆」

**Feature Branch**: `022-dragon-bean`

**Created**: 2026-10-22

**Status**: Draft（決めることが残っている。キャラのアビリティ案：`specs/character-ideas.md`）

**Input**: User description: "今まで集めた豆コインを使用して、レベルアップを追加で獲得できるキャラ。調整が必要。"

## Clarifications

### Session 2026-10-22

- （まだない）

### まだ決めること

毎朝のルーティン（`specs/backlog/tasks.md`）でこの仕様書を選んだら、下の項目をユーザーに聞く（speckit-clarify）。
決まったら上の Session に Q/A で書き、この一覧から消す。見た目の項目は 3 案の比較画像を作って選んでもらう。

- [NEEDS CLARIFICATION] いつ買えるか（ポーズ中にいつでも／レベルアップの画面に「コインで追加」のボタン／始める前に買っておく）と、そのキー操作
- [NEEDS CLARIFICATION] 値段（例：1 回目 20 枚、買うたびに 10 枚ずつ高くなる）と、1 回のプレイで買える回数の上限
- [NEEDS CLARIFICATION] 本人の性能を下げて釣り合いを取るか（例：経験値 0.7 倍）
- [NEEDS CLARIFICATION] なぜ「ドラゴン」か（宝の山を集めるドラゴン？）と説明文
- [NEEDS CLARIFICATION] どの品種を外して、そのマスに入れるか（66 マスは品種と入れ替えると決まった。021 の Clarifications）
- [NEEDS CLARIFICATION] 値段（豆コイン）と、仕入れられるようになる条件（016 FR-018）
- [NEEDS CLARIFICATION] 見た目（キャラの絵）。3 案を作って選ぶ（憲法「開発の流れ」の 4）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 宝の山でレベルを買う（Priority: P1）

ドラゴン豆は、ためてきた豆コインを払って、プレイ中にレベルアップを追加でもらえる。お金で強くなれるが、使ったコインはほかのキャラを買うのに使えなくなる。

**Independent Test**: 豆コインを持った状態でドラゴン豆で遊び、コインを払うとレベルアップの画面が出て、持っているコインが減ることで確認できる。

**Acceptance Scenarios**:

1. **Given** 豆コインを持ったドラゴン豆, **When** コインでレベルアップを買う, **Then** レベルアップの画面が出て、コインが値段の分だけ減る
2. **Given** コインが足りない, **When** 買おうとする, **Then** 買えず、足りないことが分かる
3. **Given** ほかのキャラ, **When** 遊ぶ, **Then** コインでレベルアップは買えない

### Edge Cases

- 1 回のプレイでたまる豆コインは 50〜100 枚前後（016 FR-011）。安すぎるとほかのキャラを買う楽しみがなくなる。
- ゲームオーバーになっても、使ったコインは戻らない。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: キャラ「ドラゴン豆」を特別なキャラとして加えなければならない。
- **FR-002**: ドラゴン豆は、プレイ中に豆コインを払ってレベルアップを追加でもらえなければならない。
- **FR-003**: 値段・買える回数の上限は設定ファイルで変えられる（憲法 III）。

## Assumptions

- 書いてある数値（例の値）は初期案。決まったら Clarifications に書き、遊んでから決めるものは `specs/backlog/playtest.md` に足す（憲法「開発の流れ」の 6）。
- 特別なキャラとして扱い、品種の倍率と特別な力は付けない（016）。性能は、ことわりがなければアラビカ中煎りと同じ。
