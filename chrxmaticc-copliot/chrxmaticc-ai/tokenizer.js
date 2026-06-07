// chrxmaticc-ai/tokenizer.js
// Standalone JS tokenizer for quick inference without loading full model

var fs = require('fs');
var path = require('path');

var vocab = null;
var specialTokens = null;

function loadTokenizer() {
  var data = JSON.parse(fs.readFileSync(path.join(__dirname, 'export', 'tokenizer.json'), 'utf8'));
  vocab = data.model.vocab;
  specialTokens = {
    pad: vocab['<pad>'] || 0,
    bos: vocab['<s>'] || 1,
    eos: vocab['</s>'] || 2,
    unk: vocab['<unk>'] || 3,
  };
  return true;
}

function encode(text) {
  if (!vocab) loadTokenizer();
  var tokens = [specialTokens.bos];
  var words = text.toLowerCase().split(/(\s+)/);
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
  return tokens.map(function(t) { return reverseVocab[t] || ''; }).join('');
}

module.exports = { loadTokenizer, encode, decode };
