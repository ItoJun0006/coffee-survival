# Implementation Plan: 8 種類の武器に Lv ごとの強化と MAX の見た目を付ける

**Branch**: `012-weapon-upgrades` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-weapon-upgrades/spec.md`

## Summary

豆マシンガン（007）と同じ形で、8 種類の武器に Lv 2・4・6 の特別な強化と Lv 8（MAX）の大きな変化を入れ、MAX の見た目を付ける。共通の強化（ダメージ +25%・間隔 −8%）は 8 種類では毎 Lv のまま。強化の値はすべて `CONFIG.weapons.<id>.upgrades` に置き、「`*Rate` はかけ算、それ以外は上書き」で重ねる仕組みを `Weapon`（base.js）に移して全武器で共有する。武器ごとに、今の不具合（FR-014）を先に直し → 強化 → MAX の見た目（3 案から選ぶ）の順に、1 種類ずつ独立して進める。

## Technical Context

**Language/Version**: 素の JavaScript（ES Modules）、HTML、CSS
**Primary Dependencies**: なし（ブラウザの Canvas 2D のみ。外部ライブラリなし）
**Storage**: N/A（強化はプレイ中だけ。保存しない）
**Testing**: 自動テストの仕組みはない。ブラウザで動かして確認する（[quickstart.md](./quickstart.md)。確認用の URL パラメータで、指定した武器・Lv から始める）
**Target Platform**: PC 版の最新の Chrome / Edge / Safari / Firefox（幅 1000px 以上）
**Project Type**: ブラウザゲーム（ビルド不要の静的ファイル）
**Performance Goals**: 敵 150 体・MAX の武器 3 つで 60fps（1 フレーム 16.7ms 以内）
**Constraints**: 調整する数値は `src/config.js` の `CONFIG` に集める。当たる範囲と、はっきり描く部分の大きさを一致させる。絵はプログラムで描き、ドット絵の層（008）を通す
**Scale/Scope**: 武器 8 種類 × 強化 4 段（Lv 2・4・6・8）＋ MAX の見た目 8 種類（各 3 案）＋不具合の修正 3 件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 内容 |
| --- | --- | --- |
| I. PC 専用 | ✅ | 操作・画面サイズは PC 前提。スマホ向けの対応は入れない |
| II. ビルド不要・外部ライブラリなし | ✅ | Canvas 2D と ES Modules だけで描く。画像ファイルも使わない |
| III. 調整する数値は設定に集める | ✅ | 強化の値・MAX の見た目の色や大きさは `CONFIG.weapons.<id>` に置く（[contracts/weapon-upgrades.md](./contracts/weapon-upgrades.md)）。今コードに直接書かれている値（ドリップの落下高さ 220・着弾 0.3 秒、スチームの 0.35 秒など）も、触る武器から設定へ移す |
| IV. 世界観は「珈琲 × 眠気」 | ✅ | MAX の見た目は珈琲の道具・液体・湯気・氷で描く。文言は日本語 |
| V. develop で開発、1 機能 = 1 ブランチ = 1 PR | ✅（例外期間） | 2026-10-23 までは develop に直接コミットする。それ以降に作業が続く場合は `develop` から `012-weapon-upgrades` を作り、develop への PR にする。コミットは「武器ごと × 段階ごと」に分ける |
| 開発の流れ | ✅ | 仕様（spec.md）を先に確定済み。実装後はブラウザで、変えた武器・移動・ポーズ・リトライ・コンソールのエラーを確認する |
| CLAUDE.md：見た目は 3 案から選ぶ | ✅ | MAX の見た目は武器ごとに 3 案を画像で見せ、選んでもらってから実装する（タスクとして独立させる） |

**Post-design re-check**: Phase 1 の設計（共通の仕組みを base.js へ、確認用の URL パラメータ、3 案の比較画像）は、どの原則にも反しない。✅

## Project Structure

### Documentation (this feature)

```text
specs/012-weapon-upgrades/
├── plan.md              # この計画
├── research.md          # Phase 0：設計の判断
├── data-model.md        # Phase 1：強化・MAX の見た目のデータ
├── quickstart.md        # Phase 1：確認の手順
├── contracts/
│   └── weapon-upgrades.md   # CONFIG.weapons.<id> の書き方（武器と設定の約束）
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks で作る
```

### Source Code (repository root)

```text
src/
├── config.js            # CONFIG.weapons.<id>.upgrades / commonDesc / maxVisual、確認用の設定
├── game.js              # targets() の使い回し、slow()・freeze() の引数、確認用の URL パラメータ
├── entities/
│   └── enemy.js         # 足どめ（slow）、凍りの待ち時間と thaw()
└── weapons/
    ├── base.js          # stats / upgradeDesc / intervalRate / hit(element) を全武器で共有
    ├── bean-gun.js      # 共通の仕組みに合わせる（挙動は変えない）
    ├── mill.js  mug.js  shockwave.js
    ├── drip.js  steam.js  puddle.js  espresso.js
    └── ice.js           # フレンチプレス・ラテアートは攻撃の一覧から外す（FR-017）
```

**Structure Decision**: 今の構成のまま。武器ごとのファイルに強化と MAX の描き方を足し、全武器で共通の処理だけを `src/weapons/base.js` に置く。新しいファイルは作らない。

## Complexity Tracking

憲法に反する点はないため、記載なし。
