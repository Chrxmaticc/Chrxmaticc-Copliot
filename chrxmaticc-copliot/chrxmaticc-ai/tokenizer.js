// chrxmaticc-ai/tokenizer.js
// Standalone JS tokenizer for quick inference without loading full model

var fs = require('fs');
var path = require('path');

var vocab = null;
var specialTokens = null;

function loadTokenizer() {
  var data = JSON.parse(fs.readFileSync(path.join(__dirname, 'export', 'tokenizer.json'), 'utf8'));
  if (data.model && data.model.vocab) {
    vocab = data.model.vocab;
    specialTokens = {
      pad: data.model.special_tokens?.['<pad>'] ?? vocab['<pad>'] ?? 0,
      bos: data.model.special_tokens?.['<s>'] ?? vocab['<s>'] ?? 1,
      eos: data.model.special_tokens?.['</s>'] ?? vocab['</s>'] ?? 2,
      unk: data.model.special_tokens?.['<unk>'] ?? vocab['<unk>'] ?? 3,
    };
  } else if (data.wordToId) {
    vocab = data.wordToId;
    specialTokens = {
      pad: data.wordToId['<pad>'] || 0,
      bos: data.wordToId['<s>'] || 1,
      eos: data.wordToId['</s>'] || 2,
      unk: data.wordToId['<unk>'] || 3,
    };
  } else {
    throw new Error('Unsupported tokenizer format');
  }
  return true;
}

function encode(text) {
  if (!vocab) loadTokenizer();
  var tokens = [specialTokens.bos];
  var words = text.match(/\S+/g) || [];
  for (var w of words) {
    if (vocab[w] !== undefined) tokens.push(vocab[w]);
    else tokens.push(specialTokens.unk);
  }
  return tokens;
}

function decode(tokens) {
  if (!vocab) loadTokenizer();
  var reverseVocab = {};
  for (var word in vocab) reverseVocab[vocab[word]] = word;
  return tokens.map(function(t) { return reverseVocab[t] || ''; }).join(' ').trim();
}

module.exports = { loadTokenizer, encode, decode };
