import { CONFIG } from './config.js';

// 今遊んでいるステージの設定（仕様 011）。マップの広さなどは、CONFIG ではなくここから読む
export const stage = { id: 'main', ...CONFIG.stages.main };

export function setStage(id) {
  Object.assign(stage, { id }, CONFIG.stages[id]);
}
