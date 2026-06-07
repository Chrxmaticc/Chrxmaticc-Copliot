// ============================================================
//  Transformer Language Model — built from scratch
//
//  Architecture:
//    Embedding → N × (MultiHeadAttention + FFN + LayerNorm) → LM Head
//
//  This is the same core idea behind GPT, just small enough to
//  actually train on a laptop.
// ============================================================

const { Matrix } = require('../math/matrix');

// ── Embedding Table ────────────────────────────────────────────────────────────

class Embedding {
  constructor(vocabSize, dModel) {
    this.vocabSize = vocabSize;
    this.dModel    = dModel;
    this.W = Matrix.random(vocabSize, dModel, 0.02);
    this.dW = Matrix.zeros(vocabSize, dModel);
  }

  forward(ids) {
    const T = ids.length;
    const out = Matrix.zeros(T, this.dModel);
    for (let t = 0; t < T; t++) {
      const id = ids[t];
      for (let d = 0; d < this.dModel; d++)
        out.set(t, d, this.W.get(id, d));
    }
    this._lastIds = ids;
    return out;
  }

  backward(grad) {
    for (let t = 0; t < this._lastIds.length; t++) {
      const id = this._lastIds[t];
      for (let d = 0; d < this.dModel; d++)
        this.dW.add_at(id, d, grad.get(t, d));
    }
  }

  params() {
    return [{ id: 'emb.W', param: this.W, grad: this.dW }];
  }

  zeroGrad() { this.dW.data.fill(0); }
}

// ── Positional Encoding (sinusoidal, fixed) ────────────────────────────────────

function buildPosEncoding(maxLen, dModel) {
  const pe = Matrix.zeros(maxLen, dModel);
  for (let pos = 0; pos < maxLen; pos++) {
    for (let i = 0; i < dModel; i += 2) {
      const angle = pos / Math.pow(10000, i / dModel);
      pe.set(pos, i,     Math.sin(angle));
      if (i + 1 < dModel)
        pe.set(pos, i + 1, Math.cos(angle));
    }
  }
  return pe;
}

// ── Linear Layer ──────────────────────────────────────────────────────────────

class Linear {
  constructor(inDim, outDim, id = 'linear') {
    this.inDim  = inDim;
    this.outDim = outDim;
    this.id     = id;
    this.W  = Matrix.random(inDim, outDim, 0.02);
    this.b  = Matrix.zeros(1, outDim);
    this.dW = Matrix.zeros(inDim, outDim);
    this.db = Matrix.zeros(1, outDim);
  }

  forward(x) {
    this._x = x;
    return x.matmul(this.W).broadcastAdd(this.b);
  }

  backward(grad) {
    const dW = this._x.transpose().matmul(grad);
    const db = grad.sumAxis(0);
    const dx = grad.matmul(this.W.transpose());
    for (let i = 0; i < this.dW.data.length; i++) this.dW.data[i] += dW.data[i];
    for (let i = 0; i < this.db.data.length; i++) this.db.data[i] += db.data[i];
    return dx;
  }

  params() {
    return [
      { id: `${this.id}.W`, param: this.W, grad: this.dW },
      { id: `${this.id}.b`, param: this.b, grad: this.db },
    ];
  }

  zeroGrad() { this.dW.data.fill(0); this.db.data.fill(0); }
}

// ── LayerNorm ─────────────────────────────────────────────────────────────────

class LayerNorm {
  constructor(dModel, id = 'ln') {
    this.dModel = dModel;
    this.id     = id;
    this.gamma  = Matrix.ones(1, dModel);
    this.beta   = Matrix.zeros(1, dModel);
    this.dGamma = Matrix.zeros(1, dModel);
    this.dBeta  = Matrix.zeros(1, dModel);
    this.eps    = 1e-5;
  }

  forward(x) {
    const { rows: T, cols: D } = x;
    const out = Matrix.zeros(T, D);
    this._mean = [];
    this._std  = [];
    this._xNorm = Matrix.zeros(T, D);

    for (let t = 0; t < T; t++) {
      let mean = 0;
      for (let d = 0; d < D; d++) mean += x.get(t, d);
      mean /= D;

      let variance = 0;
      for (let d = 0; d < D; d++) variance += (x.get(t, d) - mean) ** 2;
      variance /= D;

      const std = Math.sqrt(variance + this.eps);
      this._mean.push(mean);
      this._std.push(std);

      for (let d = 0; d < D; d++) {
        const xn = (x.get(t, d) - mean) / std;
        this._xNorm.set(t, d, xn);
        out.set(t, d, this.gamma.get(0, d) * xn + this.beta.get(0, d));
      }
    }
    this._x = x;
    return out;
  }

