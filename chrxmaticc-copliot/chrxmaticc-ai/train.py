# chrxmaticc-ai/train.py
# ╔══════════════════════════════════════════╗
# ║  Chrxmaticc Intelligence — Training      ║
# ║  Pure PyTorch • Word-Level • [BOT] Mask  ║
# ║  Author: Chrxmee-Midnightt              ║
# ╚══════════════════════════════════════════╝

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from tokenizer import Tokenizer
import json, os, math, random
from pathlib import Path

# ═══════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════
CONFIG = {
    "d_model": 256,
    "n_heads": 8,
    "n_layers": 6,
    "d_ff": 768,
    "max_len": 256,
    "dropout": 0.1,
    "batch_size": 32,
    "learning_rate": 3e-4,
    "min_lr": 1e-5,
    "warmup_steps": 400,
    "grad_accum_steps": 2,
    "weight_decay": 0.01,
    "epochs": 30,
    "train_split": 0.9,
}

# ═══════════════════════════════════════════
#  MODEL
# ═══════════════════════════════════════════

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=256):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]


class TransformerBlock(nn.Module):
    def __init__(self, d_model, n_heads, d_ff, dropout=0.1):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, n_heads, dropout=dropout, batch_first=True)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout),
        )
        self.ln1 = nn.LayerNorm(d_model)
        self.ln2 = nn.LayerNorm(d_model)

    def forward(self, x, mask=None):
        attn_out, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), attn_mask=mask)
        x = x + attn_out
        x = x + self.ffn(self.ln2(x))
        return x


class ChrxmaticcModel(nn.Module):
    def __init__(self, vocab_size, config):
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(vocab_size, config["d_model"])
        self.pos_enc = PositionalEncoding(config["d_model"], config["max_len"])
        self.dropout = nn.Dropout(config["dropout"])
        
        self.blocks = nn.ModuleList([
            TransformerBlock(config["d_model"], config["n_heads"], config["d_ff"], config["dropout"])
            for _ in range(config["n_layers"])
        ])
        
        self.ln_final = nn.LayerNorm(config["d_model"])
        self.lm_head = nn.Linear(config["d_model"], vocab_size)
        
        # Weight tying
        self.lm_head.weight = self.embedding.weight
        
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def _causal_mask(self, sz):
        return torch.triu(torch.ones(sz, sz) * float('-inf'), diagonal=1)

    def forward(self, input_ids):
        B, T = input_ids.shape
        x = self.embedding(input_ids)
        x = self.pos_enc(x)
        x = self.dropout(x)
        
        mask = self._causal_mask(T).to(input_ids.device)
        
        for block in self.blocks:
            x = block(x, mask)
        
        x = self.ln_final(x)
        return self.lm_head(x)


# ═══════════════════════════════════════════
#  DATASET
# ═══════════════════════════════════════════

class ConversationDataset(Dataset):
    def __init__(self, data_paths, tokenizer, max_len=256):
        self.tokenizer = tokenizer
        self.max_len = max_len
        self.chunks = []
        
        for path in data_paths:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for convo in data:
                text = f"<BOS>[USR] {convo['user']} [/USR] [BOT] {convo['assistant']} [/BOT]<EOS>"
                chunks = tokenizer.make_chunks(text, max_len)
                self.chunks.extend(chunks)
        
        print(f' Loaded {len(self.chunks)} training chunks from {len(data_paths)} files')

    def __len__(self):
        return len(self.chunks)

    def __getitem__(self, idx):
        chunk = self.chunks[idx]
        input_ids = chunk['input']
        target_ids = chunk['target']
        
        pad_len = self.max_len - len(input_ids)
        input_ids = input_ids + [0] * pad_len
        target_ids = target_ids + [0] * pad_len
        
        mask = self.tokenizer.build_mask(target_ids)
        mask = mask + [0] * pad_len
        
        return {
            'input_ids': torch.tensor(input_ids, dtype=torch.long),
            'target_ids': torch.tensor(target_ids, dtype=torch.long),
            'mask': torch.tensor(mask, dtype=torch.float),
        }


# ═══════════════════════════════════════════
#  TRAINING
# ═══════════════════════════════════════════

