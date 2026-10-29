import { CONFIG } from './config.js';
import { Voices, freq } from './music/voices.js';
import { MusicPlayer } from './music/player.js';

const cfg = CONFIG.audio;
const MUTE_KEY = 'coffee-survival.muted';
const MUSIC_VOLUME_KEY = 'coffee-survival.musicVolume';
// 同じ効果音を続けて鳴らすときの最短の間隔（秒）。敵が一度にたくさん倒れても音が重なりすぎないようにする
const SFX_COOLDOWN = { hit: 0.05, defeat: 0.06, bean: 0.04, damage: 0.1 };
// BGM の音を何秒先まで予約しておくか。処理が一瞬詰まっても音が飛ばないよう、少し余裕を持たせる
const LOOKAHEAD = 0.3;

function loadMusicVolume() {
  try {
    const v = Number(localStorage.getItem(MUSIC_VOLUME_KEY));
    if (localStorage.getItem(MUSIC_VOLUME_KEY) !== null && v >= 0 && v <= 100) return v;
  } catch {
    // 保存領域が使えないときは初期値
  }
  return cfg.musicVolume.default;
}

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

// BGM と効果音。ブラウザは人が操作するまで音を出せないので、最初のキー操作かクリックで鳴らし始める
//
// BGM の楽譜の読み方と予約は music/player.js、楽器の音色は music/voices.js にある。
// ここでは「いつ鳴らし始めるか・止めるか・どの曲にするか」と効果音を受け持つ
class Sound {
  constructor() {
    this.ctx = null;
    this.muted = loadMuted();
    this.musicVolume = loadMusicVolume();
    this.paused = false;
    this.wantMusic = false;
    this.playing = false;
    this.stopAt = null;
    this.mode = 'normal';
    // 普段（ボス以外）に流す曲の id（CONFIG.audio.music のキー）。選ぶ仕組みはメインが作る
    this.trackId = 'normal';
    this.lastPlayed = {};
  }