  backward(grad) {
    const { rows: T, cols: D } = grad;
    const dx = Matrix.zeros(T, D);

    for (let t = 0; t < T; t++) {
      const std = this._std[t];
      for (let d = 0; d < D; d++) {
        this.dGamma.add_at(0, d, grad.get(t, d) * this._xNorm.get(t, d));
        this.dBeta.add_at(0, d, grad.get(t, d));
      }

      let dxNormSum = 0, dxNormXnSum = 0;
      const dxNorm = new Float64Array(D);
      for (let d = 0; d < D; d++) {
        dxNorm[d] = grad.get(t, d) * this.gamma.get(0, d);
        dxNormSum    += dxNorm[d];
        dxNormXnSum  += dxNorm[d] * this._xNorm.get(t, d);
      }

      for (let d = 0; d < D; d++) {
        const val = (dxNorm[d] - dxNormSum / D - this._xNorm.get(t, d) * dxNormXnSum / D) / std;
        dx.set(t, d, val);
      }
    }

    return dx;
  }

  params() {
    return [
      { id: `${this.id}.gamma`, param: this.gamma, grad: this.dGamma },
      { id: `${this.id}.beta`,  param: this.beta,  grad: this.dBeta  },
    ];
  }

  zeroGrad() { this.dGamma.data.fill(0); this.dBeta.data.fill(0); }
}

// ── Multi-Head Causal Self-Attention ──────────────────────────────────────────

class MultiHeadAttention {
  constructor(dModel, nHeads, id = 'attn') {
    if (dModel % nHeads !== 0)
      throw new Error('dModel must be divisible by nHeads');
    this.dModel  = dModel;
    this.nHeads  = nHeads;
    this.headDim = dModel / nHeads;
    this.scale   = 1 / Math.sqrt(this.headDim);
    this.id      = id;

    this.Wq = new Linear(dModel, dModel, `${id}.Wq`);
    this.Wk = new Linear(dModel, dModel, `${id}.Wk`);
    this.Wv = new Linear(dModel, dModel, `${id}.Wv`);
    this.Wo = new Linear(dModel, dModel, `${id}.Wo`);
  }

  forward(x) {
    const T = x.rows;
    const D = this.dModel;
    const H = this.nHeads;
    const Dh = this.headDim;

    const Q = this.Wq.forward(x);
    const K = this.Wk.forward(x);
    const V = this.Wv.forward(x);

    this._Q = Q; this._K = K; this._V = V;
    this._T = T;

    const attnOut = Matrix.zeros(T, D);

    this._attnWeights = [];
    this._Vh = [];

    for (let h = 0; h < H; h++) {
      const qh = this._slice(Q, h, Dh);
      const kh = this._slice(K, h, Dh);
      const vh = this._slice(V, h, Dh);

      const scores = qh.matmul(kh.transpose()).scale(this.scale);
      this._causalMask(scores, T);
      const weights = scores.softmax();

      const headOut = weights.matmul(vh);

      for (let t = 0; t < T; t++)
        for (let d = 0; d < Dh; d++)
          attnOut.add_at(t, h * Dh + d, headOut.get(t, d));

      this._attnWeights.push(weights);
      this._Vh.push(vh);
    }

    this._attnOut = attnOut;
    return this.Wo.forward(attnOut);
  }

  _causalMask(scores, T) {
    for (let t = 0; t < T; t++)
      for (let s = t + 1; s < T; s++)
        scores.set(t, s, -1e9);
  }

  _slice(m, head, Dh) {
    const T = m.rows;
    const out = Matrix.zeros(T, Dh);
    const offset = head * Dh;
    for (let t = 0; t < T; t++)
      for (let d = 0; d < Dh; d++)
        out.set(t, d, m.get(t, offset + d));
    return out;
  }

  _writeSlice(dest, src, head, Dh) {
    const T = src.rows;
    const offset = head * Dh;
    for (let t = 0; t < T; t++)
      for (let d = 0; d < Dh; d++)
        dest.add_at(t, offset + d, src.get(t, d));
  }

