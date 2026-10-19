# Junistry

珈琲をテーマにしたサバイバルゲーム。スマホ・PC のブラウザで遊べる HTML5 Canvas ゲーム。

## 構成

ビルド不要。素の JavaScript (ES Modules) と Canvas 2D で動作する。

```
index.html             エントリポイント
manifest.webmanifest   ホーム画面追加用の Web App Manifest
css/style.css          全画面・タッチ向けスタイル
src/main.js            起動処理
src/game.js            ゲームループ・描画・状態管理
src/input.js           キーボード / タッチ（仮想スティック）入力
src/config.js          ゲームバランス・色などの定数
src/entities/          プレイヤー・アイテム等のエンティティ
assets/                画像・アイコン等
```

## 起動

ES Modules を使うため、ファイルを直接開くのではなくローカルサーバ経由で開く。

```bash
python3 -m http.server 8000
```

PC では http://localhost:8000 を開く。

### スマホで遊ぶ

PC とスマホを同じ Wi-Fi に接続し、PC の IP アドレスを確認する。

```bash
ipconfig getifaddr en0
```

スマホのブラウザで `http://<PCのIPアドレス>:8000` を開く。共有メニューから「ホーム画面に追加」すると全画面で起動できる。

## 操作

| 操作 | PC | スマホ |
| --- | --- | --- |
| 移動 | WASD / 矢印キー | 画面をドラッグ（仮想スティック） |
| リトライ | Space / Enter | タップ |

## ルール

時間とともにカフェインが減っていく。マップ上の珈琲豆を拾って補給し、できるだけ長く生き延びる。
