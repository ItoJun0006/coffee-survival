# Feature Specification: まくらウサギの効果音

**Feature Branch**: `lite_sound_rare`（音楽係。仕様書の番号は 102）

**Created**: 2026-10-28

**Status**: Implemented（出たとき C・倒したとき C に決めた）

**Input**: メイン（otWeb_main）からの依頼（敵係からの取り次ぎ）。レア敵「まくらウサギ」（仕様 013、敵係の PR #55）の専用の効果音を 2 つ

## Clarifications

### Session 2026-10-28

- Q: どの音を作るか？ → A: `rareAppear`（出たとき：めったに出ない、うれしい驚き。ふわっと眠たげで、すぐ逃げそうな感じ）と `rareDefeat`（倒したとき：ごほうび。このプレイの間、攻撃の枠が 4 つになる）
- Q: どの案にするか？（2026-10-29） → A: 出たとき C（ぴょこぴょこ跳ねながら遠ざかる）、倒したとき C（4 つの鈴を数えて和音）
- Q: つなぎ方は？ → A: `CONFIG.rareEnemy.sounds` の 2 つを差し替える（敵係のまとまりだが、この 1 か所は音楽係が差し替えてよい）

## 案（candidates/）

どれも、後ろで「いつもの一杯」を流し、1.2 秒のところで効果音を鳴らしたもの。楽譜は `candidates/recipes.mjs`。

| ファイル | 中身 |
|---|---|
| `appear-a.mp3` | 鈴がふわっと上がって、あくびのように下がる |
| `appear-b.mp3` | 口笛が「ふぁ〜」と上がってから下がる。最後に小さな鈴 |
| `appear-c.mp3`（選んだ） | ぴょこぴょこ跳ねながら遠ざかる |
| `defeat-a.mp3` | 鈴のごほうびの和音。下でエレピの和音がふんわり鳴る |
| `defeat-b.mp3` | 鉄琴を一気にかけ上がって、キラキラが残る |
| `defeat-c.mp3`（選んだ） | 枠が 1 つずつ増えるように、4 つの鈴を数えるように鳴らし、最後に和音 |

## Requirements *(mandatory)*

- **FR-001**: `sound.play('rareAppear')` と `sound.play('rareDefeat')` で鳴る。音楽ファイルは使わず、BGM と同じ楽器（`src/music/voices.js`）で組み立てる
- **FR-002**: 大きさは、今の効果音（クリア・レベルアップ）とそろえる（0.1 秒ごとのいちばん大きいところが同じくらい）
- **FR-003**: ボスの登場の音・クリアの音とは違う音にする（今まで仮にこの 2 つを鳴らしていた）

## Success Criteria *(mandatory)*

- **SC-001**: 実際のゲームで 2 つの音を鳴らして、コンソールにエラーが出ない
- **SC-002**: `npm --prefix tests test` がすべて通る