  backward(grad) {
    const T = this._T;
    const H = this.nHeads;
    const Dh = this.headDim;

    const dAttnOut = this.Wo.backward(grad);

    const dQ = Matrix.zeros(T, this.dModel);
    const dK = Matrix.zeros(T, this.dModel);
    const dV = Matrix.zeros(T, this.dModel);

    for (let h = 0; h < H; h++) {
      const weights = this._attnWeights[h];
      const vh      = this._Vh[h];
      const dHead   = this._slice(dAttnOut, h, Dh);

      const dWeights = dHead.matmul(vh.transpose());
      const dVh = weights.transpose().matmul(dHead);
      const dScores = this._softmaxBackward(weights, dWeights);
      const dScoresScaled = dScores.scale(this.scale);

      const kh  = this._slice(this._K, h, Dh);
      const qh  = this._slice(this._Q, h, Dh);
      const dQh = dScoresScaled.matmul(kh);
      const dKh = dScoresScaled.transpose().matmul(qh);

      this._writeSlice(dQ, dQh, h, Dh);
      this._writeSlice(dK, dKh, h, Dh);
      this._writeSlice(dV, dVh, h, Dh);
    }

    const dx1 = this.Wq.backward(dQ);
    const dx2 = this.Wk.backward(dK);
    const dx3 = this.Wv.backward(dV);

    const dx = Matrix.zeros(T, this.dModel);
    for (let i = 0; i < dx.data.length; i++)
      dx.data[i] = dx1.data[i] + dx2.data[i] + dx3.data[i];
    return dx;
  }

  _softmaxBackward(s, ds) {
    const out = Matrix.zeros(s.rows, s.cols);
    for (let r = 0; r < s.rows; r++) {
      let dot = 0;
      for (let c = 0; c < s.cols; c++) dot += s.get(r, c) * ds.get(r, c);
      for (let c = 0; c < s.cols; c++)
        out.set(r, c, s.get(r, c) * (ds.get(r, c) - dot));
    }
    return out;
  }

  params() {
    return [
      ...this.Wq.params(),
      ...this.Wk.params(),
      ...this.Wv.params(),
      ...this.Wo.params(),
    ];
  }

  zeroGrad() {
    this.Wq.zeroGrad(); this.Wk.zeroGrad();
    this.Wv.zeroGrad(); this.Wo.zeroGrad();
  }
}

// ── Feed-Forward Network (2-layer with GELU-like activation) ──────────────────

class FeedForward {
  constructor(dModel, dFF, id = 'ff') {
    this.fc1 = new Linear(dModel, dFF,    `${id}.fc1`);
    this.fc2 = new Linear(dFF,    dModel, `${id}.fc2`);
  }

  _gelu(x) {
    return x.map(v =>
      0.5 * v * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (v + 0.044715 * v ** 3)))
    );
  }

  _geluGrad(x) {
    return x.map(v => {
      const c = Math.sqrt(2 / Math.PI);
      const t = Math.tanh(c * (v + 0.044715 * v ** 3));
      return 0.5 * (1 + t) + 0.5 * v * (1 - t * t) * c * (1 + 3 * 0.044715 * v ** 2);
    });
  }

  forward(x) {
    this._x   = x;
    this._h   = this.fc1.forward(x);
    this._act = this._gelu(this._h);
    return this.fc2.forward(this._act);
  }

  backward(grad) {
    const d2  = this.fc2.backward(grad);
    const dAct = d2.mul(this._geluGrad(this._h));
    return this.fc1.backward(dAct);
  }

  params() { return [...this.fc1.params(), ...this.fc2.params()]; }
  zeroGrad() { this.fc1.zeroGrad(); this.fc2.zeroGrad(); }
}

// ── Transformer Block ─────────────────────────────────────────────────────────

class TransformerBlock {
  constructor(dModel, nHeads, dFF, id = 'block') {
    this.attn = new MultiHeadAttention(dModel, nHeads, `${id}.attn`);
    this.ff   = new FeedForward(dModel, dFF, `${id}.ff`);
    this.ln1  = new LayerNorm(dModel, `${id}.ln1`);
    this.ln2  = new LayerNorm(dModel, `${id}.ln2`);
  }

