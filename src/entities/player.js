import { CONFIG } from '../config.js';
import { sound } from '../sound.js';
import { flower, leaf } from '../item-icons.js';
import { stage } from '../stage.js';
import { drawPattern } from './variety-look.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// 豆の体の形の道（パス）を作る。ふつうは楕円、shape のあるキャラ（リベリカ大粒のしずく形）はその形。x・y は真ん中
export function beanBodyPath(ctx, character, r, x = 0, y = 0) {
  ctx.beginPath();
  const shape = character?.shape && CONFIG.characters.shapes[character.shape];
  if (!shape) {
    ctx.ellipse(x, y, r * 0.82, r * 1.05, 0, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(x + shape.start[0] * r, y + shape.start[1] * r);
  for (const c of shape.curves) ctx.bezierCurveTo(...c.map((v, i) => (i % 2 ? y : x) + v * r));
  ctx.closePath();
}

// 珈琲豆のキャラを描く。look は目線の向き（長さ 0〜1）、bob は歩くときの弾み（0〜1）、skin はスキン「椿」を付けているか
// 品種に模様（variety.pattern、仕様 016）があれば、豆の上に描く。模様は豆の輪郭の内側だけに描き、当たる範囲は変えない
// dot はドット絵にするときのドットの大きさ（px）。0 ならなめらかな絵のまま
export function drawCharacter(ctx, character, r, { look = { x: 0, y: 0 }, bob = 0, slowed = false, skin = false, dot = 0 } = {}) {
  if (character.multi) {
    drawBrothers(ctx, character, r, { look, bob, slowed, dot });
    return;
  }
  const { color, crease } = character.roast;
  const sx = 1 + bob * 0.06;
  const sy = 1 - bob * 0.06;
  ctx.save();
  ctx.scale(sx, sy);
  if (character.creator) drawHeadphoneBand(ctx, r);
  if (character.dragon) drawDragonBack(ctx, r);

  ctx.fillStyle = color;
  beanBodyPath(ctx, character, r);
  ctx.fill();
  const pattern = character.variety?.pattern;
  if (pattern) drawPattern(ctx, pattern.kind, (character.roast.id === 'light' && pattern.lightColor) || pattern.color, r, r * 0.82, r * 1.05);
  // つや
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.18, r * 0.3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // 豆の割れ目
  ctx.strokeStyle = crease;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.88);
  ctx.quadraticCurveTo(r * 0.22, -r * 0.35, 0, r * 0.15);
  ctx.stroke();
  // 目と口。ピーベリー（仕様 017）は目玉が 1 つ
  if (character.eyes === 'one') drawOneEye(ctx, r, look, dot);
  else if (dot) drawDotEyes(ctx, r, look, dot, sx, sy);
  else drawEyes(ctx, r, look);
  if (character.dragon) drawSharpEyes(ctx, r, color, dot);
  ctx.strokeStyle = '#fff8ee';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, r * 0.38, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  if (skin) drawCamelliaSkin(ctx, r);
  if (character.creator) drawCreatorGear(ctx, r);
  if (character.dragon) drawHorns(ctx, r);

  if (slowed) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = CONFIG.colors.playerSlowed;
    beanBodyPath(ctx, character, r);
    ctx.fill();
  }
  ctx.restore();
}

