// キーボードとマウスクリックの入力をまとめる。
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.clicked = false;
    // 直前のクリック位置。キーボードで決定したときは null
    this.clickPos = null;
    // このフレームで押されたキー（押しっぱなしは含まない）
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (!e.repeat) this.justPressed.add(e.code);
      if (e.code === 'Space' || e.code === 'Enter') {
        this.clicked = true;
        this.clickPos = null;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.clicked = true;
      this.clickPos = { x: e.clientX, y: e.clientY };
    });
  }

  // 長さ 0〜1 の移動方向
  direction() {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    const len = Math.hypot(dx, dy);
    if (len > 1) return { x: dx / len, y: dy / len };
    return { x: dx, y: dy };
  }

  // クリック、または Space / Enter で決定されたか
  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  // 指定したキーのどれかがこのフレームで押されたか
  wasPressed(...codes) {
    return codes.some((c) => this.justPressed.has(c));
  }

  // 毎フレームの最後に呼び、押されたキーの記録を消す
  endFrame() {
    this.justPressed.clear();
  }
}