  // 一度だけ呼ぶ。操作されたら音を使えるようにし、タブを離れたら音を止める
  init() {
    const unlock = () => this.#unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('mousedown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  get isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // 保存できなくても切り替え自体はできる
    }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : cfg.volume.master, this.ctx.currentTime, 0.05);
  }

  // BGM の音量（%）を steps 段階ぶん変える。+1 で 1 段階上げる
  changeMusicVolume(steps) {
    const { step } = cfg.musicVolume;
    this.musicVolume = Math.min(100, Math.max(0, this.musicVolume + steps * step));
    try {
      localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicVolume));
    } catch {
      // 保存できなくても変更自体はできる
    }
    if (this.ctx && this.playing && !this.stopAt) this.#fadeMusicTo(this.#musicLevel(), 0.05);
  }

  // ---- BGM ----

  startMusic() {
    this.wantMusic = true;
    if (!this.ctx) return;
    if (!this.playing) this.#beginMusic();
    else if (this.stopAt) {
      // 消えていく途中で再開した
      this.stopAt = null;
      this.#fadeMusicTo(this.#musicLevel(), 0.3);
    }
  }

  stopMusic() {
    this.wantMusic = false;
    if (!this.ctx || !this.playing || this.stopAt) return;
    this.stopAt = this.ctx.currentTime + cfg.fadeOutSec;
    this.#fadeMusicTo(0, cfg.fadeOutSec / 4);
  }

  // 'normal' か 'boss'。次の小節の頭から、重ねながら切り替わる
  setMode(mode) {
    this.mode = mode;
    this.#switchSong();
  }

  // 普段に流す曲を id で選ぶ（CONFIG.audio.music のキー。'boss' は選べない）。
  // 流れている途中なら、次の小節の頭から重ねながら切り替わる。ボスの間は、ボスが終わってから使われる
  setTrack(id) {
    if (!cfg.music[id] || id === 'boss') return;
    this.trackId = id;
    this.#switchSong();
  }

  get track() {
    return this.trackId;
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (this.ctx && this.playing && !this.stopAt) this.#fadeMusicTo(this.#musicLevel(), 0.15);
  }

  // ---- 効果音 ----

  play(name) {
    if (!this.ctx || this.muted || this.paused) return;
    const t = this.ctx.currentTime;
    const cd = SFX_COOLDOWN[name] ?? 0;
    if (t - (this.lastPlayed[name] ?? -1) < cd) return;
    this.lastPlayed[name] = t;
    const v = this.v;
    const out = this.sfxOut;

    switch (name) {
      case 'hit':
        this.#tone('triangle', 880, 640, 0.05, 0.05, t);
        break;
      case 'defeat':
        this.#tone('sine', 560, 260, 0.14, 0.14, t);
        break;
      case 'bean':
        this.#tone('sine', freq('E6'), freq('E6'), 0.09, 0.08, t);
        this.#tone('sine', freq('B6'), freq('B6'), 0.12, 0.07, t + 0.07);
        break;
      case 'fakeBean':
        this.#tone('triangle', 330, 160, 0.3, 0.14, t);
        break;
      case 'levelUp':
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => v.ep(freq(n), t + i * 0.08, 0.5, 0.9, out));
        break;
      case 'damage':
        this.#tone('sine', 190, 70, 0.22, 0.3, t);
        v.noise(t, 0.12, 0.12, 'lowpass', 900, out);
        break;
      case 'bossAppear':
        this.#drone(55, t, 1.8);
        v.ep(freq('A5'), t + 1.2, 1.2, 0.7, out);
        break;
      case 'clear':
        ['C4', 'E4', 'G4', 'B4', 'D5'].forEach((n, i) => v.ep(freq(n), t + i * 0.06, 3, 0.8, out));
        break;
      // まくらウサギ（仕様 013・102）。出たとき：ぴょこぴょこ跳ねながら遠ざかる（だんだん小さくなる）
      case 'rareAppear': {
        const o = this.#louder(5);
        for (let i = 0; i < 4; i++) {
          const at = t + i * 0.14;
          const vel = 1 - i * 0.2;
          v.glide(700, 1150, at, 0.1, vel, o);
          v.pluck(freq('G5'), at, 0.15, vel * 0.6, o);
        }
        v.bell(freq('E7'), t + 0.62, 0.3, 0.5, o);
        break;
      }
      // 倒したとき：枠が 1 つずつ増えるように 4 つの鈴を数え、最後に和音
      case 'rareDefeat': {
        const o = this.#louder(1.5);
        ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => v.bell(freq(n), t + i * 0.2, 0.25, 0.8, o));
        ['C5', 'E5', 'G5', 'B5'].forEach((n) => v.ep(freq(n), t + 0.8, 1.6, 0.7, o));
        v.bell(freq('C7'), t + 0.8, 1.2, 0.6, o);
        break;
      }
      case 'gameover':
        ['A4', 'F4', 'D4'].forEach((n, i) => v.ep(freq(n), t + i * 0.4, 1.4, 0.8, out));
        break;
      default:
        break;
    }
  }

  // ---- ここから内部の処理 ----

  #unlock() {
    if (!this.ctx) this.#setup();
    this.ctx.resume();
    if (this.wantMusic && !this.playing) this.#beginMusic();
  }

  #setup() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const out = createOutput(ctx, this.muted);
    Object.assign(this, out);
    this.v = new Voices(ctx);
    this.v.startLoop('crackle', cfg.crackle, ctx.currentTime, this.musicOut);
    this.player = new MusicPlayer(this.v, this.musicOut, cfg.swing);
  }

  #songId() {
    return this.mode === 'boss' ? 'boss' : this.trackId;
  }

  #switchSong() {
    if (!this.ctx || !this.playing) return;
    this.player.switchTo(cfg.music[this.#songId()], this.ctx.currentTime + 0.05, cfg.crossfadeSec);
  }

  #musicLevel() {
    return cfg.volume.music * (this.musicVolume / 100) * (this.paused ? cfg.pausedMusicRate : 1);
  }

  #fadeMusicTo(level, timeConstant) {
    const g = this.musicOut.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(level, t, timeConstant);
  }

  #beginMusic() {
    this.playing = true;
    this.stopAt = null;
    this.player.start(cfg.music[this.#songId()], this.ctx.currentTime + 0.1);
    this.#fadeMusicTo(this.#musicLevel(), 0.5);
    if (!this.timer) this.timer = setInterval(() => this.#schedule(), 25);
  }

  #schedule() {
    const t = this.ctx.currentTime;
    if (this.stopAt && t > this.stopAt) {
      this.playing = false;
      this.stopAt = null;
      this.player.stop(t);
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    this.player.scheduleUntil(t + LOOKAHEAD);
  }

  #drone(f, time, dur) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(150, time);
    lp.frequency.linearRampToValueAtTime(500, time + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.25, time + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, time + dur);
    lp.connect(g).connect(this.sfxOut);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  // 鈴の音は小さめなので、効果音の出口の手前で大きくする（今の効果音と同じくらいにそろえる）
  #louder(level) {
    const g = this.ctx.createGain();
    g.gain.value = level;
    g.connect(this.sfxOut);
    return g;
  }

  // 高さが f1 から f2 へ変わる短い音
  #tone(type, f1, f2, dur, vol, time) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f1, time);
    o.frequency.exponentialRampToValueAtTime(f2, time + dur);
    o.connect(this.v.envelope(vol, time, dur, this.sfxOut));
    o.start(time);
    o.stop(time + dur + 0.05);
  }
}

// 音の出口をつなぐ：BGM と効果音 → 全体の音量 → 音割れ防止 → スピーカー。
// BGM はまとめて高音を削り、こもった音にする（曲の案を音声ファイルに書き出すときも同じつなぎ方を使う）
export function createOutput(ctx, muted = false) {
  const gain = (value, dest) => {
    const g = ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
  };
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  const master = gain(muted ? 0 : cfg.volume.master, comp);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = cfg.musicCutoffHz;
  lowpass.connect(master);
  return { master, musicOut: gain(0, lowpass), sfxOut: gain(cfg.volume.sfx, master) };
}

export const sound = new Sound();
