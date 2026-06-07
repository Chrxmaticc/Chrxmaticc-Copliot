# chrxmaticc-ai/tokenizer.py
# Word-level tokenizer — mirrors tokenizer.js
# Used during training on Colab/GPU

import json
import re

class Tokenizer:
    def __init__(self):
        self.word_to_id = {}
        self.id_to_word = {}
        self.vocab_size = 0
        
        self.PAD = 0
        self.UNK = 1
        self.BOS = 2
        self.EOS = 3
        
        self._add_special('<PAD>')
        self._add_special('<UNK>')
        self._add_special('<BOS>')
        self._add_special('<EOS>')
    
    def _add_special(self, token):
        if token not in self.word_to_id:
            self.word_to_id[token] = self.vocab_size
            self.id_to_word[self.vocab_size] = token
            self.vocab_size += 1
    
    def _add_word(self, word):
        if word not in self.word_to_id:
            self.word_to_id[word] = self.vocab_size
            self.id_to_word[self.vocab_size] = word
            self.vocab_size += 1
    
    def build_vocab(self, texts):
        """Build vocabulary from list of text strings"""
        all_words = set()
        for text in texts:
            tokens = re.findall(r'\S+', text)
            all_words.update(tokens)
        
        for word in sorted(all_words):
            self._add_word(word)
        
        print(f'[Tokenizer] Vocab size: {self.vocab_size} words')
    
    def encode(self, text, add_bos=False, add_eos=False):
        tokens = re.findall(r'\S+', text)
        ids = []
        if add_bos:
            ids.append(self.BOS)
        for token in tokens:
            ids.append(self.word_to_id.get(token, self.UNK))
        if add_eos:
            ids.append(self.EOS)
        return ids
    
    def decode(self, ids):
        words = []
        for id_ in ids:
            word = self.id_to_word.get(id_, '')
            if not word or word.startswith('<'):
                continue
            words.append(word)
        return ' '.join(words)
    
    def make_chunks(self, text, seq_len, step=None):
        """Split text into training chunks"""
        if step is None:
            step = seq_len
        ids = self.encode(text)
        chunks = []
        for i in range(0, len(ids) - seq_len, step):
            chunks.append({
                'input': ids[i:i + seq_len],
                'target': ids[i + 1:i + seq_len + 1]
            })
        return chunks
    
    def build_mask(self, target_ids):
        """Only train on [BOT] responses, skip [USR] messages"""
        text = self.decode(target_ids)
        mask = []
        inside_bot = False
        words = text.split()
        
        for w in words:
            if w == '[USR]':
                inside_bot = False
                mask.append(0)
                continue
            if w == '[/USR]':
                mask.append(0)
                continue
            if w == '[BOT]':
                inside_bot = True
                mask.append(0)
                continue
            if w == '[/BOT]':
                inside_bot = False
                mask.append(0)
                continue
            mask.append(1 if inside_bot else 0)
        
        while len(mask) < len(target_ids):
            mask.append(0)
        return mask[:len(target_ids)]
    
    def save(self, path):
        """Export tokenizer to JSON (compatible with JS Tokenizer.deserialize)"""
        data = {
            'wordToId': self.word_to_id,
            'idToWord': {str(k): v for k, v in self.id_to_word.items()},
            'vocabSize': self.vocab_size
        }
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'[Tokenizer] Saved to {path}')
    
    @classmethod
    def load(cls, path):
        """Load tokenizer from JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        t = cls()
        t.word_to_id = data['wordToId']
        t.id_to_word = {int(k): v for k, v in data['idToWord'].items()}
        t.vocab_size = data['vocabSize']
        print(f'[Tokenizer] Loaded — vocab size: {t.vocab_size}')
        return t
