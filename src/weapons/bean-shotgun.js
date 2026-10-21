import { CONFIG } from '../config.js';
import { BeanGun } from './bean-gun.js';

// 散弾ロブスタの最初の武器。近い敵の方向へ豆を扇形にばらまく。
// 豆マシンガンの仲間なので、レベルアップでは豆マシンガンと同じ枠として強化される
export class BeanShotgun extends BeanGun {
  constructor(game) {
    super(game, CONFIG.weapons.beanShotgun);
  }
}
