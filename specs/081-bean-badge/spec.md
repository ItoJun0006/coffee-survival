# Feature Specification: 敵がまれに落とす「豆の証」で、もらえる豆コインが増える

**Feature Branch**: `081-bean-badge`

**Created**: 2026-10-24

**Status**: Draft（決めることが残っている）

**Input**: User description（otWeb_main から取り次ぎ）: "低確率の要素を追加したい。敵からのドロップで豆の証のようなものを追加して、獲得できるコインの量をリザルト画面で ×1.1 倍できるようなイメージの効果にしたい。最大所持数は 10 個で、最大 2 倍とかがいいと思ってます。ドロップ率は 10 回クリアまでやったら 1 個落ちるくらいに調整して欲しい。"

## Clarifications

### Session 2026-10-24

- （まだない）

### まだ決めること

- [NEEDS CLARIFICATION] 名前（「豆の証」でよいか）
- [NEEDS CLARIFICATION] 増え方：1 個につき +10% の足し算（10 個で 2 倍）か、1.1 倍の掛け算（10 個で約 2.6 倍）か
- [NEEDS CLARIFICATION] プレイをまたいで持ち続けるか（保存する）、そのプレイの間だけか
- [NEEDS CLARIFICATION] 落ちた証は、拾わないと消えるか
- [NEEDS CLARIFICATION] やられた（ゲームオーバーの）プレイでも、拾った証を持ち帰れるか
- [NEEDS CLARIFICATION] 10 個持っているときに落ちたらどうするか（落ちない／拾っても増えない／豆コインに変わる）
- [NEEDS CLARIFICATION] ボス・エクストラステージ・ビッグウェーブで倒した敵からも落ちるか
- [NEEDS CLARIFICATION] 1 体あたりの落ちる確率：1 面のクリアまでに倒す敵の数（N 体）を測り、10 回のクリアで 1 個（1 / (10 × N)）にする
- [NEEDS CLARIFICATION] 見た目（落ちている証・持っている数の表示・結果画面の行）。3 案から選ぶ

## User Scenarios & Testing *(mandatory)*

### User Story 1 - まれに落ちる証を集めて、豆コインを増やす（Priority: P1）

敵を倒すと、ごくまれに「豆の証」が落ちる。拾って持っている数だけ、プレイの終わりの結果画面でもらえる豆コインが増える（10 個で最大 2 倍）。

**Independent Test**: 証を持った状態でプレイを終え、結果画面の豆コインが増えていることで確認できる。

**Acceptance Scenarios**:

1. **Given** 敵を倒す, **When** 低い確率に当たる, **Then** 豆の証が落ちる
2. **Given** 証を 3 個持っている, **When** プレイが終わる, **Then** 結果画面でもらえる豆コインが増える（足し算なら 1.3 倍）
3. **Given** 証を 10 個持っている, **When** さらに落ちる, **Then** 持てる数は 10 個のまま（扱いは決めること）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 敵を倒したとき、低い確率で「豆の証」を落とさなければならない。確率は、1 面のクリアまで遊んで 10 回に 1 個くらいになるようにする。
- **FR-002**: 持っている証の数に応じて、結果画面でもらえる豆コインを増やさなければならない（最大 10 個・最大 2 倍）。
- **FR-003**: 確率・最大数・増え方は設定ファイル（`coins` のまとまり）で変えられる（憲法 III）。

## 受け持ち（仕様 031）

- キャラ係：保存（`src/progress.js`）、豆コインの計算と結果画面の数え上げ（`src/coin-ui.js`）、証そのもの（新しいファイル `src/entities/bean-badge.js`）、設定（`coins`）。
- `src/game.js`：`#removeDeadEnemies` に落とす呼び出しを 1 行足すだけにする（メインの了承済み）。結果画面の流れ（`#finish`・`#earnCoins`）に大きく手を入れるときは、メインにお願いする。
