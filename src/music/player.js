import { freq } from './voices.js';

// BGM の楽譜を読んで、少し先の音を予約していく係（シーケンサー）
//
// 曲のデータ（和音・ベース・メロディー・テンポ）は CONFIG.audio.music にあり、
// ここでは「どの拍に何を鳴らすか」というリズムの型（style）だけを持つ。
// 1 小節 = 8 ステップ（8 分音符）。
//
// 曲を切り替えるときは、今の曲を止めずに次の小節の頭から新しい曲を重ね、
// 今の曲を少しずつ小さく・新しい曲を少しずつ大きくする（クロスフェード）。
// ラジオのつまみを一気に回すのではなく、片方を下げながらもう片方を上げるイメージ。
// 重なっている間は 2 曲ぶんの「層（layer）」を同時に予約する。

// メロディーの書き方：1 小節を 8 つ（6/8 拍子の曲は 6 つ）の記号で書く。音名はそこで鳴らし始め、'-' はのばす、'.' は休み
function parseBar(text) {
  const tokens = text.trim().split(/\s+/);
  const notes = [];
  tokens.forEach((t, i) => {
    if (t === '-' && notes.length) notes[notes.length - 1].len++;
    else if (t !== '-' && t !== '.') notes.push({ step: i, len: 1, f: freq(t) });
  });
  return notes;
}

// 1 小節のステップの数。ふつうは 8（4 拍子）。子守歌のような 6/8 拍子は 6
const barSteps = (song) => song.barSteps ?? 8;

// 楽譜を、鳴らすときに使いやすい形にしておく（曲ごとに 1 回だけ）
const prepared = new WeakMap();
function prepare(song) {
  if (!prepared.has(song)) {
    prepared.set(song, {
      chords: song.chords.map((c) => c.map(freq)),
      bass: song.bass.map(freq),
      melody: song.melody?.map(parseBar),
    });
  }
  return prepared.get(song);
}

