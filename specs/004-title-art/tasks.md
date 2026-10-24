# Tasks: 選んだキャラをタイトル画面に出す（004 の User Story 2）

**Input**: specs/004-title-art/spec.md の User Story 2・FR-004・Edge Cases

**Created**: 2026-10-23（バックログ B004）

User Story 1（タイトルのイラスト）は実装済み。この tasks.md は User Story 2 だけを扱う。

## Format: `[ID] [P?] [Story] Description`

- **[US2]**: 004 の User Story 2

## 係の受け持ち（031）

- タイトル画面は `src/game.js`（メイン）。キャラの絵は、キャラ係の `src/entities/player.js` の `drawCharacter` を呼ぶだけにして、書き換えない。数値（位置・大きさ・動き）は `src/config.js` の `title` のまとまりに置く。

---

## Phase 1: 決めること

- [ ] T001 [US2] タイトルの絵のどこに・どの大きさで出すかを 3 案から選んでもらう：specs/004-title-art/candidates/title-character-abc.jpg（A カップの左に立って見上げる／B カップの湯気の中にふわふわ浮かぶ／C 右下に小さく立ち、名前の札を付ける）。決まったら spec.md の Clarifications に書く（ユーザーの選択待ち）

## Phase 2: 実装

- [ ] T002 [US2] `src/config.js` の `title` に、キャラの位置（タイトルの絵の中の位置）・大きさ・動きの値を足す（T001 の案に合わせる）
- [ ] T003 [US2] `src/game.js` のタイトル画面で、前回選んだキャラ（選んだことがなければアラビカの中煎り。FR-004）を、`drawCharacter` でドット絵の層（008）を通して描く。絵のゆっくりした拡大・縮小（FR-003）に合わせて、位置と大きさも一緒に動かす
- [ ] T004 [US2] こーひー3兄弟・ピーベリー・スキン「椿」など、形の違うキャラでも、タイトルの文字や記録のカード（001 の FR-063）と重ならないことを確かめる。画像の読み込みが終わる前（文字だけのタイトル。FR-003a）は、キャラを出さない

## Phase 3: 仕上げ

- [ ] T005 [US2] spec.md の Acceptance Scenario（深煎りで遊んでからタイトルに戻ると深煎りが出る）と、Edge Cases（幅 1000px〜2560px で重ならない・はみ出さない）をヘッドレスブラウザで確かめる。いつもの確認（タイトル → キャラ選択 → 最初の攻撃 → プレイ → ポーズ → やり直し、コンソールのエラー）も行う
- [ ] T006 spec.md の Status を直し、バックログ B004 を完了にする

## Dependencies

- T001 が終わるまで T002〜T004 は始めない。T005・T006 は最後
