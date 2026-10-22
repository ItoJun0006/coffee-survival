# Implementation Plan: 倒すと攻撃の枠が 4 つになるレア敵

**Branch**: `013-rare-enemy` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-rare-enemy/spec.md`

## Summary

プレイを始めたときに 10% の確率で「レア敵が出る時刻（4:00〜7:00）」を決め、その時刻に 1 体だけ出す。レア敵はふつうの敵（`Enemy`）を土台にした別のクラスで、プレイヤーとの距離で「近づく・うろうろ・逃げる」を切り替える。90 秒たつかボスが出たら去る。倒すと、そのプレイの攻撃の枠を 3 → 4 にする。持てる数の上限を `CONFIG.slots.weapons` から「そのプレイの枠」に置き換える。見た目は 3 案から選ぶ。

## Technical Context

**Language/Version**: 素の JavaScript（ES Modules）、HTML、CSS
**Primary Dependencies**: なし（Canvas 2D のみ）
**Storage**: N/A（4 つ目の枠はそのプレイの間だけ。保存しない）
**Testing**: 自動テストの仕組みはない。ブラウザで確かめる（[quickstart.md](./quickstart.md)。確認用の `?rare` でレア敵をすぐに出す）
**Target Platform**: PC 版の最新の Chrome / Edge / Safari / Firefox（幅 1000px 以上）
**Project Type**: ブラウザゲーム（ビルド不要の静的ファイル）
**Performance Goals**: 敵 150 体＋レア敵 1 体で 60fps
**Constraints**: 数値は `CONFIG.rareEnemy` に集める。レア敵はふつうの敵の出る数・上限 150 体に数えない
**Scale/Scope**: 敵 1 種類、出現の予定 1 つ、攻撃の枠の上限の置き換え（3 か所）、見た目 3 案

## Constitution Check

| 原則 | 判定 | 内容 |
| --- | --- | --- |
| I. PC 専用 | ✅ | PC 前提 |
| II. ビルド不要・外部ライブラリなし | ✅ | Canvas 2D で描く |
| III. 調整する数値は設定に集める | ✅ | 確率・時間帯・去るまでの時間・体力・速さ・距離・経験値・文言は `CONFIG.rareEnemy` |
| IV. 世界観は「珈琲 × 眠気」 | ✅ | 名前と見た目は眠気にちなむ（3 案から選ぶ） |
| V. ブランチ | ✅ | 2026-10-23 までは develop に直接。過ぎたら `013-rare-enemy` ブランチを作り develop への PR |
| 開発の流れ | ✅ | 仕様を確定済み。実装は、012 を進めている別セッションが `src/game.js`・`src/config.js` の編集を終えてから始める（同じファイルを同時に触らない） |
| CLAUDE.md：見た目は 3 案 | ✅ | 実装の前に 3 案の画像を見せて選んでもらう |

**Post-design re-check**: ✅

## Project Structure

### Documentation (this feature)

```text
specs/013-rare-enemy/
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
├── config.js                 # CONFIG.rareEnemy（出現・動き・体力・報酬・見た目・文言）
├── game.js                   # 出現の予定、出す・去る・倒したときの処理、攻撃の枠、方向の印、?rare
├── sound.js                  # 出たとき・倒したときの効果音
└── entities/
    └── rare-enemy.js         # 新規：Enemy を土台にしたレア敵（距離で動きを切り替える）
```

**Structure Decision**: 今の構成のまま。レア敵だけ新しいファイルにし、ゲームの流れ（出す・去る・報酬）は `game.js` に置く。

## Complexity Tracking

憲法に反する点はないため、記載なし。
