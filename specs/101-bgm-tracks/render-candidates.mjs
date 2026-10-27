// 曲の案を、ゲームと同じ組み立て方（Web Audio）で音声ファイル（WAV）に書き出す
// 使い方：python3 -m http.server 8123 でゲームを開ける状態にして、playwright を入れたフォルダで
//   node render-candidates.mjs <書き出し先のフォルダ>
// ヘッドレス Chromium の OfflineAudioContext で、実際の時間を待たずに一気に組み立てる
import { chromium } from 'playwright';
import fs from 'fs';
const [outDir] = process.argv.slice(2);
const plans = [
  { id: 'morningBlend', startBar: 0, bossAt: 52, total: 60 },
  { id: 'midnightDrip', startBar: 6, bossAt: 48, total: 60 },
  { id: 'cafeBossa', startBar: 0, bossAt: 46, total: 56 },
  { id: 'normal', startBar: 0, bossAt: 30, total: 40 },
];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.goto('http://localhost:8123/index.html');
for (const plan of plans) {
  const r = await page.evaluate(async (plan) => {
    const { CONFIG } = await import('/src/config.js');
    const { Voices } = await import('/src/music/voices.js');
    const { MusicPlayer } = await import('/src/music/player.js');
    const { createOutput } = await import('/src/sound.js');
    const cfg = CONFIG.audio;
    const sr = 22050;
    const ctx = new OfflineAudioContext(1, sr * plan.total, sr);
    const out = createOutput(ctx);
    out.musicOut.gain.value = cfg.volume.music * cfg.musicVolume.default / 100;
    const v = new Voices(ctx);
    v.startLoop('crackle', cfg.crackle, 0, out.musicOut);
    const player = new MusicPlayer(v, out.musicOut, cfg.swing);
    player.start(cfg.music[plan.id], 0.05, plan.startBar);
    player.scheduleUntil(plan.bossAt);
    player.switchTo(cfg.music.boss, plan.bossAt, cfg.crossfadeSec);
    player.scheduleUntil(plan.total);
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    // 0.25 秒ごとの大きさ（途切れの確認用）
    const win = Math.floor(sr / 4), rms = [];
    for (let i = 0; i + win <= d.length; i += win) { let s = 0; for (let k = 0; k < win; k++) s += d[i + k] ** 2; rms.push(Math.sqrt(s / win)); }
    let peak = 0; for (const x of d) peak = Math.max(peak, Math.abs(x));
    const pcm = new Int16Array(d.length);
    for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
    let bin = ''; const u8 = new Uint8Array(pcm.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return { b64: btoa(bin), rms, peak, sr };
  }, plan);
  const pcm = Buffer.from(r.b64, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(r.sr, 24);
  h.writeUInt32LE(r.sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(`${outDir}/${plan.id}.wav`, Buffer.concat([h, pcm]));
  const play = r.rms.slice(4, Math.floor(plan.bossAt * 4));
  const sorted = [...play].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const all = r.rms.slice(4);
  const minAll = Math.min(...all);
  console.log(plan.id, 'peak', r.peak.toFixed(2), 'median', median.toFixed(3), 'min/median', (Math.min(...play) / median).toFixed(2), 'min(boss含む)/median', (minAll / median).toFixed(2), 'at', (all.indexOf(minAll) / 4 + 1).toFixed(2) + 's');
}
await browser.close();
