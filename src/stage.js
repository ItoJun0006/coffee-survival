import { CONFIG } from './config.js';

// 今遊んでいるステージの設定（仕様 011）。マップの広さなどは、CONFIG ではなくここから読む
export const stage = { id: 'main', ...CONFIG.stages.main };

// 前のステージの設定を消してから入れ直す（上書きだけだと、1 面にない設定がエクストラステージから残るため。仕様 011 FR-011）
export function setStage(id) {
  for (const key of Object.keys(stage)) delete stage[key];
  Object.assign(stage, { id }, CONFIG.stages[id]);
}