  forward(x) {
    this._x1 = x;
    const a  = x.add(this.attn.forward(this.ln1.forward(x)));
    this._x2 = a;
    return a.add(this.ff.forward(this.ln2.forward(a)));
  }

  backward(grad) {
    const dLn2 = this.ff.backward(grad);
    const dA   = grad.add(this.ln2.backward(dLn2));

    const dLn1 = this.attn.backward(dA);
    return dA.add(this.ln1.backward(dLn1));
  }

  params() {
    return [
      ...this.attn.params(),
      ...this.ff.params(),
      ...this.ln1.params(),
      ...this.ln2.params(),
    ];
  }

  zeroGrad() {
    this.attn.zeroGrad(); this.ff.zeroGrad();
    this.ln1.zeroGrad();  this.ln2.zeroGrad();
  }
}

// ── Full Language Model ───────────────────────────────────────────────────────

class LanguageModel {
  /**
   * @param {object} cfg
   * @param {number} cfg.vocabSize  - Tokenizer vocab size
   * @param {number} cfg.dModel     - Embedding / hidden dim   (e.g. 128)
   * @param {number} cfg.nHeads     - Attention heads          (e.g. 4)
   * @param {number} cfg.nLayers    - Transformer blocks       (e.g. 4)
   * @param {number} cfg.dFF        - Feed-forward inner dim   (e.g. 512)
   * @param {number} cfg.maxLen     - Max sequence length      (e.g. 128)
   */
  constructor(cfg) {
    this.cfg = cfg;
    const { vocabSize, dModel, nHeads, nLayers, dFF, maxLen } = cfg;

    this.embedding = new Embedding(vocabSize, dModel);
    this.posEnc    = buildPosEncoding(maxLen, dModel);
    this.blocks    = Array.from({ length: nLayers },
      (_, i) => new TransformerBlock(dModel, nHeads, dFF, `block${i}`)
    );
    this.lnFinal   = new LayerNorm(dModel, 'lnFinal');
    this.lmHead    = new Linear(dModel, vocabSize, 'lmHead');
  }

  // ids: integer array of length T
  // returns logits Matrix (T, vocabSize)
  forward(ids) {
    const T = ids.length;

    let x = this.embedding.forward(ids);
    for (let t = 0; t < T; t++)
      for (let d = 0; d < this.cfg.dModel; d++)
        x.add_at(t, d, this.posEnc.get(t, d));

    this._xAfterEmb = x;

    for (const block of this.blocks) x = block.forward(x);

    this._xFinal = x;
    const normed = this.lnFinal.forward(x);
    return this.lmHead.forward(normed);
  }

  // ── UPDATED: Cross-entropy loss + backward (with masking for [USR]/[BOT]) ──
  // logits: (T, V),  targets: int array of length T
  // mask: optional array of 0s and 1s (same length as targets)
  //       1 = learn from this position, 0 = skip (user messages + markers)
  // returns { loss, grad }
  computeLoss(logits, targets, mask = null) {
    const T = logits.rows;
    const V = logits.cols;
    const probs = logits.softmax(); // (T, V)

    let loss = 0;
    let countedTokens = 0;

    for (let t = 0; t < T; t++) {
      // Skip masked positions (user messages and markers)
      if (mask && mask[t] === 0) continue;

      const tgt = targets[t];
      loss -= Math.log(probs.get(t, tgt) + 1e-10);
      countedTokens++;
    }

    if (countedTokens === 0) {
      return { 
        loss: 0, 
        dLogits: Matrix.zeros(T, V) 
      };
    }

    loss /= countedTokens;

    // dLogits = probs, then subtract 1 at target positions (only for non-masked)
    const dLogits = probs.clone();
    for (let t = 0; t < T; t++) {
      if (mask && mask[t] === 0) {
        // Zero out the gradient for this position entirely
        for (let v = 0; v < V; v++) {
          dLogits.set(t, v, 0);
        }
      } else {
        const tgt = targets[t];
        dLogits.add_at(t, tgt, -1);
      }
    }

    // Scale by 1/countedTokens
    for (let i = 0; i < dLogits.data.length; i++) {
      dLogits.data[i] /= countedTokens;
    }

    return { loss, dLogits };
  }