// リズムの型。p は鳴らすための道具一式、i は小節の中のステップ（0〜7）
const STYLES = {
  // いつもの曲とボスの曲：もたついたローファイ・ヒップホップのノリ
  lofi(p, i, at, s) {
    const { v, chord, root, out, song } = p;
    if (i === 0) {
      chord.forEach((f) => v.ep(f, at, s * 7.5, 0.8, out));
      v.bass(root, at, s * 2.5, out);
      if (song.pad) v.pad(chord, at, s * 8, out);
    }
    if (i === 3) {
      chord.slice(-3).forEach((f) => v.ep(f, at, s * 2, 0.4, out));
      v.bass(root, at, s, out);
    }
    if (i === 6) v.bass(root * 2, at, s, out);
    if (i === 0 || i === 5 || (song.pad && i === 3)) v.kick(at, i === 0 ? 1 : 0.65, out);
    if (i === 2 || i === 6) v.snare(at, 0.8, out);
    v.hat(at, i % 2 ? 0.5 : 1, out);
  },

  // 朝の曲：和音を小節の終わりまでのばし、軽く跳ねるリズムを足す
  morning(p, i, at, s) {
    const { v, chord, root, out } = p;
    if (i === 0) {
      chord.forEach((f) => v.ep(f, at, s * 8 + 0.2, 0.65, out));
      v.wash(chord, at, s * 8 + 0.3, out);
      v.bass(root, at, s * 3, out);
    }
    if (i === 3 || i === 6) chord.slice(-3).forEach((f) => v.ep(f, at, s * 1.5, i === 3 ? 0.35 : 0.25, out));
    if (i === 4) v.bass(root * 1.5, at, s * 2, out);
    if (i === 6) v.bass(root * 2, at, s, out, 0.22);
    if (i === 7) v.bass(root * 1.5, at, s, out, 0.18);
    if (i === 0 || i === 5) v.kick(at, i === 0 ? 0.9 : 0.6, out);
    if (i === 3) v.kick(at, 0.4, out);
    if (i === 2 || i === 6) v.snare(at, 0.55, out);
    v.hat(at, i % 2 ? 0.4 : 0.8, out);
    if (i % 2) v.shaker(at, 0.6, out);
  },

  // 夜の曲：ピアノの和音をのばし、分散和音（1 音ずつ）でつなぐ。太鼓はブラシで静かに
  night(p, i, at, s) {
    const { v, chord, root, out } = p;
    if (i === 0) {
      chord.forEach((f) => v.piano(f, at, s * 8 + 0.3, 0.75, out));
      v.wash(chord, at, s * 8 + 0.3, out, 0.008);
      v.upright(root, at, s * 4, out);
    }
    if (i === 4) v.upright(root * 1.5, at, s * 4, out, 0.26);
    if (i === 2 || i === 5 || i === 7) {
      const f = chord[{ 2: 1, 5: 2, 7: 3 }[i] % chord.length];
      v.piano(f * 2, at, s * 2, 0.28, out);
    }
    if (i === 0) v.kick(at, 0.55, out);
    if (i === 5) v.kick(at, 0.35, out);
    if (i === 4) v.brush(at, 0.8, out);
    if (i === 2 || i === 6) v.brush(at, 0.35, out);
    if (i % 2) v.hat(at, 0.25, out);
  },

  // ボサノバ：2 小節でひと組のギターのきざみと、ふち打ちのリズム
  bossa(p, i, at, s, bar) {
    const { v, chord, root, out } = p;
    const odd = bar % 2 === 1;
    if (i === 0) {
      chord.forEach((f) => v.ep(f, at, s * 8 + 0.2, 0.3, out));
      v.wash(chord, at, s * 8 + 0.3, out, 0.015);
    }
    if ((odd ? [2, 4, 7] : [0, 3, 5]).includes(i)) chord.forEach((f) => v.pluck(f, at, s * 1.6, 0.7, out));
    if (odd && i === 6) chord.slice(-2).forEach((f) => v.pluck(f, at, s, 0.35, out));
    if (i === 0) v.upright(root, at, s * 3, out);
    if (i === 3) v.upright(root * 1.5, at, s, out, 0.26);
    if (i === 4) v.upright(root * 1.5, at, s * 3, out);
    if (i === 7) v.upright(root, at, s, out, 0.26);
    if ([0, 3, 4, 7].includes(i)) v.kick(at, 0.45, out);
    if ((odd ? [2, 4] : [0, 3, 6]).includes(i)) v.rim(at, 0.8, out);
    v.shaker(at, i % 2 ? 0.9 : 0.5, out);
  },

  // 子守歌：6/8 拍子（1 小節 6 ステップ）で、ゆりかごのように和音を 1 音ずつ上り下りする。太鼓はなし
  lullaby(p, i, at, s) {
    const { v, chord, root, out } = p;
    if (i === 0) {
      v.bass(root, at, s * 6 + 0.2, out, 0.22);
      v.wash(chord, at, s * 6 + 0.3, out, 0.012);
    }
    const order = [0, 1, 2, 1, 0, 1];
    v.ep(chord[order[i]] * 2, at, s * 2.2, i === 0 ? 0.55 : 0.38, out);
    if (i === 3) v.shaker(at, 0.25, out);
  },

  // 嵐のような表題曲：4 つ打ちの太鼓と、休まず刻むベース、金管風のきざみ。
  // 8 小節ごとに頭でシンバル、終わりの小節でスネアを連打してつなぐ（フィル）
  storm(p, i, at, s, bar) {
    const { v, chord, root, out } = p;
    const fill = bar % 8 === 7;
    if (i === 0) {
      chord.forEach((f) => v.brass(f, at, s * 1.5, 1, out));
      v.wash(chord, at, s * 8 + 0.3, out, 0.015);
      if (bar % 8 === 0) v.crash(at, 1, out);
    }
    if (i === 3) chord.forEach((f) => v.brass(f, at, s, 0.7, out));
    if (i === 6 && !fill) chord.forEach((f) => v.brass(f, at, s * 2, 0.8, out));
    v.drive(i % 2 ? root * 2 : root, at, s * 0.9, out);
    if (i % 2 === 0) v.kick(at, i === 0 ? 1 : 0.8, out);
    if (i === 2 || i === 6) v.snare(at, 1, out);
    if (fill && i >= 4) v.snare(at, 0.5 + (i - 4) * 0.15, out);
    v.hat(at, i % 2 ? 1 : 0.6, out);
  },
};

