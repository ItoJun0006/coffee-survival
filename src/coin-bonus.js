import { CONFIG } from './config.js';
import { pointCard } from './progress.js';

// 豆をがまんした（仕様 082）。1 回のプレイで出た珈琲豆のうち、拾わなかった割合が多いほど、結果画面で豆コインがもらえる。
// 珈琲豆は拾われるまで消えないので、「出た豆」＝拾った豆＋最後に残っている豆（偽物は数えない）
export class AbstainCounter {
  constructor() {
    // 拾った豆は、ポイントカードの累計（progress.js）のこのプレイで増えた分で数える
    this.start = pointCard().beans;
  }

  // プレイが終わったときに呼ぶ。結果画面の数え上げに足す行（0 枚なら行を出さない）
  rows(beans, time) {
    const a = CONFIG.coins.abstain;
    const picked = pointCard().beans - this.start;
    const total = picked + beans.filter((b) => !b.fake).length;
    if (!total) return [];
    const value = Math.floor(a.max * (1 - picked / total) * Math.min(1, time / a.fullSec));
    if (!value) return [];
    const detail = a.detail.replace('{picked}', picked).replace('{total}', total);
    return [{ label: a.label, detail, value }];
  }
}
