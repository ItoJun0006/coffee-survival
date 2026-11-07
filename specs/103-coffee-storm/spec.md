# Feature Specification: ジャケットに合わせた表題曲「コーヒー・ストーム」

**Feature Branch**: `lite_sound_storm`（音楽係。仕様書の番号は 103）

**Created**: 2026-10-29

**Status**: Draft（ユーザーに聞いてもらっている。レコード棚の背表紙・ジャケットの絵はメインが足す）

**Input**: メイン（otWeb_main）からの依頼。サウンドトラックのジャケット（色あざやか版、`assets/images/art/soundtrack-cover-color.jpg`）に合わせた、豆コインで買える BGM を 1 曲

## Clarifications

### Session 2026-10-29

- Q: 曲の id と名前は？ → A: id は `coffeeStorm`（メインが `CONFIG.recordShelf` でこの id を使う）。名前は「コーヒー・ストーム」（ジャケットの曲名の一覧の「COFFEE STORM」から）
- Q: どんな曲か？ → A: 今の 4 曲より速く、明るく力強い曲。ジャケットの、あざやかな空・はじけ飛ぶ珈琲豆・宙に浮かぶコーヒーミルの、にぎやかで勢いのある表題曲の雰囲気
- Q: 値段は？ → A: ほかの曲と同じ（`CONFIG.recordShelf.price`）。メインが扱う

### まだ決めること

- [NEEDS CLARIFICATION] 曲をこのまま使うか、直すところがあるか（`candidates/coffee-storm.mp3` を聞いてもらう）

## 曲の作り

| 項目 | 中身 |
|---|---|
| テンポ | 128（いちばん速いボサノバの 100 より速い）。ひと回り 16 小節・約 30 秒 |
| 調 | ニ長調（明るい）。D → A → Bm → G の、力強く前へ進む和音の流れ |
| リズムの型 | `storm`（新しく足した）：4 つ打ちの太鼓、8 分音符で休まず刻むベース、金管風のきざみ。8 小節ごとに頭でシンバル、終わりの小節でスネアを連打してつなぐ |
| メロディー | シンセの太めの音（`lead`）。高く上がっていく、表題曲らしい旋律 |
| 新しい楽器 | `brass`（金管風の和音）・`lead`（シンセのメロディー）・`drive`（刻むベース）・`crash`（シンバル）。`src/music/voices.js` |

## Requirements *(mandatory)*

- **FR-001**: `CONFIG.audio.music.coffeeStorm` に曲を足し、`CONFIG.audio.tracks` の最後に `'coffeeStorm'` を足す。名前は `name`、棚に出る 1 行の説明は `mood`
- **FR-002**: 今の 4 曲より速く、明るく力強い
- **FR-003**: ほかの曲と同じく、小節・ひと回りのつなぎ目で無音にならない（仕様 100 FR-001）。ボスへの切り替えは重ねながら移る（仕様 101 FR-003）
- **FR-004**: `src/config.js` は `audio` のまとまりだけを書き換える。レコード棚（`recordShelf`）の背表紙の色とジャケットの絵はメインが足す

## Success Criteria *(mandatory)*

- **SC-001**: 0.25 秒ごとに測ったとき、曲の間（ボスへ移る前）に普段の 1/4 より小さくなる瞬間がない（2026-10-29 に確認：0 回。いちばん小さいところでも普段の 0.57 倍）
- **SC-002**: `npm --prefix tests test` がすべて通る。実際のゲームで `sound.setTrack('coffeeStorm')` → ボス → やり直し でコンソールにエラーが出ない

## 聞いてもらうファイル（candidates/）

`coffee-storm.mp3`（42 秒）：0 秒から曲の頭、30 秒でひと回りして頭に戻る、34 秒からボスの曲へ重ねながら移る。