export class MusicPlayer {
  // voices：楽器（voices.js）。out：BGM 全体の出口。swing：裏拍を遅らせる割合（曲で指定がないとき）
  constructor(voices, out, swing) {
    this.v = voices;
    this.out = out;
    this.swing = swing;
    this.layers = [];
  }

  get current() {
    return this.layers[this.layers.length - 1]?.song ?? null;
  }

  // time から song を鳴らし始める（前の層はすぐ消す）。startBar で途中の小節から始められる（曲の案の書き出し用）
  start(song, time, startBar = 0) {
    this.stop(time);
    const layer = this.#layer(song, time, 1);
    layer.step = startBar * barSteps(song);
    this.layers.push(layer);
  }

  // 次の小節の頭から song に切り替える。fadeSec 秒かけて重ねながら移る
  switchTo(song, time, fadeSec) {
    const cur = this.layers[this.layers.length - 1];
    if (!cur) return this.start(song, time);
    if (cur.song === song) return;
    const at = Math.max(time, this.#nextBarStart(cur));
    for (const l of this.layers) {
      if (l.endAt !== null && l.endAt <= at + fadeSec) continue;
      const g = l.bus.gain;
      g.setValueAtTime(1, at);
      g.linearRampToValueAtTime(0, at + fadeSec);
      l.endAt = at + fadeSec;
      l.ambient?.stop(at + fadeSec + 0.05);
    }
    const next = this.#layer(song, at, 0);
    next.bus.gain.setValueAtTime(0, at);
    next.bus.gain.linearRampToValueAtTime(1, at + fadeSec);
    this.layers.push(next);
  }

  // すべての層を time で止める
  stop(time) {
    for (const l of this.layers) {
      l.ambient?.stop(time);
      l.bus.gain.setValueAtTime(0, time);
    }
    this.layers = [];
  }

  // until 秒までに鳴る音を予約する
  scheduleUntil(until) {
    for (const l of this.layers) {
      while (l.nextTime < until && (l.endAt === null || l.nextTime < l.endAt)) {
        const s = 60 / l.song.bpm / 2;
        this.#playStep(l, l.step % barSteps(l.song), l.nextTime, s);
        l.nextTime += s;
        l.step++;
      }
    }
    this.layers = this.layers.filter((l) => l.endAt === null || l.nextTime < l.endAt);
  }

  #layer(song, time, gain) {
    const bus = this.v.ctx.createGain();
    bus.gain.value = gain;
    bus.connect(this.out);
    const ambient = song.ambient ? this.v.startLoop(song.ambient.kind, song.ambient.level, time, bus) : null;
    return { song, bus, ambient, step: 0, nextTime: time, endAt: null };
  }

  #nextBarStart(l) {
    const s = 60 / l.song.bpm / 2;
    const n = barSteps(l.song);
    const left = (n - (l.step % n)) % n;
    return l.nextTime + left * s;
  }

  #playStep(l, i, time, s) {
    const song = l.song;
    const data = prepare(song);
    const bar = Math.floor(l.step / barSteps(song));
    const n = bar % data.chords.length;
    const swing = song.swing ?? this.swing;
    const at = time + (i % 2 ? swing * s : 0);
    const p = { v: this.v, out: l.bus, song, chord: data.chords[n], root: data.bass[n] };
    STYLES[song.style ?? 'lofi'](p, i, at, s, bar);

    const mel = data.melody?.[bar % data.melody.length];
    for (const note of mel ?? []) {
      if (note.step !== i) continue;
      this.v[song.lead](note.f, at, note.len * s, song.leadVel ?? 1, l.bus);
    }
  }
}
