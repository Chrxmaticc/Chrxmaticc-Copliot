// chrxmaticc-ai/model.js
// Load trained Chrxmaticc model in Node.js for inference
var tf = require('@tensorflow/tfjs-node');
var fs = require('fs');
var path = require('path');

var model = null;
var config = null;
var tokenizer = null;

async function loadModel() {
  var exportDir = path.join(__dirname, 'export');
  
  // Load config
  config = JSON.parse(fs.readFileSync(path.join(exportDir, 'model_config.json'), 'utf8'));
  
  // Build the same architecture in TF.js
  var input = tf.input({ shape: [config.max_seq_len], dtype: 'int32' });
  
  var embed = tf.layers.embedding({
    inputDim: config.vocab_size,
    outputDim: config.hidden_dim,
    embeddingsInitializer: 'randomNormal',
  }).apply(input);
  
  var x = embed;
  
  for (var i = 0; i < config.num_layers; i++) {
    var norm1 = tf.layers.layerNormalization({ epsilon: 1e-6 }).apply(x);
    var attn = tf.layers.multiHeadAttention({
      numHeads: config.num_heads,
      keyDim: config.head_dim,
      dropout: config.dropout,
    }).apply(norm1, norm1);
    x = tf.layers.add().apply([x, attn]);
    
    var norm2 = tf.layers.layerNormalization({ epsilon: 1e-6 }).apply(x);
    var ffn = tf.layers.dense({ units: config.hidden_dim * config.ff_multiplier, activation: 'silu' }).apply(norm2);
    ffn = tf.layers.dense({ units: config.hidden_dim }).apply(ffn);
    ffn = tf.layers.dropout({ rate: config.dropout }).apply(ffn);
    x = tf.layers.add().apply([x, ffn]);
  }
  
  x = tf.layers.layerNormalization({ epsilon: 1e-6 }).apply(x);
  var output = tf.layers.dense({ units: config.vocab_size }).apply(x);
  
  model = tf.model({ inputs: input, outputs: output });
  
  // Load trained weights
  var weights = JSON.parse(fs.readFileSync(path.join(exportDir, 'model_weights.json'), 'utf8'));
  var weightTensors = [];
  for (var name in weights) {
    weightTensors.push(tf.tensor(weights[name]));
  }
  model.setWeights(weightTensors);
  
  // Load tokenizer
  tokenizer = JSON.parse(fs.readFileSync(path.join(exportDir, 'tokenizer.json'), 'utf8'));
  
  console.log('Chrxmaticc Intelligence model loaded');
  return true;
}

async function generate(prompt, maxTokens, temperature) {
  if (!model) throw new Error('Model not loaded');
  
  maxTokens = maxTokens || 100;
  temperature = temperature || 0.8;
  
  // Tokenize input (simple BPE simulation)
  var tokens = tokenize(prompt);
  var generated = tokens.slice();
  
  for (var i = 0; i < maxTokens; i++) {
    var inputTensor = tf.tensor2d([generated.slice(-config.max_seq_len)], [1, Math.min(generated.length, config.max_seq_len)], 'int32');
    var logits = model.predict(inputTensor);
    var nextLogits = logits.slice([0, logits.shape[1] - 1, 0], [1, 1, config.vocab_size]);
    
    // Temperature sampling
    nextLogits = tf.div(nextLogits, temperature);
    var probs = tf.softmax(nextLogits);
    var nextToken = tf.multinomial(probs.flatten(), 1).dataSync()[0];
    
    generated.push(nextToken);
    inputTensor.dispose();
    logits.dispose();
    probs.dispose();
    
    if (nextToken === tokenizer.special_tokens['</s>']) break;
  }
  
  return detokenize(generated);
}

function tokenize(text) {
  // Simplified — uses the tokenizer.json vocab
  var tokens = [];
  var words = text.toLowerCase().split(/(\s+)/);
  for (var w of words) {
    if (tokenizer.vocab[w]) tokens.push(tokenizer.vocab[w]);
    else tokens.push(0); // UNK
  }
  return [tokenizer.special_tokens['<s>']].concat(tokens);
}

function detokenize(tokens) {
  var reverseVocab = {};
  for (var word in tokenizer.vocab) {
    reverseVocab[tokenizer.vocab[word]] = word;
  }
  return tokens.map(function(t) { return reverseVocab[t] || ''; }).join('').replace(/<s>/g, '').replace(/<\/s>/g, '').replace(/<pad>/g, '').trim();
}

module.exports = { loadModel, generate, tokenize, detokenize };
