import { Game } from './game.js';

const canvas = document.getElementById('game');
new Game(canvas).start();

// canvas だけではフォントの読み込みが始まらないので、ここで読み込む。
// 読み込みが終わるまでは標準のフォントで描き、終わったら次のフレームから切り替わる
document.fonts.load('16px "Yusei Magic"');
