// BGM と効果音で使う「楽器」。どれも Web Audio の発振器と雑音を組み合わせて、その場で音を作る
//
// 楽器ごとに「鳴らす時刻・長さ・強さ・つなぐ先」を受け取り、その時刻に鳴るよう予約するだけ。
// 音を止める処理はいらない（予約した長さで自然に消える）

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// 'A4' のような音名を周波数（Hz）に変える
export function freq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  const midi = (Number(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Voices {
  constructor(ctx) {
    this.ctx = ctx;
    // ドラム用の白色雑音
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // すぐ立ち上がって、dur 秒で消える音量の形
  envelope(vol, time, dur, dest) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    g.connect(dest);
    return g;
  }

  #osc(type, f, time, dur, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.connect(dest);
    o.start(time);
    o.stop(time + dur + 0.05);
    return o;
  }

  // エレピ風の音：少し音程を揺らして、古いテープのような温かさを出す
  ep(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.16 * vel, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.06 * vel, time + Math.min(0.6, dur));
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    const detune = (Math.random() - 0.5) * 10;
    for (const [type, mul, level] of [['sine', 1, 1], ['triangle', 2, 0.15]]) {
      const og = ctx.createGain();
      og.gain.value = level;
      og.connect(g);
      const o = this.#osc(type, f * mul, time, dur, og);
      o.detune.setValueAtTime(detune, time);
      o.detune.linearRampToValueAtTime(detune - 8, time + dur);
    }
  }

  // ピアノ風の音：叩いた瞬間がはっきりしていて、ゆっくり消えていく
  piano(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.14 * vel, time + 0.006);
    g.gain.exponentialRampToValueAtTime(0.035 * vel, time + Math.min(1.2, dur));
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    for (const [type, mul, level] of [['triangle', 1, 1], ['sine', 2, 0.25], ['sine', 3, 0.06]]) {
      const og = ctx.createGain();
      og.gain.value = level;
      og.connect(g);
      this.#osc(type, f * mul, time, dur, og).detune.value = (Math.random() - 0.5) * 6;
    }
  }

  // ナイロン弦のギター風：はじいた瞬間だけ明るく、すぐ丸い音になる
  pluck(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(f * 6, time);
    lp.frequency.exponentialRampToValueAtTime(f * 1.5, time + 0.25);
    const g = this.envelope(0.13 * vel, time, dur, dest);
    lp.connect(g);
    this.#osc('triangle', f, time, dur, lp);
    this.#osc('sawtooth', f, time, Math.min(dur, 0.3), this.#level(0.25, lp));
  }

  // 口笛風：ゆっくり立ち上がり、ふわっと揺れる
  whistle(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.06 * vel, time + 0.06);
    g.gain.setValueAtTime(0.06 * vel, time + Math.max(0.06, dur - 0.12));
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    const o = this.#osc('sine', f, time, dur, g);
    // 1 秒に 5 回ほど音程を揺らす
    this.#osc('sine', 5.2, time, dur, this.#level(f * 0.012, o.frequency));
  }

  // 鉄琴（ビブラフォン）風：澄んだ音が長く残る
  bell(f, time, dur, vel, dest) {
    const g = this.envelope(0.07 * vel, time, dur + 1.2, dest);
    this.#osc('sine', f, time, dur + 1.2, g);
    this.#osc('sine', f * 4, time, 0.4, this.envelope(0.25, time, 0.4, g));
  }

  // やわらかい笛風：息の音を少し混ぜる
  flute(f, time, dur, vel, dest) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.055 * vel, time + 0.04);
    g.gain.setValueAtTime(0.05 * vel, time + Math.max(0.04, dur - 0.1));
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    this.#osc('sine', f, time, dur, g);
    this.#osc('triangle', f * 2, time, dur, this.#level(0.08, g));
    this.noise(time, 0.08, 0.03 * vel, 'bandpass', f * 2, dest);
  }

  bass(f, time, dur, dest, vol = 0.32) {
    this.#osc('sine', f, time, dur, this.envelope(vol, time, dur, dest));
  }

  // ウッドベース風：指ではじいた「ボン」という音
  upright(f, time, dur, dest, vol = 0.34) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, time);
    lp.frequency.exponentialRampToValueAtTime(250, time + 0.2);
    lp.connect(this.envelope(vol, time, dur, dest));
    this.#osc('triangle', f, time, dur, lp);
    this.#osc('sine', f, time, dur, this.#level(0.6, lp));
  }

  // ふんわり伸びる和音（ボスの曲で使う）
  pad(chord, time, dur, dest, level = 0.02) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(level, time + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, time + dur);
    lp.connect(g).connect(dest);
    for (const f of chord) this.#osc('sawtooth', f / 2, time, dur, lp);
  }

  // 小節のあいだずっと鳴り続ける、かすかな和音の下じき。次の小節と少し重ねて、すき間をなくす
  wash(chord, time, dur, dest, level = 0.012) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(level, time + 0.3);
    g.gain.setValueAtTime(level, time + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, time + dur);
    g.connect(dest);
    for (const f of chord) this.#osc('triangle', f, time, dur, g);
  }

  kick(time, vel, dest) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(110, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    o.connect(this.envelope(0.65 * vel, time, 0.28, dest));
    o.start(time);
    o.stop(time + 0.3);
  }

  snare(time, vel, dest) {
    this.noise(time, 0.18, 0.3 * vel, 'bandpass', 1800, dest);
    this.#osc('triangle', 180, time, 0.08, this.envelope(0.08 * vel, time, 0.08, dest));
  }

  hat(time, vel, dest) {
    this.noise(time, 0.05, 0.12 * vel, 'highpass', 2500, dest);
  }

  // ブラシでこするスネア：「シャッ」と長めに伸びる
  brush(time, vel, dest) {
    this.noise(time, 0.32, 0.12 * vel, 'bandpass', 3000, dest);
  }

  // 太鼓のふちを叩く「カッ」という音（ボサノバのリズム）
  rim(time, vel, dest) {
    this.noise(time, 0.03, 0.18 * vel, 'bandpass', 2400, dest);
    this.#osc('triangle', 820, time, 0.04, this.envelope(0.07 * vel, time, 0.04, dest));
  }

  // マラカス風の「シャカ」
  shaker(time, vel, dest) {
    this.noise(time, 0.07, 0.07 * vel, 'highpass', 5000, dest);
  }

  noise(time, dur, vol, filterType, filterHz, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterHz;
    src.connect(filter).connect(this.envelope(vol, time, dur, dest));
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  // くり返し鳴らす雑音を作る。kind は 'crackle'（レコードのノイズ）か 'rain'（雨の音）
  loopBuffer(kind) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let hiss = 0;
    for (let i = 0; i < d.length; i++) {
      if (kind === 'rain') {
        // 雨：低めのザーッという音に、ポツッという粒を多めに混ぜる
        hiss = hiss * 0.9 + (Math.random() * 2 - 1) * 0.1;
        d[i] = hiss * 0.5;
        if (Math.random() < 0.002) {
          const amp = Math.random() * 0.3;
          for (let k = 0; k < 120 && i + k < d.length; k++) d[i + k] += amp * Math.sin(k * 0.9) * (1 - k / 120);
        }
      } else {
        // レコード：小さなサーッという音に、ときどきパチッという音を混ぜる
        hiss = hiss * 0.97 + (Math.random() * 2 - 1) * 0.03;
        d[i] = hiss * 0.3;
        if (Math.random() < 0.0003) {
          const amp = Math.random() * 0.8;
          for (let k = 0; k < 40 && i + k < d.length; k++) d[i + k] += amp * (Math.random() * 2 - 1) * (1 - k / 40);
        }
      }
    }
    return buf;
  }

  // くり返す雑音を time から鳴らし始める。止めるときは返した音源の stop() を呼ぶ
  startLoop(kind, level, time, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.loopBuffer(kind);
    src.loop = true;
    src.connect(this.#level(level, dest));
    src.start(time);
    return src;
  }

  #level(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    g.connect(dest);
    return g;
  }
}
