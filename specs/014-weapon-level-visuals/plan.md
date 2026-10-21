# Implementation Plan: Lv 2・4・6 で武器の見た目が段階的に豪華になる

**Branch**: `014-weapon-level-visuals` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-weapon-level-visuals/spec.md`

## Summary

武器の基底クラス（`src/weapons/base.js` の `Weapon`）に、Lv から見た目の段階（0〜3）を決める仕組みと、段階の見た目を描く共通の処理を足す。武器ごとには「段階の見た目の目印」（はっきりした部分の位置と半径の一覧）だけを返し、描き方（光・縁・粒）は共通にする。色・濃さ・大きさ・数は `CONFIG.weaponLevelVisual` に置く。3 案は確認用の URL パラメータ `?levelVariant=A|B|C` で切り替えて見比べ、選んだ案だけを残す。

## Technical Context

**Language/Version**: 素の JavaScript（ES Modules）、HTML、CSS
**Primary Dependencies**: なし（Canvas 2D のみ）
**Testing**: 自動テストの仕組みはない。`?weapons=<id>:<Lv>` と `?levelVariant=` で、指定した武器・Lv・案をブラウザで確かめる
**Target Platform**: PC 版の最新の Chrome / Edge / Safari / Firefox
**Performance Goals**: 敵 150 体・段階 3 の武器 3 つで 60fps
**Constraints**: はっきり描く部分は当たる範囲の中に収める。光は作り置きの絵を貼る。ドット絵の層（008）を通す
**Scale/Scope**: 武器 9 つ（豆ショットガンは豆マシンガンと同じ描き方）× 段階 3 つ × 3 案

## Constitution Check

| 原則 | 判定 | 内容 |
| --- | --- | --- |
| I. PC 専用 | ✅ | 変更なし |
| II. ビルド不要・外部ライブラリなし | ✅ | Canvas 2D と ES Modules だけで描く |
| III. 調整する数値は設定に集める | ✅ | `CONFIG.weaponLevelVisual` に置く |
| IV. 世界観は「珈琲 × 眠気」 | ✅ | 湯気・焙煎色・氷の光で描く |
| V. develop で開発 | ✅（例外期間） | 2026-10-23 までは develop に直接コミットする |
| 見た目は 3 案から選ぶ | ✅ | 3 案を比較画像で見せ、選んでもらってから残す |

## 設計

- `Weapon.visualTier`：`isMax` なら 0（MAX の見た目に任せる）、それ以外は `weaponLevelVisual.tiers`（[2, 4, 6]）のうち Lv 以下の数。
- `Weapon.levelSpots()`：武器ごとに上書きする。`{ x, y, r, k }` の一覧（`r` ははっきりした部分の半径、`k` は消えかけの濃さ 0〜1）。
- `Weapon.levelFxBelow`：true の武器（こぼれ珈琲）は、段階の見た目を敵より下に描く。
- `Weapon.drawLevelFx(ctx, below)`：`src/game.js` の描画で、`drawBelow` と `draw` のあとにそれぞれ呼ぶ。段階 0 なら何もしない。
- 色は属性（`config.element`）ごとに 3 段階の色を持つ。

## Project Structure

```text
src/
├── config.js            # CONFIG.weaponLevelVisual
├── game.js              # ?levelVariant=、drawLevelFx の呼び出し
└── weapons/
    ├── base.js          # visualTier・levelSpots・drawLevelFx
    ├── max-fx.js        # 光・湯気の共通の描き方（012）
    └── bean-gun.js  mill.js  mug.js  shockwave.js  drip.js
        steam.js  puddle.js  espresso.js  ice.js   # levelSpots を足す
```
