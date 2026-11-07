# Tasks: タイトルから遊べるビデオポーカー

**Input**: [spec.md](./spec.md)・[plan.md](./plan.md)

## Phase 1: 準備

- [x] T001 `src/config.js` の cardGame のすぐ後ろに `poker`（回数・賭けの段階・役の名前と倍率・親・遊び方・文言）を足し、`cardGame.colors` に赤と役の表の光を足す

## Phase 2: 共通の部品（すべての話の土台）

- [x] T002 `src/card-table.js` に、ブラックジャックとポーカーで共通の画面の部品（`CardTable`）をまとめる
- [x] T003 `src/card-game.js` を `CardTable` を受け継ぐ形に直し、ブラックジャックの遊び方と見た目が変わらないことを確かめる
- [x] T004 [P] `src/entities/dealer-parts.js` に親の絵の共通の部品をまとめ、`src/entities/sheep-dealer.js` をそれを使う形に直す

## Phase 3: User Story 1 - タイトルからポーカーを 1 回遊ぶ（P1）

- [x] T005 [US1] `src/poker.js` に、山札・役の判定（9 つの役と役なし）・豆コインの増減を作る
- [x] T006 [US1] `src/video-poker.js` に、賭ける → 5 枚配る → 残す札を選ぶ → 交換して役を決める → 10 回でまとめ、の流れを作る
- [x] T007 [US1] `src/game.js` のタイトルに、ポーカーのボタンと P キーの入口を足し、`poker` の画面の更新と描画をつなぐ

## Phase 4: User Story 2 - 豆コインを本編と共有する（P1）

- [x] T008 [US2] 役が決まるたびに豆コインを動かし、豆コインが足りないときは入れずに知らせる

## Phase 5: User Story 3 - 遊び方と役が分かる（P1）

- [x] T009 [US3] 遊び方のページ（はじめてのときと H キー）・いつも見える役の表（今の役が光る）・残す札のおすすめ・結果の理由を出す

## Phase 6: User Story 4 - ポーカー専用の親（P2）

- [x] T010 [P] [US4] `src/entities/owl-dealer.js` に「ねぼけフクロウの店主」を作る

## Phase 7: 仕上げ

- [x] T011 ブラウザで、役の判定（1 を使う 2 通りのストレート・Q K 1 2 3 は役なし を含む）・残す・交換・役なし・交換前にやめる・まとめ・ブラックジャックが今までどおり動くことを確かめる
- [x] T012 仕様書の Status を Implemented にし、README との食い違いを確かめて報告する

## Phase 8: 遊んでからの見直し（豆コインが増えにくい）

- [x] T013 `src/video-poker.js` を、交換する札を選ぶ形に直す（印は「交換」、選んだ札だけを引き直す）
- [x] T014 `src/poker.js` で、ワンペアをどの数字でも役にし、交換する札のおすすめに直す
- [x] T015 `src/config.js` で、ツーペアを ×3 にし、遊び方・おすすめ・操作の文言を直す
- [x] T016 ブラウザで、交換する札を選ぶ・どの数字のペアでも役・倍率・おすすめを確かめる
