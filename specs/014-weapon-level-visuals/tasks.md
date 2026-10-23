---
description: "Task list for 014-weapon-level-visuals"
---

# Tasks: Lv 2・4・6 で武器の見た目が段階的に豪華になる

**Input**: Design documents from `/specs/014-weapon-level-visuals/`
**Prerequisites**: plan.md, spec.md

**Tests**: 自動テストの仕組みはない。確認はブラウザで行う（`?weapons=<id>:<Lv>`。3 案の見比べには `&levelVariant=A|B|C` を使った）。

**共通の約束**:
- 色・濃さ・大きさ・数は `src/config.js` の `CONFIG.weaponLevelVisual` に置く（憲法 III）。
- 仕様と実装は別のコミットにする。2026-10-23 を過ぎたら `014-weapon-level-visuals` ブランチで進める（憲法 V）。

## Phase 1: 共通の仕組みと 3 案

- [x] T001 [US1] src/weapons/base.js に `visualTier`・`levelSpots()`・`levelFxBelow`・`drawLevelFx(ctx, below)` を足し、src/game.js の描画から呼ぶ。確認用の URL パラメータ `?levelVariant=A|B|C` を src/game.js に足す
- [x] T002 [US1] 3 案（A 光が強まる・B 光る縁・C 粒が増える）の描き方を `drawLevelFx` に作り、設定を `CONFIG.weaponLevelVisual` に置く
- [x] T003 [P] [US1] 9 つの武器（src/weapons/bean-gun.js・mill.js・mug.js・shockwave.js・drip.js・steam.js・puddle.js・espresso.js・ice.js）に `levelSpots()` を足す
- [x] T004 [US1] 武器ごとに、同じ場面の Lv 1・2・4・6・8 を 3 案ぶん並べた比較画像を作ってユーザーに見せ、1 案を選んでもらう（ユーザーの返事を待つ）。→ B「光る縁」

## Phase 2: 選んだ案を残す

- [x] T005 [US1] 選ばなかった案の描き方と設定、`weaponLevelVisual.variant` を消す（`?levelVariant` は、ほかに使うものがなければ消す）
- [x] T006 [US1] 武器ごとに Lv 1・2・4・6・8 を見比べ、Acceptance Scenarios と Edge Cases（当たる範囲、見間違え、60fps）を確かめる。移動・ポーズ・リトライ・コンソールのエラーも確かめる
- [x] T007 spec.md の Clarifications に選んだ案を書き、Status を Implemented にする。specs/002-weapon-visuals/spec.md の FR-003 との食い違いがあればユーザーに報告する
- [x] T008 [US1] 豆マシンガン・豆ショットガンの弾の縁が、段階 3 で経験値の粒と見分けにくい件を直す：3 案を拡大して見比べ、C（縁の色を赤銅色にする）を残す。`CONFIG.weapons.beanGun`・`beanShotgun` の `levelColors` と、src/weapons/base.js の `drawLevelFx`