  backward(dLogits) {
    let grad = this.lmHead.backward(dLogits);
    grad = this.lnFinal.backward(grad);

    for (let i = this.blocks.length - 1; i >= 0; i--)
      grad = this.blocks[i].backward(grad);

    this.embedding.backward(grad);
  }

  params() {
    const p = [...this.embedding.params()];
    for (const block of this.blocks) p.push(...block.params());
    p.push(...this.lnFinal.params(), ...this.lmHead.params());
    return p;
  }

  zeroGrad() {
    this.embedding.zeroGrad();
    for (const block of this.blocks) block.zeroGrad();
    this.lnFinal.zeroGrad();
    this.lmHead.zeroGrad();
  }

  paramCount() {
    return this.params().reduce((s, p) => s + p.param.data.length, 0);
  }

  // ── Text Generation (with repetition penalty + EOS stopping) ─────────────────

  /**
   * Generate text given a prompt (integer id array).
   * @param {number[]} prompt     - Starting token ids
   * @param {number}   maxNew     - How many new tokens to generate
   * @param {number}   temperature - Sampling temperature (0 = greedy)
   * @param {number}   topK       - Top-k sampling (0 = no filter)
   * @param {number}   repetitionPenalty - Penalize repeated tokens (>1 = penalize)
   * @returns {number[]} - New token ids (not including prompt)
   */
  generate(prompt, maxNew = 100, temperature = 0.8, topK = 40, repetitionPenalty = 1.15) {
    const ids = [...prompt];
    const maxLen = this.cfg.maxLen;

    for (let step = 0; step < maxNew; step++) {
      const ctx = ids.slice(-maxLen);
      const logits = this.forward(ctx);
      const T = ctx.length;
      const lastLogits = new Float64Array(this.cfg.vocabSize);
      
      for (let v = 0; v < this.cfg.vocabSize; v++) {
        lastLogits[v] = logits.get(T - 1, v);
      }

      // ── Repetition penalty: push down recently used tokens ──
      if (repetitionPenalty > 1.0) {
        const penaltyWindow = Math.min(30, ctx.length);
        const recentTokens = new Set(ctx.slice(-penaltyWindow));
        for (const token of recentTokens) {
          if (token < lastLogits.length) {
            // If logit is positive, divide by penalty; if negative, multiply
            if (lastLogits[token] > 0) {
              lastLogits[token] /= repetitionPenalty;
            } else {
              lastLogits[token] *= repetitionPenalty;
            }
          }
        }
      }

      const nextId = temperature === 0
        ? argmax(lastLogits)
        : sampleTopK(lastLogits, temperature, topK);

      // ── Stop on EOS token ──────────────────────────────────
      if (nextId === 3) break; // EOS = 3

      ids.push(nextId);
    }

    return ids.slice(prompt.length);
  }

  serialize() {
    const weights = {};
    for (const { id, param } of this.params())
      weights[id] = { rows: param.rows, cols: param.cols, data: Array.from(param.data) };
    return JSON.stringify({ cfg: this.cfg, weights });
  }

  static deserialize(json) {
    const { cfg, weights } = JSON.parse(json);
    const model = new LanguageModel(cfg);
    for (const { id, param } of model.params()) {
      if (weights[id]) {
        const w = weights[id];
        param.data.set(w.data);
      }
    }
    return model;
  }
}

// ── Sampling helpers ───────────────────────────────────────────────────────────

function argmax(arr) {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

function sampleTopK(logits, temperature, k) {
  const scaled = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) scaled[i] = logits[i] / temperature;

  let max = -Infinity;
  for (const v of scaled) if (v > max) max = v;
  let sum = 0;
  const probs = new Float64Array(scaled.length);
  for (let i = 0; i < scaled.length; i++) { probs[i] = Math.exp(scaled[i] - max); sum += probs[i]; }
  for (let i = 0; i < probs.length; i++) probs[i] /= sum;

  if (k > 0 && k < probs.length) {
    const indexed = Array.from(probs).map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    for (let i = k; i < indexed.length; i++) probs[indexed[i][1]] = 0;
    let s2 = 0; for (const v of probs) s2 += v;
    for (let i = 0; i < probs.length; i++) probs[i] /= s2;
  }

  let r = Math.random(), cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (r < cum) return i;
  }
  return probs.length - 1;
}

module.exports = { LanguageModel, Embedding, Linear, LayerNorm, MultiHeadAttention, FeedForward, TransformerBlock };
