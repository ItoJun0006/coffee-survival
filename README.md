# コーヒーサバイバル

珈琲をテーマにしたサバイバルゲーム。PC のブラウザで遊ぶ HTML5 Canvas ゲーム。

## 構成

ビルド不要。素の JavaScript (ES Modules) と Canvas 2D で動作する。

```
index.html             エントリポイント
css/style.css          全画面表示のスタイル
src/main.js            起動処理
src/game.js            ゲームループ・描画・状態管理
src/input.js           キーボード / マウスクリック入力
src/config.js          ゲームバランス・色などの定数
src/entities/          プレイヤー・アイテム等のエンティティ
assets/                画像・アイコン等
```

## 起動

ES Modules を使うため、ファイルを直接開くのではなくローカルサーバ経由で開く。

```bash
python3 -m http.server 8000
```

http://localhost:8000 を開く。

## 操作

| 操作 | キー |
| --- | --- |
| スタート | Space / Enter / クリック |
| キャラ選択 | ←→（A / D）で選んで Space / Enter、またはクリック。Esc でタイトルへ |
| 移動 | WASD / 矢印キー |
| ポーズ | Esc / P |
| 音の消音 / 解除 | M |
| 音楽の音量 | − で下げる / ＋ で上げる（ポーズメニューの「音楽の音量」でも変えられる） |
| ポーズメニューの選択 | ↑↓（W / S）で選んで Space / Enter、またはクリック |
| リトライ | Space / Enter / クリック |

## ルール

時間とともにカフェインが減っていく。マップ上の珈琲豆を拾って補給し、できるだけ長く生き延びる。