function drawEyes(ctx, r, look) {
  for (const side of [-1, 1]) {
    const ex = side * r * 0.38;
    const ey = -r * 0.05;
    ctx.fillStyle = CONFIG.player.eyes.white;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CONFIG.player.eyes.pupil;
    ctx.beginPath();
    ctx.arc(ex + look.x * r * 0.08, ey + look.y * r * 0.08, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ドット絵用の目。小さな丸は 1 マスより細くて欠けたり潰れたりするので、ドットのマス単位の四角で描く。
// 幅と高さがマスの大きさのちょうど倍数なら、マスの格子とずれていても拾われるマスの数は変わらない。
// 弾み（sx, sy の伸び縮み）は目の大きさにかけず、位置だけを動かす
function drawDotEyes(ctx, r, look, dot, sx, sy) {
  const { white, pupil, dotsW, dotsH, pupilW, pupilH } = CONFIG.player.eyes;
  const w = dotsW * dot;
  const h = dotsH * dot;
  // 黒目の位置（白目の中のマス）。目線の向きで 1 マスずつ動かす
  const step = (v, room) => Math.max(0, Math.min(room, Math.round(room / 2 + v * room)));
  const px = step(look.x, dotsW - pupilW) * dot;
  const py = step(look.y, dotsH - pupilH) * dot;
  ctx.save();
  ctx.scale(1 / sx, 1 / sy);
  // 四角の端が点の途中にかかると、その点だけ背景と混ざった色になり、それが拾われると目がくすむ。
  // ドット絵の層のマスの格子（画用紙の左上から dot px ごと）にぴったり合わせる
  const t = ctx.getTransform();
  const snapX = (x) => (Math.round((t.a * x + t.e) / dot) * dot - t.e) / t.a;
  const snapY = (y) => (Math.round((t.d * y + t.f) / dot) * dot - t.f) / t.d;
  for (const side of [-1, 1]) {
    const x = snapX(side * r * 0.38 * sx - w / 2);
    const y = snapY(-r * 0.05 * sy - h / 2);
    ctx.fillStyle = white;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pupil;
    ctx.fillRect(x + px, y + py, pupilW * dot, pupilH * dot);
  }
  ctx.restore();
}

// こーひー3兄弟（仕様 018）：浅煎り・中煎り・深煎りの 3 粒を、上から順に串に刺した形で描く。
// 3 粒とも、ふつうの豆（drawCharacter）を小さくして描く
function drawBrothers(ctx, character, r, opts) {
  const m = CONFIG.characters.multi;
  const roasts = CONFIG.characters.roasts;
  // 1 粒の大きさと、粒どうしの間（どちらも r に対する割合）。少し重ねて、全体をふつうの豆と同じくらいの高さにする
  const size = 0.5;
  const gap = 0.62;
  ctx.save();
  ctx.rotate((m.tiltDeg * Math.PI) / 180);
  // 串（豆の後ろ）
  ctx.strokeStyle = m.stickDark;
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -r * (gap + size + 0.25));
  ctx.lineTo(0, r * (gap + size + 0.55));
  ctx.stroke();
  ctx.strokeStyle = m.stick;
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.stroke();
  roasts.forEach((roast, i) => {
    ctx.save();
    ctx.translate(0, (i - 1) * gap * r);
    // 小さな豆にドット絵用の目（大きさが決まっている）を付けると目だけになるので、ふつうの目で描く
    drawCharacter(ctx, { roast }, r * size, { ...opts, dot: 0 });
    ctx.restore();
  });
  ctx.restore();
}

// 目玉 1 つ（ピーベリー、仕様 017）。顔の真ん中に大きな丸い目。
// ドット絵のときも 1 マスより小さくならない大きさで描く（dot はドットの大きさ）
function drawOneEye(ctx, r, look, dot) {
  const { white, pupil } = CONFIG.player.eyes;
  const ey = -r * 0.08;
  const p = Math.max(r * 0.15, dot * 1.5);
  const px = look.x * r * 0.1;
  const py = look.y * r * 0.08;
  // 顔の真ん中に、大きな丸い目
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.arc(0, ey, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pupil;
  ctx.beginPath();
  ctx.arc(px, ey + py, p * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = white;
  ctx.beginPath();
  ctx.arc(px - p * 0.45, ey + py - p * 0.45, Math.max(p * 0.35, dot * 0.6), 0, Math.PI * 2);
  ctx.fill();
}

// クリエイター豆（仕様 021）：赤いヘッドホンと、手に持ったエナジードリンクの缶。輪は豆の後ろ、耳あてと缶は前に描く
function drawHeadphoneBand(ctx, r) {
  ctx.strokeStyle = CONFIG.characters.creator.colors.band;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 0.95, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
}

function drawCreatorGear(ctx, r) {
  const { cup, can, bolt, rim } = CONFIG.characters.creator.colors;
  ctx.fillStyle = cup;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * r * 0.86, -r * 0.15, r * 0.2, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 缶（大きさ s）。稲妻は、上の右から左下へ折れ曲がる形
  const s = r * 0.55;
  ctx.save();
  ctx.translate(r * 1.05, r * 0.45);
  ctx.rotate(0.25);
  ctx.fillStyle = can;
  ctx.fillRect(-s * 0.35, -s * 0.6, s * 0.7, s * 1.2);
  ctx.fillStyle = rim;
  ctx.fillRect(-s * 0.35, -s * 0.68, s * 0.7, s * 0.14);
  ctx.fillRect(-s * 0.35, s * 0.56, s * 0.7, s * 0.1);
  ctx.fillStyle = bolt;
  ctx.beginPath();
  ctx.moveTo(s * 0.08, -s * 0.4);
  ctx.lineTo(-s * 0.14, s * 0.05);
  ctx.lineTo(s * 0.02, s * 0.05);
  ctx.lineTo(-s * 0.08, s * 0.42);
  ctx.lineTo(s * 0.16, -s * 0.05);
  ctx.lineTo(0, -s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ドラゴン豆（仕様 022）：濃い緑の翼としっぽは豆の後ろ、角は前に描く。目は内側の上を豆の色でかくして吊り目にする
function drawDragonBack(ctx, r) {
  const { wing } = CONFIG.characters.dragon.colors;
  ctx.fillStyle = wing;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.7, -r * 0.2);
    ctx.lineTo(side * r * 1.45, -r * 0.75);
    ctx.lineTo(side * r * 1.3, -r * 0.3);
    ctx.lineTo(side * r * 1.5, -r * 0.1);
    ctx.lineTo(side * r * 1.2, r * 0.05);
    ctx.lineTo(side * r * 1.3, r * 0.25);
    ctx.lineTo(side * r * 0.75, r * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  // しっぽ（先は三角）
  ctx.strokeStyle = wing;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(r * 0.5, r * 0.8);
  ctx.quadraticCurveTo(r * 1.2, r * 1.05, r * 1.25, r * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 1.25, r * 0.35);
  ctx.lineTo(r * 1.4, r * 0.6);
  ctx.lineTo(r * 1.1, r * 0.6);
  ctx.fill();
}

function drawHorns(ctx, r) {
  ctx.fillStyle = CONFIG.characters.dragon.colors.horn;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.25, -r * 0.92);
    ctx.lineTo(side * r * 0.55, -r * 1.38);
    ctx.lineTo(side * r * 0.5, -r * 0.82);
    ctx.closePath();
    ctx.fill();
  }
}

// 目（drawEyes・drawDotEyes と同じ位置と大きさ）の上の辺を、内側ほど深く豆の色でかくす
function drawSharpEyes(ctx, r, color, dot) {
  const { dotsW, dotsH } = CONFIG.player.eyes;
  const cut = CONFIG.characters.dragon.eyeCut;
  const halfW = dot ? (dotsW * dot) / 2 : r * 0.2;
  const halfH = dot ? (dotsH * dot) / 2 : r * 0.2;
  const ey = -r * 0.05;
  ctx.fillStyle = color;
  for (const side of [-1, 1]) {
    const inner = side * (r * 0.38 - halfW) - side;
    const outer = side * (r * 0.38 + halfW) + side;
    ctx.beginPath();
    ctx.moveTo(inner, ey - halfH - 2);
    ctx.lineTo(outer, ey - halfH - 2);
    ctx.lineTo(outer, ey - halfH + 0.5);
    ctx.lineTo(inner, ey - halfH + halfH * 2 * cut);
    ctx.closePath();
    ctx.fill();
  }
}

// スキン「椿」（頭に大きな椿の髪飾り）。椿の花の絵は、大きさ 80 を基準にしたアイコンの絵（item-icons.js）を使う
function drawCamelliaSkin(ctx, r) {
  ctx.save();
  ctx.translate(-0.5 * r, -0.82 * r);
  ctx.scale(r / 40, r / 40);
  leaf(ctx, 14, 10, 12, 0.6);
  flower(ctx, 0, 0, 18);
  ctx.restore();
}

export class Player {
  constructor(x, y, character) {
    this.x = x;
    this.y = y;
    this.character = character;
    this.radius = CONFIG.player.radius;
    this.speed = CONFIG.player.speed * character.roast.speedRate;
    this.maxCaffeine = character.roast.maxCaffeine;
    this.caffeine = this.maxCaffeine;
    this.invincibleTimer = 0;
    // 品種の特別な力（仕様 016）：無敵時間・カフェインの減りの倍率・経験値の粒を吸い寄せる距離の倍率
    const power = character.power;
    this.invincibleSec = power?.invincibleSec ?? CONFIG.player.invincibleSec;
    this.decayRate = power?.decayRate ?? 1;
    this.magnetRate = power?.magnetRate ?? 1;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.look = { x: 0, y: 0 };
    this.walkTime = 0;
    // 見た目の大きさの倍率（当たる範囲の radius は変えない）
    this.drawScale = character.drawScale ?? 1;
  }

  // 性能を変える（赤ちゃん豆の成長など）。カフェイン上限が増えた分は、今のカフェインにも足す
  setStats(speedRate, maxCaffeine) {
    this.speed = CONFIG.player.speed * speedRate;
    if (maxCaffeine > this.maxCaffeine) this.caffeine += maxCaffeine - this.maxCaffeine;
    this.maxCaffeine = maxCaffeine;
    this.caffeine = Math.min(this.caffeine, this.maxCaffeine);
  }

  // dir: 入力方向（長さ 0〜1）、push: 外から加わる速度（px/秒）
  update(dt, dir, push = { x: 0, y: 0 }) {
    const { width, height } = stage.world;
    const speed = this.speed * (this.slowTimer > 0 ? this.slowFactor : 1);
    const { x, y } = this;
    this.x = clamp(this.x + (dir.x * speed + push.x) * dt, this.radius, width - this.radius);
    this.y = clamp(this.y + (dir.y * speed + push.y) * dt, this.radius, height - this.radius);
    // このフレームで実際に動いた距離（壁で止まった分は含まない）
    this.moved = Math.hypot(this.x - x, this.y - y);
    // エクストラステージでは、カフェインは時間で減らない
    if (stage.caffeineDecay) this.caffeine -= CONFIG.player.caffeineDecayPerSec * this.decayRate * dt;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    // 動いている間だけ弾ませ、目線を進む方向に向ける
    if (dir.x || dir.y) {
      this.walkTime += dt;
      this.look = dir;
    }
  }

  get alive() {
    return this.caffeine > 0;
  }

  // 被弾：無敵時間中は無効
  hit(amount) {
    if (this.invincibleTimer > 0) return;
    this.caffeine -= amount;
    this.invincibleTimer = this.invincibleSec;
    sound.play('damage');
  }

  // 継続的な減少：無敵時間に関係なく減る
  drain(amount) {
    this.caffeine -= amount;
  }

  heal(amount) {
    this.caffeine = Math.min(this.maxCaffeine, this.caffeine + amount);
  }

  slow(sec, factor) {
    this.slowTimer = sec;
    this.slowFactor = factor;
  }

  draw(ctx) {
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 20) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    drawCharacter(ctx, this.character, this.radius * this.drawScale, {
      look: this.look,
      bob: Math.abs(Math.sin(this.walkTime * 12)),
      slowed: this.slowTimer > 0,
      skin: this.skin,
      dot: CONFIG.pixelArt.enabled ? CONFIG.pixelArt.size : 0,
    });
    ctx.restore();
  }
}
