# Feature Specification: 3 つの係（メイン・敵・キャラ）で作業を分ける

**Feature Branch**: `031-parallel-agents`

**Created**: 2026-10-22

**Status**: Implemented（決まりとして使う）

**Input**: User description: "otWeb_lite に仕事を分担して、処理が早くできるようにしたい。それぞれ敵とキャラ用のエージェントを想定しているので、コンフリクトがなるべく起きないように割り振ってください。これは仕様書に入れて欲しい"

## Clarifications

### Session 2026-10-22

- Q: 係はいくつか？ → A: 3 つ。メイン（otWeb_main）、敵係（otWeb_lite_enemy）、キャラ係（otWeb_lite_character）。それぞれ別の会話（セッション）で同時に作業する
- Q: ぶつかり（コンフリクト）を減らすには？ → A: 係ごとに「触ってよいファイル」と「仕様書・タスクの番号」を分ける。みんなが触るファイル（設定ファイル・ゲームの中心のファイル・タスク一覧）は、自分の場所だけを書き換える決まりにする
- Q: ルーティン（5:17・5 時間ごと）は、どの係のタスクを進めるか？ → A: メインのタスクだけ。敵・キャラのタスクは、それぞれの係が進める（同じファイルを同時に書き換えないため）

## 係と受け持ち

### メイン（otWeb_main）：まとめ役

- まとめ役として、`develop` → `main` → `release` への取り込みをする（ほかの係は `main`・`release` に直接入れない）。
- 武器・強化アイテム・レア強化（椿の花）・ステージ・背景・画面（レベルアップ・タイトル・HUD・メニュー）・音・開発の仕組み（ルーティン・テスト・憲法・README）。
- ゲームの中心のファイル（`src/game.js`）は、メインが受け持つ。ほかの係が `src/game.js` に手を入れるときは、下の「みんなが触るファイル」の決まりを守る。

### 敵係（otWeb_lite_enemy）：眠気の側

- 敵（手下・ボス・レア敵・特別なウェーブ）の見た目・動き・強さ・出方。

### キャラ係（otWeb_lite_character）：珈琲豆の側

- キャラ（品種・特別なキャラ・スキン）の見た目・性能・特別な力・解放と値段・豆コイン・キャラ選択画面。

## 触ってよいファイル

| ファイル | メイン | 敵係 | キャラ係 |
| --- | --- | --- | --- |
| `src/entities/enemy.js`・`boss.js`・`yawn-wave.js`・敵の新しいファイル（`rare-enemy.js` など） | | ◎ | |
| `src/characters.js`・`src/character-select.js`・`src/entities/player.js`・`src/entities/variety-look.js`・`src/coin-ui.js`・`src/progress.js` | | | ◎ |
| `src/weapons/*`・`src/level-up-menu.js`・`src/background.js`・`src/floor.js`・`src/pixel-layer.js`・`src/item-icons.js`・`src/weapon-icons.js`・`src/sound.js`・`src/font.js`・`src/input.js`・`src/stage.js`・`index.html` | ◎ | | |
| `src/game.js` | ◎ | △ | △ |
| `src/config.js` | △ | △ | △ |
| `specs/backlog/tasks.md`・`specs/backlog/playtest.md`・`specs/ideas.md` | △ | △ | △ |
| `CLAUDE.md`・`.specify/`・`README.md` | ◎ | | |

◎：自由に書き換えてよい　△：「みんなが触るファイル」の決まりを守って書き換える　空欄：書き換えない（必要なときは、その係にお願いを書く）

## みんなが触るファイルの決まり

- **`src/config.js`**：自分の受け持ちのまとまりだけを書き換える。
  - 敵係：`enemies`・`enemyScaling`・`spawn`・`bigWave`・`boss`・`rareEnemy`・特別なウェーブ（`caterpillar` など）
  - キャラ係：`characters`・`coins`・`camellia.skin`・`player.eyes`
  - メイン：それ以外
  - 新しいまとまりを足すときは、自分の受け持ちのまとまりのすぐ後ろに足す（ファイルの最後には足さない。みんなが同じ場所に足すとぶつかるため）。
- **`src/game.js`**：敵係・キャラ係は、自分の受け持ちの処理（敵の出し方・キャラの特別な力のつなぎ込み）だけを、関数 1 つの中で足す。ほかの関数を書き換えるときは、メインにお願いする。長い処理は、自分のファイルに関数として作り、`game.js` からは呼ぶだけにする。
- **タスク一覧（`specs/backlog/tasks.md`）**：自分の係の印（【メイン】【敵】【キャラ】）が付いた行だけを書き換える。新しい行は、自分の係の番号で、自分の係の行のすぐ後ろに足す。
- **遊んでから決めるものの一覧（`specs/backlog/playtest.md`）・アイデア（`specs/ideas.md`）**：行を足すのは表の最後。ほかの係の行は書き換えない。

## 番号の分け方（同時に同じ番号を使わないため）

| もの | メイン | 敵係 | キャラ係 |
| --- | --- | --- | --- |
| 仕様書（`specs/NNN-…`） | 031〜059 | 060〜079 | 080〜099 |
| バックログの行 | B027〜B099 | BE01〜BE99 | BC01〜BC99 |
| 遊んでから決めるもの | P18〜P49 | PE01〜PE99 | PC01〜PC99 |

番号を使い切ったら、メインが次の番号の幅を決めてこの表に足す。今ある番号（仕様書 001〜030、B001〜B026、P01〜P17）は、そのまま使う。

## ブランチの決まり

- 敵係は `lite/enemy`、キャラ係は `lite/character` で作業する（`develop` から作る）。メインは `develop`（10/24 からは機能ごとのブランチ）。
- 作業を始める前と、プッシュする前に、`git pull --no-rebase origin develop` で `develop` の最新を取り込む。
- 区切りがついたら、自分のブランチから `develop` へ取り込む（10/23 までは直接マージしてよい。10/24 からは `develop` への PR）。
- `main`・`release` には直接入れない。`develop` → `main` → `release` はメインがまとめて行う。
- ぶつかったとき：自分の受け持ちのファイルは自分で直す。ほかの係の受け持ちのファイルでぶつかったら、`develop` の中身を残し、報告に書く。

## 係ごとのタスク（2026-10-22 時点）

- メイン：B002・B003・B004・B006・B008・B011・B012・B015、遊んでから決めるもの P04・P07・P11〜P14
- 敵係：B001（まくらウサギ）・B009・B016、P05・P06・P16・P17
- キャラ係：B007・B013・B014・B017〜B026、P01〜P03・P08〜P10・P15

## Requirements

- **FR-001**: 3 つの係は、上の「触ってよいファイル」と「番号の分け方」を守らなければならない。
- **FR-002**: タスク一覧の行には、担当の係の印（【メイン】【敵】【キャラ】）を付けなければならない。
- **FR-003**: ルーティン（毎朝 5:17 と 5 時間ごと）は、【メイン】のタスクだけを進めなければならない。
- **FR-004**: `main`・`release` への取り込みは、メインだけが行わなければならない。
