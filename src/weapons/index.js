import { BeanGun } from './bean-gun.js';
import { Mill } from './mill.js';
import { Mug } from './mug.js';
import { Drip } from './drip.js';
import { Steam } from './steam.js';
import { Puddle } from './puddle.js';
import { Ice } from './ice.js';
import { Espresso } from './espresso.js';
import { Shockwave } from './shockwave.js';

// レベル順に手に入る攻撃。先頭は最初から持っている
export const WEAPON_ORDER = [BeanGun, Mill, Mug, Drip, Steam, Puddle, Ice, Shockwave]; //Espresso, 
