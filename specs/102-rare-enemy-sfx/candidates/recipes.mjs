// まくらウサギの効果音の案（各 3 つ）。ゲームと同じ楽器（src/music/voices.js）で組み立てる
// どれも (v：楽器, t：鳴らし始める時刻, out：効果音の出口) を受け取る
import { freq } from '../../../src/music/voices.js';

const f = (names) => names.map(freq);
// 鈴の音は小さめなので、効果音の出口の手前で大きくする。今の効果音（クリア・レベルアップ）と同じくらいにそろえる
function louder(v, out, level) {
  const g = v.ctx.createGain();
  g.gain.value = level;
  g.connect(out);
  return g;
}

export const RECIPES = {
  appear: {
    // A：鈴がふわっと上がって、あくびのように下がる
    a(v, t, sfxOut) {
      const out = louder(v, sfxOut, 3);
      f(['E6', 'G#6', 'B6', 'E7']).forEach((x, i) => v.bell(x, t + i * 0.07, 0.3, 0.8, out));
      v.glide(880, 520, t + 0.4, 0.8, 0.7, out);
    },
    // B：口笛が「ふぁ〜」と上がってから下がる。最後に小さな鈴
    b(v, t, sfxOut) {
      const out = louder(v, sfxOut, 5);
      v.glide(600, 1000, t, 0.35, 0.8, out);
      v.glide(1000, 700, t + 0.3, 0.7, 0.7, out);
      v.shaker(t + 0.05, 0.6, out);
      v.bell(freq('C7'), t + 0.9, 0.3, 0.6, out);
    },
    // C：ぴょこぴょこ跳ねながら遠ざかる（だんだん小さくなる）
    c(v, t, sfxOut) {
      const out = louder(v, sfxOut, 5);
      for (let i = 0; i < 4; i++) {
        const at = t + i * 0.14;
        const vel = 1 - i * 0.2;
        v.glide(700, 1150, at, 0.1, vel, out);
        v.pluck(freq('G5'), at, 0.15, vel * 0.6, out);
      }
      v.bell(freq('E7'), t + 0.62, 0.3, 0.5, out);
    },
  },
  defeat: {
    // A：鈴のごほうびの和音。下でエレピの和音がふんわり鳴る
    a(v, t, sfxOut) {
      const out = louder(v, sfxOut, 1.5);
      f(['F5', 'A5', 'C6', 'F6']).forEach((x, i) => v.bell(x, t + i * 0.07, 0.3, 0.8, out));
      f(['F6', 'A6', 'C7']).forEach((x) => v.bell(x, t + 0.35, 1.2, 0.5, out));
      f(['F4', 'A4', 'C5', 'E5']).forEach((x) => v.ep(x, t + 0.3, 1.6, 0.6, out));
    },
    // B：鉄琴を一気にかけ上がって、キラキラが残る
    b(v, t, sfxOut) {
      const out = louder(v, sfxOut, 3);
      f(['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7']).forEach((x, i) => v.bell(x, t + i * 0.045, 0.25, 0.7, out));
      v.noise(t + 0.36, 0.6, 0.05, 'highpass', 7000, out);
      f(['C6', 'E6', 'G6']).forEach((x) => v.bell(x, t + 0.4, 1, 0.4, out));
    },
    // C：枠が 1 つずつ増えるように、4 つの鈴を数えるように鳴らし、最後に和音
    c(v, t, sfxOut) {
      const out = louder(v, sfxOut, 1.5);
      f(['G5', 'C6', 'E6', 'G6']).forEach((x, i) => v.bell(x, t + i * 0.2, 0.25, 0.8, out));
      f(['C5', 'E5', 'G5', 'B5']).forEach((x) => v.ep(x, t + 0.8, 1.6, 0.7, out));
      v.bell(freq('C7'), t + 0.8, 1.2, 0.6, out);
    },
  },
};
