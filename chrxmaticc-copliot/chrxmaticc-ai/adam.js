// ============================================================
//  Adam Optimizer — scratch implementation
//  Paper: "Adam: A Method for Stochastic Optimization"
//  Kingma & Ba, 2014
// ============================================================

const { Matrix } = require('../math/matrix');

class Adam {
  /**
   * @param {number} lr       - Learning rate (default 3e-4 is a classic)
   * @param {number} beta1    - 1st moment decay (default 0.9)
   * @param {number} beta2    - 2nd moment decay (default 0.999)
   * @param {number} epsilon  - Numerical stability (default 1e-8)
   */
  constructor(lr = 3e-4, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8) {
    this.lr      = lr;
    this.beta1   = beta1;
    this.beta2   = beta2;
    this.epsilon = epsilon;
    this.t       = 0;       // timestep
    this.state   = new Map(); // param id → {m, v}
  }

  // Call once per optimiser step with ALL parameters + their gradients
  step(params) {
    this.t++;
    const { beta1, beta2, epsilon, lr, t } = this;

    // Bias-correction factors
    const bc1 = 1 - beta1 ** t;
    const bc2 = 1 - beta2 ** t;

    for (const { id, param, grad } of params) {
      if (!grad) continue;

      if (!this.state.has(id)) {
        this.state.set(id, {
          m: new Float64Array(param.data.length), // 1st moment
          v: new Float64Array(param.data.length), // 2nd moment
        });
      }

      const { m, v } = this.state.get(id);

      for (let i = 0; i < param.data.length; i++) {
        const g = grad.data[i];
        m[i] = beta1 * m[i] + (1 - beta1) * g;
        v[i] = beta2 * v[i] + (1 - beta2) * g * g;

        const mHat = m[i] / bc1;
        const vHat = v[i] / bc2;

        param.data[i] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
  }

  // Gradient clipping — call before step() to prevent exploding gradients
  static clipGrads(params, maxNorm = 1.0) {
    let totalNorm = 0;
    for (const { grad } of params) {
      if (!grad) continue;
      for (let i = 0; i < grad.data.length; i++)
        totalNorm += grad.data[i] ** 2;
    }
    totalNorm = Math.sqrt(totalNorm);

    if (totalNorm > maxNorm) {
      const scale = maxNorm / (totalNorm + 1e-6);
      for (const { grad } of params) {
        if (!grad) continue;
        for (let i = 0; i < grad.data.length; i++)
          grad.data[i] *= scale;
      }
    }
    return totalNorm;
  }
}

module.exports = { Adam };