def train():
    config = CONFIG
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f' Device: {device}')
    
    # Load data
    data_dir = Path("data")
    data_files = list(data_dir.glob("*.json"))
    
    if not data_files:
        print(' No .json files in data/ — add conversations to train')
        return
    
    # Build or load tokenizer
    tokenizer_path = Path("export/tokenizer.json")
    if tokenizer_path.exists():
        tokenizer = Tokenizer.load(str(tokenizer_path))
    else:
        texts = []
        for f in data_files:
            with open(f, 'r') as fp:
                for c in json.load(fp):
                    texts.append(f"<BOS>[USR] {c['user']} [/USR] [BOT] {c['assistant']} [/BOT]<EOS>")
        tokenizer = Tokenizer()
        tokenizer.build_vocab(texts)
        os.makedirs("export", exist_ok=True)
        tokenizer.save(str(tokenizer_path))
    
    # Dataset
    full_dataset = ConversationDataset([str(f) for f in data_files], tokenizer, config["max_len"])
    
    split = int(len(full_dataset) * config["train_split"])
    train_dataset, val_dataset = torch.utils.data.random_split(
        full_dataset, [split, len(full_dataset) - split]
    )
    
    train_loader = DataLoader(train_dataset, batch_size=config["batch_size"], shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=config["batch_size"], shuffle=False, num_workers=0)
    
    # Model
    model = ChrxmaticcModel(tokenizer.vocab_size, config).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f' Params: {total_params:,} ({total_params/1e6:.1f}M)')
    
    # Optimizer
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config["learning_rate"],
        weight_decay=config["weight_decay"],
        betas=(0.9, 0.95),
    )
    
    total_steps = (len(train_loader) // config["grad_accum_steps"]) * config["epochs"]
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=config["learning_rate"],
        total_steps=total_steps,
        pct_start=config["warmup_steps"] / total_steps if total_steps > 0 else 0.1,
    )
    
    # Training loop
    best_val_loss = float('inf')
    os.makedirs("export", exist_ok=True)
    
    for epoch in range(config["epochs"]):
        model.train()
        total_loss = 0
        optimizer.zero_grad()
        
        for step, batch in enumerate(train_loader):
            input_ids = batch['input_ids'].to(device)
            target_ids = batch['target_ids'].to(device)
            mask = batch['mask'].to(device)
            
            logits = model(input_ids)
            
            # Compute masked loss
            shift_logits = logits[:, :-1, :].contiguous()
            shift_targets = target_ids[:, 1:].contiguous()
            shift_mask = mask[:, 1:].contiguous()
            
            loss = F.cross_entropy(
                shift_logits.view(-1, tokenizer.vocab_size),
                shift_targets.view(-1),
                reduction='none',
            )
            loss = (loss * shift_mask.view(-1)).sum() / (shift_mask.sum() + 1e-10)
            loss = loss / config["grad_accum_steps"]
            loss.backward()
            
            total_loss += loss.item()
            
            if (step + 1) % config["grad_accum_steps"] == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
            
            if step % 50 == 0:
                print(f'  Epoch {epoch+1}/{config["epochs"]} | Step {step} | Loss {loss.item()*config["grad_accum_steps"]:.4f}')
        
        avg_train_loss = total_loss / len(train_loader) * config["grad_accum_steps"]
        
        # Validation
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                target_ids = batch['target_ids'].to(device)
                mask = batch['mask'].to(device)
                
                logits = model(input_ids)
                shift_logits = logits[:, :-1, :].contiguous()
                shift_targets = target_ids[:, 1:].contiguous()
                shift_mask = mask[:, 1:].contiguous()
                
                loss = F.cross_entropy(
                    shift_logits.view(-1, tokenizer.vocab_size),
                    shift_targets.view(-1),
                    reduction='none',
                )
                val_loss += (loss * shift_mask.view(-1)).sum().item() / (shift_mask.sum() + 1e-10)
        
        avg_val_loss = val_loss / len(val_loader)
        print(f' Epoch {epoch+1} — Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}')
        
        # Save best
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'loss': avg_val_loss,
                'config': config,
                'vocab_size': tokenizer.vocab_size,
            }, 'export/model.pt')
            print(f' Saved best model (val loss: {avg_val_loss:.4f})')
    
    print(f'\n Training complete! Best val loss: {best_val_loss:.4f}')
    print(f' Model → export/model.pt')
    print(f' Tokenizer → export/tokenizer.json')


if __name__ == "__main__":
    train()
