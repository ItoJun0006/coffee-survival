# Implementation Plan: 珈琲豆の品種を増やしてキャラを 66 体にする

**Branch**: `characters-66` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-coffee-varieties/spec.md`

## Summary

品種を設定（`CONFIG.characters.varieties`）に 21 書き、品種 × 焙煎度の 63 体と特別なキャラ 3 体を、1 段目にアラビカと特別なキャラ、2 段目から品種の順で並べる。キャラの性能は焙煎度の性能に品種の倍率を掛けて作り、品種ごとの特別な力（8 種類）は、今ある仕組み（豆の回復・経験値の粒の吸い寄せ・無敵時間・カフェインの減り・経験値・範囲・攻撃の間隔・ダメージ）に倍率を 1 つ掛けて効かせる。見た目は豆の上の模様。
1 回のプレイが終わると豆コインがたまり（ポイントカードと同じ保存）、結果画面で内わけを数え上げる。キャラ選択画面の鍵の品種から、喫茶店のメニュー風のポップアップで品種を買う。

## Technical Context

**Language/Version**: 素の JavaScript（ES Modules）、HTML、CSS
**Primary Dependencies**: なし（Canvas 2D のみ）
**Storage**: ブラウザの `localStorage`。豆コインの量は、ポイントカードと同じ `coffee-survival.unlocks` に足す。買った品種は、その 3 体の id を今の `unlocked` に入れる
**Testing**: 自動テストの仕組みはない。ブラウザで確かめる（[quickstart.md](./quickstart.md)。確認用の `?unlockAll`・`?coins=N`）
**Target Platform**: PC 版の最新の Chrome / Edge / Safari / Firefox（幅 1000px 以上）
**Project Type**: ブラウザゲーム（ビルド不要の静的ファイル）
**Performance Goals**: 今と同じ（60fps）。キャラ選択画面で 66 体を描いても重くならない
**Constraints**: 品種・特別な力・豆コインの数値・色・文言は `CONFIG.characters` と `CONFIG.coins` に集める。品種を設定に 1 つ書き足すだけで 3 体が加わる（SC-004）
**Scale/Scope**: 品種 21、特別な力 8 種類、模様 20 種類、通貨 1 つ、ポップアップ 1 つ、結果画面の表示 1 つ

## Constitution Check

| 原則 | 判定 | 内容 |
| --- | --- | --- |
| I. PC 専用 | ✅ | キーボードとマウスだけ |
| II. ビルド不要・外部ライブラリなし | ✅ | Canvas 2D で描く |
| III. 調整する数値は設定に集める | ✅ | 品種の倍率・特別な力・模様・値段・豆コインのたまり方・数え上げの速さ・文言は `CONFIG` |
| IV. 世界観は「珈琲 × 眠気」 | ✅ | 品種は実在の珈琲豆、通貨は豆コイン、買う画面は喫茶店のメニュー |
| V. ブランチ | ✅ | `characters-66` ブランチで進め、develop への PR にする |
| 開発の流れ | ✅ | 仕様を確定してから実装する |
| CLAUDE.md：見た目は 3 案 | ✅ | 品種の模様・買うポップアップ・結果画面の豆コインは、3 案から選んだ（spec の Clarifications） |

**Post-design re-check**: ✅

## Project Structure

### Documentation (this feature)

```text
specs/016-coffee-varieties/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── config.js                 # CONFIG.characters（品種・特別な力・性能のバー）、CONFIG.coins（豆コイン）
├── characters.js             # 66 体を作る・並べる、性能の説明、特別な力
├── character-select.js       # 鍵の品種のマスの値段、メニュー風のポップアップで買う
├── progress.js               # 豆コインの量の保存、品種を買う、?unlockAll・?coins=N
├── coin-ui.js                # 新規：豆コインの絵、メニュー風のポップアップ、結果画面の数え上げ
├── game.js                   # 特別な力を効かせる、豆コインを足す、結果画面の数え上げ、タイトルの表示
└── entities/
    ├── player.js             # 模様を描く、無敵時間・カフェインの減りの倍率
    ├── variety-look.js       # 新規：品種の模様 20 種類
    └── xp-orb.js             # 吸い寄せる距離の倍率
```

**Structure Decision**: 今の構成のまま。品種の模様と豆コインの絵だけ新しいファイルにし、ゲームの流れは `game.js`、キャラの組み立ては `characters.js` に置く。

## Complexity Tracking

憲法に反する点はないため、記載なし。
