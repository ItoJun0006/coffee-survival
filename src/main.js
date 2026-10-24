import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start();
// ?test を付けて開くと、自動テスト（tests/）がゲームの様子を見られるようにする
if (new URLSearchParams(location.search).has('test')) window.game = game;

// canvas だけではフォントの読み込みが始まらないので、ここで読み込む。
// 読み込みが終わるまでは標準のフォントで描き、終わったら次のフレームから切り替わる
document.fonts.load('16px "Yusei Magic"');
