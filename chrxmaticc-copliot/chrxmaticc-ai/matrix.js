// ============================================================
//  Matrix — the foundation of everything in this AI
//  All operations are pure JS, zero dependencies.
// ============================================================

class Matrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    // Flat Float64Array for speed
    this.data = data ?? new Float64Array(rows * cols);
  }

  // ── Factories ──────────────────────────────────────────────

  static zeros(rows, cols) {
    return new Matrix(rows, cols);
  }

  static ones(rows, cols) {
    const m = new Matrix(rows, cols);
    m.data.fill(1);
    return m;
  }

  static random(rows, cols, scale = 0.1) {
    const m = new Matrix(rows, cols);
    for (let i = 0; i < m.data.length; i++) {
      // Box-Muller transform for gaussian init
      const u1 = Math.random(), u2 = Math.random();
      m.data[i] = scale * Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    }
    return m;
  }

  static identity(n) {
    const m = Matrix.zeros(n, n);
    for (let i = 0; i < n; i++) m.set(i, i, 1);
    return m;
  }

  static fromArray(arr2d) {
    const rows = arr2d.length, cols = arr2d[0].length;
    const m = new Matrix(rows, cols);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        m.set(r, c, arr2d[r][c]);
    return m;
  }

  // ── Accessors ──────────────────────────────────────────────

  get(r, c) { return this.data[r * this.cols + c]; }
  set(r, c, v) { this.data[r * this.cols + c] = v; }
  add_at(r, c, v) { this.data[r * this.cols + c] += v; }

  row(r) {
    return new Float64Array(this.data.buffer, r * this.cols * 8, this.cols);
  }

  clone() {
    return new Matrix(this.rows, this.cols, new Float64Array(this.data));
  }

  toArray() {
    const out = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) row.push(this.get(r, c));
      out.push(row);
    }
    return out;
  }

  // ── Core Ops ───────────────────────────────────────────────

  // Matrix multiply  (this: [A x B])  x  (other: [B x C])  →  [A x C]
  matmul(other) {
    if (this.cols !== other.rows)
      throw new Error(`matmul shape mismatch: (${this.rows},${this.cols}) x (${other.rows},${other.cols})`);
    const out = Matrix.zeros(this.rows, other.cols);
    for (let r = 0; r < this.rows; r++)
      for (let k = 0; k < this.cols; k++) {
        const v = this.get(r, k);
        if (v === 0) continue;
        for (let c = 0; c < other.cols; c++)
          out.add_at(r, c, v * other.get(k, c));
      }
    return out;
  }

  transpose() {
    const out = Matrix.zeros(this.cols, this.rows);
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        out.set(c, r, this.get(r, c));
    return out;
  }

  // Elementwise
  add(other) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] += other.data[i];
    return out;
  }

  sub(other) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] -= other.data[i];
    return out;
  }

  mul(other) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] *= other.data[i];
    return out;
  }

  scale(s) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] *= s;
    return out;
  }

  addScalar(s) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] += s;
    return out;
  }

  map(fn) {
    const out = this.clone();
    for (let i = 0; i < out.data.length; i++) out.data[i] = fn(out.data[i], i);
    return out;
  }

  // ── Reductions ─────────────────────────────────────────────

  sum() {
    let s = 0;
    for (let i = 0; i < this.data.length; i++) s += this.data[i];
    return s;
  }

  // Sum along axis: 0 = sum rows → (1, cols), 1 = sum cols → (rows, 1)
  sumAxis(axis) {
    if (axis === 0) {
      const out = Matrix.zeros(1, this.cols);
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.add_at(0, c, this.get(r, c));
      return out;
    } else {
      const out = Matrix.zeros(this.rows, 1);
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.add_at(r, 0, this.get(r, c));
      return out;
    }
  }

  maxAxis(axis) {
    if (axis === 1) {
      const out = Matrix.zeros(this.rows, 1);
      for (let r = 0; r < this.rows; r++) {
        let m = -Infinity;
        for (let c = 0; c < this.cols; c++) m = Math.max(m, this.get(r, c));
        out.set(r, 0, m);
      }
      return out;
    }
    throw new Error('maxAxis only supports axis=1 for now');
  }

  // ── Broadcast helpers ──────────────────────────────────────

  // Add a (1, cols) or (rows, 1) matrix broadcast to this shape
  broadcastAdd(other) {
    const out = this.clone();
    if (other.rows === 1 && other.cols === this.cols) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.add_at(r, c, other.get(0, c));
    } else if (other.cols === 1 && other.rows === this.rows) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.add_at(r, c, other.get(r, 0));
    } else {
      throw new Error('broadcastAdd: incompatible shapes');
    }
    return out;
  }

  broadcastSub(other) {
    return this.broadcastAdd(other.scale(-1));
  }

  broadcastDiv(other) {
    const out = this.clone();
    if (other.rows === 1 && other.cols === this.cols) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.set(r, c, out.get(r, c) / other.get(0, c));
    } else if (other.cols === 1 && other.rows === this.rows) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          out.set(r, c, out.get(r, c) / other.get(r, 0));
    } else {
      throw new Error('broadcastDiv: incompatible shapes');
    }
    return out;
  }

  // ── Activations ────────────────────────────────────────────

  relu() {
    return this.map(v => Math.max(0, v));
  }

  reluGrad() {
    return this.map(v => v > 0 ? 1 : 0);
  }

  tanh() {
    return this.map(v => Math.tanh(v));
  }

  tanhGrad() {
    return this.map(v => 1 - Math.tanh(v) ** 2);
  }

  sigmoid() {
    return this.map(v => 1 / (1 + Math.exp(-v)));
  }

  // Softmax per row
  softmax() {
    const out = Matrix.zeros(this.rows, this.cols);
    for (let r = 0; r < this.rows; r++) {
      let max = -Infinity;
      for (let c = 0; c < this.cols; c++) max = Math.max(max, this.get(r, c));
      let sum = 0;
      for (let c = 0; c < this.cols; c++) {
        const e = Math.exp(this.get(r, c) - max);
        out.set(r, c, e);
        sum += e;
      }
      for (let c = 0; c < this.cols; c++) out.set(r, c, out.get(r, c) / sum);
    }
    return out;
  }

  log() {
    return this.map(v => Math.log(v + 1e-10));
  }

  exp() {
    return this.map(v => Math.exp(v));
  }

  sqrt() {
    return this.map(v => Math.sqrt(v + 1e-10));
  }

  // ── Layer Norm ─────────────────────────────────────────────

  // Normalizes each row independently
  layerNorm(gamma, beta, eps = 1e-5) {
    const out = Matrix.zeros(this.rows, this.cols);
    for (let r = 0; r < this.rows; r++) {
      let mean = 0;
      for (let c = 0; c < this.cols; c++) mean += this.get(r, c);
      mean /= this.cols;
      let variance = 0;
      for (let c = 0; c < this.cols; c++) variance += (this.get(r, c) - mean) ** 2;
      variance /= this.cols;
      const std = Math.sqrt(variance + eps);
      for (let c = 0; c < this.cols; c++) {
        const norm = (this.get(r, c) - mean) / std;
        out.set(r, c, gamma.get(0, c) * norm + beta.get(0, c));
      }
    }
    return out;
  }

  // ── Debug ──────────────────────────────────────────────────

  shape() { return `(${this.rows}, ${this.cols})`; }

  print(label = '') {
    if (label) console.log(label);
    for (let r = 0; r < Math.min(this.rows, 6); r++) {
      const row = [];
      for (let c = 0; c < Math.min(this.cols, 8); c++)
        row.push(this.get(r, c).toFixed(4));
      console.log('  [' + row.join(', ') + (this.cols > 8 ? ', ...' : '') + ']');
    }
    if (this.rows > 6) console.log('  ...');
    console.log(`  shape: ${this.shape()}`);
  }
}

module.exports = { Matrix };
