import { CONFIG } from '../config.js';
import { drawCoin } from '../coin-ui.js';

// コピ・ルアク（仕様 029）。倒した手下がときどき豆コインを落とし、拾った分は（やられても）結果画面で全部もらえる。
// game.js からは drop・update・draw・rows を呼ぶだけにする
export class KopiCoinField {
  constructor(character) {
    this.on = !!character.kopi;
    this.items = [];
    this.picked = 0;
  }

  // 敵が倒れたときに呼ぶ
  drop(enemy) {
    const k = CONFIG.characters.kopi;
    if (!this.on || this.items.length >= k.maxOnGround || Math.random() >= k.coinChance) return;
    this.items.push({ x: enemy.x, y: enemy.y });
  }

  update(player) {
    if (!this.items.length) return;
    const reach = CONFIG.characters.kopi.coinRadius + player.radius;
    const before = this.items.length;
    this.items = this.items.filter((c) => Math.hypot(c.x - player.x, c.y - player.y) >= reach);
    this.picked += before - this.items.length;
  }

  draw(ctx) {
    const r = CONFIG.characters.kopi.coinRadius;
    for (const c of this.items) drawCoin(ctx, c.x, c.y, r);
  }

  // 結果画面の数え上げに足す行（拾っていなければ出さない）
  rows() {
    return this.picked ? [{ label: CONFIG.characters.kopi.row, detail: `${this.picked} 枚`, value: this.picked }] : [];
  }
}
