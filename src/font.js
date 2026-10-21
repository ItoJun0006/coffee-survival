import { CONFIG } from './config.js';

// canvas の ctx.font に渡す指定を作る。例：font(16) → '16px "Yusei Magic", …'、font(28, true) → 太字
export const font = (size, bold = false) => `${bold ? 'bold ' : ''}${size}px ${CONFIG.font.family}`;
