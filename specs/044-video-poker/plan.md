# Implementation Plan: タイトルから遊べるビデオポーカー

**Branch**: `044-video-poker` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

## Summary

ブラックジャック（仕様 043）の画面の部品を `src/card-table.js` の `CardTable` にまとめ、ブラックジャックとビデオポーカーの両方がそれを受け継ぐ。ポーカーの決まり（山札・役の判定・豆コイン・残す札のおすすめ）は `src/poker.js` に、画面は `src/video-poker.js` に分ける。

## Technical Context

- **Language**: 素の JavaScript（ES モジュール）、HTML5 Canvas。ビルドなし・外部ライブラリなし（憲法 II）
- **Storage**: 豆コインは本編と同じ `src/progress.js`。遊び方を見たかは、ゲームごとにブラウザに保存する
- **Testing**: ブラウザで遊んで確かめる。役の判定は、ブラウザのコンソールから関数を呼んで確かめる

## Constitution Check

- I. PC 専用：キーボード（1〜5・Enter・←→・H・Esc）とマウス ✅
- II. ビルド不要 ✅
- III. 数値は設定に：`CONFIG.poker` に、回数・賭けの段階・役の名前と倍率・文言を集める。色とカードの絵は `CONFIG.cardGame` を共通で使う ✅
- IV. 珈琲 × 眠気：親は眠気のボス「ねぼけフクロウの店主」、数字の札は珈琲豆のキャラ、絵札は眠気の手下 ✅
- V. 1 機能 = 1 ブランチ：`044-video-poker` ✅

## Project Structure

```text
src/
├── card-table.js              # 新規：カードの卓に共通の部品（並べ方・ドット絵の層・床・親とふきだし・ボタン・カードとマーク・遊び方のページ・まとめ）
├── card-game.js               # ブラックジャック。CardTable を受け継ぐ形に直す（遊び方・見た目は変えない）
├── poker.js                   # 新規：山札・役の判定・豆コイン・残す札のおすすめ
├── video-poker.js             # 新規：ポーカーの画面
├── entities/dealer-parts.js   # 新規：親の絵の共通の部品（縁取り・眠そうな目・手のカード）
├── entities/sheep-dealer.js   # dealer-parts.js を使う形に直す（見た目は変えない）
├── entities/owl-dealer.js     # 新規：ねぼけフクロウの店主
├── config.js                  # poker のまとまり、cardGame.colors に赤（♥ ♦）と役の表の光を足す
└── game.js                    # タイトルのポーカーのボタンと P キー、画面の切り替え
```

## 設計の決めごと

- **豆コイン**：交換して役が決まったときだけ「倍率 × 賭け − 賭け」を動かす。交換の前にやめたら動かない。
- **役の判定**：同じ数字の数とマークと連続をみる。1 は 14 として数え、1・2・3・4・5 だけは特別にストレートにする。ワンペアは J・Q・K・1 のときだけ役にする。
- **残す札のおすすめ**：役ができていればその札、同じマークが 4 枚ならその 4 枚、小さいペア、J 以上の札、どれもなければ全部かえる、の順に話す。
- **Enter と Space**：入力ではどちらも「決める」になるので、「全部残す」のボタンは作らず、全部残して交換すれば、そのまま役が決まるようにした。
