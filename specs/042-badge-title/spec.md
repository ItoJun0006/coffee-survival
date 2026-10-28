# Feature Specification: タイトルに、持っている豆の証を出す

**Feature Branch**: `feature/081-badge-title`

**Created**: 2026-10-28

**Status**: Implemented

**Input**: キャラ係（仕様 081 豆の証）からの任意のお願い。ユーザーが作ると決めた（2026-10-28）

## Clarifications

### Session 2026-10-28

- Q: 見た目は？ → A: 3 案（A 1 行の文／B 10 個の枠に盾を並べる／C 豆コインの横に ×個数）から B
- Q: 1 個も持っていないときは？ → A: 何も出さない（見つけるまでの楽しみ。メインの判断）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: タイトル画面の左下、豆コインの上に、豆の証の最大数（10）の枠を並べ、持っている数だけ盾（仕様 081 の絵）を描かなければならない。右に「豆コイン +N%」（N は個数 × 10）を出す。
- **FR-002**: 1 個も持っていないときは、何も出さない。
- **FR-003**: 間隔・色・文は設定ファイル（`title.badgeCount`）で変えられる（憲法 III）。
