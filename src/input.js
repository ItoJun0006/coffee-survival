// キーボードとタッチ（仮想スティック）の入力を 1 つの方向ベクトルにまとめる。
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.stick = { active: false, id: null, originX: 0, originY: 0, x: 0, y: 0 };
    this.stickRadius = 60;
    this.tapped = false;
    // 直前のタップ位置。キーボードで決定したときは null
    this.tapPos = null;
    // このフレームで押されたキー（押しっぱなしは含まない）
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (!e.repeat) this.justPressed.add(e.code);
      if (e.code === 'Space' || e.code === 'Enter') {
        this.tapped = true;
        this.tapPos = null;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
    canvas.addEventListener('pointermove', (e) => this.#onMove(e));
    canvas.addEventListener('pointerup', (e) => this.#onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.#onUp(e));
  }

  #onDown(e) {
    this.tapped = true;
    this.tapPos = { x: e.clientX, y: e.clientY };
    if (this.stick.active) return;
    Object.assign(this.stick, {
      active: true, id: e.pointerId,
      originX: e.clientX, originY: e.clientY, x: e.clientX, y: e.clientY,
    });
  }

  #onMove(e) {
    if (!this.stick.active || e.pointerId !== this.stick.id) return;
    this.stick.x = e.clientX;
    this.stick.y = e.clientY;
  }

  #onUp(e) {
    if (e.pointerId !== this.stick.id) return;
    this.stick.active = false;
    this.stick.id = null;
  }

  // 長さ 0〜1 の移動方向
  direction() {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    if (this.stick.active) {
      dx = (this.stick.x - this.stick.originX) / this.stickRadius;
      dy = (this.stick.y - this.stick.originY) / this.stickRadius;
    }

    const len = Math.hypot(dx, dy);
    if (len > 1) return { x: dx / len, y: dy / len };
    return { x: dx, y: dy };
  }

  consumeTap() {
    const t = this.tapped;
    this.tapped = false;
    return t;
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
