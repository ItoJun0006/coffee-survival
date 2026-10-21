import { CONFIG } from './config.js';

const cfg = CONFIG.audio;
const MUTE_KEY = 'coffee-survival.muted';
const MUSIC_VOLUME_KEY = 'coffee-survival.musicVolume';
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// 同じ効果音を続けて鳴らすときの最短の間隔（秒）。敵が一度にたくさん倒れても音が重なりすぎないようにする
const SFX_COOLDOWN = { hit: 0.05, defeat: 0.06, bean: 0.04, damage: 0.1 };

// 'A4' のような音名を周波数（Hz）に変える
function freq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  const midi = (Number(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

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
// BGM は 8 分音符ごとに少し先の音を予約していく。1 小節 = 8 ステップで、
// 小節の頭で和音とベース、決まったステップでキック・スネア・ハイハットを鳴らす
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
    this.nextMode = 'normal';
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

  // 'normal' か 'boss'。次の小節の頭から切り替わる
  setMode(mode) {
    this.nextMode = mode;
    if (!this.playing) this.mode = mode;
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
        ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.#ep(freq(n), t + i * 0.08, 0.5, 0.9, this.sfxOut));
        break;
      case 'damage':
        this.#tone('sine', 190, 70, 0.22, 0.3, t);
        this.#noise(t, 0.12, 0.12, 'lowpass', 900, this.sfxOut);
        break;
      case 'bossAppear':
        this.#drone(55, t, 1.8);
        this.#ep(freq('A5'), t + 1.2, 1.2, 0.7, this.sfxOut);
        break;
      case 'clear':
        ['C4', 'E4', 'G4', 'B4', 'D5'].forEach((n, i) => this.#ep(freq(n), t + i * 0.06, 3, 0.8, this.sfxOut));
        break;
      case 'gameover':
        ['A4', 'F4', 'D4'].forEach((n, i) => this.#ep(freq(n), t + i * 0.4, 1.4, 0.8, this.sfxOut));
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
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    this.master = this.#gain(this.muted ? 0 : cfg.volume.master, comp);

    // BGM はまとめて高音を削り、こもった音にする
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = cfg.musicCutoffHz;
    lowpass.connect(this.master);
    this.musicOut = this.#gain(0, lowpass);
    this.sfxOut = this.#gain(cfg.volume.sfx, this.master);

    // ドラム用の白色雑音
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // レコードのノイズ：小さなサーッという音に、ときどきパチッという音を混ぜる
    const crackle = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const cd = crackle.getChannelData(0);
    let hiss = 0;
    for (let i = 0; i < cd.length; i++) {
      hiss = hiss * 0.97 + (Math.random() * 2 - 1) * 0.03;
      cd[i] = hiss * 0.3;
      if (Math.random() < 0.0003) {
        const amp = Math.random() * 0.8;
        for (let k = 0; k < 40 && i + k < cd.length; k++) cd[i + k] += amp * (Math.random() * 2 - 1) * (1 - k / 40);
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = crackle;
    src.loop = true;
    src.connect(this.#gain(cfg.crackle, this.musicOut));
    src.start();
  }

  #gain(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
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
    this.step = 0;
    this.bar = 0;
    this.mode = this.nextMode;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.#fadeMusicTo(this.#musicLevel(), 0.5);
    if (!this.timer) this.timer = setInterval(() => this.#schedule(), 25);
  }

  #schedule() {
    const t = this.ctx.currentTime;
    if (this.stopAt && t > this.stopAt) {
      this.playing = false;
      this.stopAt = null;
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    while (this.nextTime < t + 0.15) {
      const stepSec = 60 / cfg.music[this.mode].bpm / 2;
      this.#playStep(this.step % 8, this.nextTime, stepSec);
      this.nextTime += stepSec;
      this.step++;
      if (this.step % 8 === 0) {
        this.bar++;
        this.mode = this.nextMode;
      }
    }
  }

  // 1 ステップ分（8 分音符）の音を予約する。裏拍は少し遅らせて、もたついたノリを出す
  #playStep(i, time, stepSec) {
    const song = cfg.music[this.mode];
    const boss = this.mode === 'boss';
    const n = this.bar % song.chords.length;
    const at = time + (i % 2 ? cfg.swing * stepSec : 0);
    const chord = song.chords[n].map(freq);
    const root = freq(song.bass[n]);

    if (i === 0) {
      chord.forEach((f) => this.#ep(f, at, stepSec * 7.5, 0.8, this.musicOut));
      this.#bass(root, at, stepSec * 2.5);
      if (boss) this.#pad(chord, at, stepSec * 8);
    }
    if (i === 3) {
      chord.slice(-3).forEach((f) => this.#ep(f, at, stepSec * 2, 0.4, this.musicOut));
      this.#bass(root, at, stepSec);
    }
    if (i === 6) this.#bass(root * 2, at, stepSec);

    if (i === 0 || i === 5 || (boss && i === 3)) this.#kick(at, i === 0 ? 1 : 0.65);
    if (i === 2 || i === 6) this.#snare(at, 0.8);
    this.#hat(at, i % 2 ? 0.5 : 1);
  }

  // エレピ風の音：少し音程を揺らして、古いテープのような温かさを出す
  #ep(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.16 * vel, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.06 * vel, time + Math.min(0.6, dur));
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    const detune = (Math.random() - 0.5) * 10;
    for (const [type, mul, level] of [['sine', 1, 1], ['triangle', 2, 0.15]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      o.detune.setValueAtTime(detune, time);
      o.detune.linearRampToValueAtTime(detune - 8, time + dur);
      const og = ctx.createGain();
      og.gain.value = level;
      o.connect(og).connect(g);
      o.start(time);
      o.stop(time + dur + 0.05);
    }
  }

  #bass(f, time, dur) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = this.#envelope(0.32, time, dur, this.musicOut);
    o.connect(g);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  #pad(chord, time, dur) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.02, time + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, time + dur);
    lp.connect(g).connect(this.musicOut);
    for (const f of chord) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f / 2;
      o.connect(lp);
      o.start(time);
      o.stop(time + dur + 0.05);
    }
  }

  #kick(time, vel) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(110, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    o.connect(this.#envelope(0.65 * vel, time, 0.28, this.musicOut));
    o.start(time);
    o.stop(time + 0.3);
  }

  #snare(time, vel) {
    this.#noise(time, 0.18, 0.3 * vel, 'bandpass', 1800, this.musicOut);
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 180;
    o.connect(this.#envelope(0.08 * vel, time, 0.08, this.musicOut));
    o.start(time);
    o.stop(time + 0.1);
  }

  #hat(time, vel) {
    this.#noise(time, 0.05, 0.12 * vel, 'highpass', 2500, this.musicOut);
  }

  #noise(time, dur, vol, filterType, filterHz, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterHz;
    src.connect(filter).connect(this.#envelope(vol, time, dur, dest));
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
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

  // 高さが f1 から f2 へ変わる短い音
  #tone(type, f1, f2, dur, vol, time) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f1, time);
    o.frequency.exponentialRampToValueAtTime(f2, time + dur);
    o.connect(this.#envelope(vol, time, dur, this.sfxOut));
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  // すぐ立ち上がって、dur 秒で消える音量の形
  #envelope(vol, time, dur, dest) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    g.connect(dest);
    return g;
  }
}

export const sound = new Sound();
