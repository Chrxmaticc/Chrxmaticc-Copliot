# chrxmaticc-ai/train.py
# ╔══════════════════════════════════════════╗
# ║  Chrxmaticc Intelligence — Training      ║
# ║  Creative Architecture • Multi-Head      ║
# ║  Author: Chrxmee-Midnightt              ║
# ╚══════════════════════════════════════════╝

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from tokenizers import Tokenizer, models, trainers, pre_tokenizers
from transformers import get_cosine_schedule_with_warmup
import json, os, math, random
from pathlib import Path

# ═══════════════════════════════════════════
#  CONFIG — Tweak these
# ═══════════════════════════════════════════
CONFIG = {
    "vocab_size": 16384,
    "hidden_dim": 512,
    "num_layers": 8,
    "num_heads": 8,
    "head_dim": 64,
    "ff_multiplier": 3,        # 3x hidden_dim for FFN (richer than standard 4x but faster)
    "max_seq_len": 2048,
    "dropout": 0.08,
    "batch_size": 16,
    "learning_rate": 3e-4,
    "min_lr": 1e-5,
    "warmup_steps": 500,
    "grad_accum_steps": 4,     # Effective batch = 16 * 4 = 64
    "weight_decay": 0.01,
    "epochs": 20,
    "use_flash_attn": False,   # Set True if you have flash-attn installed
}

# ═══════════════════════════════════════════
#  CREATIVE ARCHITECTURE
# ═══════════════════════════════════════════

class RotaryEmbedding(nn.Module):
    """RoPE — Rotary Position Embeddings for better sequence handling"""
    def __init__(self, dim, max_seq_len=2048):
        super().__init__()
        inv_freq = 1.0 / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        t = torch.arange(max_seq_len).float()
        freqs = torch.einsum('i,j->ij', t, inv_freq)
        self.register_buffer('cos', freqs.cos())
        self.register_buffer('sin', freqs.sin())

    def forward(self, x, offset=0):
        seq_len = x.shape[1]
        cos = self.cos[offset:offset+seq_len].unsqueeze(0).unsqueeze(2)
        sin = self.sin[offset:offset+seq_len].unsqueeze(0).unsqueeze(2)
        return cos, sin

def rotate_half(x):
    x1, x2 = x[..., :x.shape[-1]//2], x[..., x.shape[-1]//2:]
    return torch.cat([-x2, x1], dim=-1)

def apply_rotary(q, k, cos, sin):
    return (q * cos) + (rotate_half(q) * sin), (k * cos) + (rotate_half(k) * sin)


class SwiGLU(nn.Module):
    """SwiGLU activation — better than GELU for language modeling"""
    def forward(self, x):
        x, gate = x.chunk(2, dim=-1)
        return F.silu(gate) * x


class CreativeAttention(nn.Module):
    """Multi-Head Attention with RoPE, creative bias, and optional flash"""
    def __init__(self, dim, num_heads, head_dim, dropout=0.08):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = head_dim
        self.inner_dim = num_heads * head_dim
        
        self.q_proj = nn.Linear(dim, self.inner_dim, bias=False)
        self.k_proj = nn.Linear(dim, self.inner_dim, bias=False)
        self.v_proj = nn.Linear(dim, self.inner_dim, bias=False)
        self.out_proj = nn.Linear(self.inner_dim, dim, bias=False)
        
        self.rotary = RotaryEmbedding(head_dim, 2048)
        self.dropout = nn.Dropout(dropout)
        
        # Creative addition: learnable attention temperature per head
        self.temperature = nn.Parameter(torch.ones(num_heads, 1, 1) * math.sqrt(head_dim))

    def forward(self, x, mask=None):
        B, T, C = x.shape
        
        q = self.q_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        
        cos, sin = self.rotary(x)
        q, k = apply_rotary(q, k, cos, sin)
        
        attn = (q @ k.transpose(-2, -1)) / self.temperature
        
        if mask is not None:
            attn = attn.masked_fill(mask == 0, float('-inf'))
        
        attn = F.softmax(attn, dim=-1)
        attn = self.dropout(attn)
        
        out = attn @ v
        out = out.transpose(1, 2).contiguous().view(B, T, self.inner_dim)
        return self.out_proj(out)


class CreativeTransformerBlock(nn.Module):
    """Transformer block with pre-norm, SwiGLU, and creative attention"""
    def __init__(self, dim, num_heads, head_dim, ff_multiplier, dropout=0.08):
        super().__init__()
        self.norm1 = nn.RMSNorm(dim)
        self.attention = CreativeAttention(dim, num_heads, head_dim, dropout)
        
        self.norm2 = nn.RMSNorm(dim)
        ffn_dim = int(dim * ff_multiplier)
        self.ffn = nn.Sequential(
            nn.Linear(dim, ffn_dim * 2, bias=False),  # *2 for SwiGLU gate
            SwiGLU(),
            nn.Linear(ffn_dim, dim, bias=False),
            nn.Dropout(dropout),
        )
        
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, mask=None):
        x = x + self.dropout(self.attention(self.norm1(x), mask))
        x = x + self.ffn(self.norm2(x))
        return x


class ChrxmaticcModel(nn.Module):
    """The full Chrxmaticc Intelligence model"""
    def __init__(self, config):
        super().__init__()
        self.config = config
        
        self.token_embed = nn.Embedding(config["vocab_size"], config["hidden_dim"])
        self.dropout = nn.Dropout(config["dropout"])
        
        self.layers = nn.ModuleList([
            CreativeTransformerBlock(
                config["hidden_dim"],
                config["num_heads"],
                config["head_dim"],
                config["ff_multiplier"],
                config["dropout"],
            ) for _ in range(config["num_layers"])
        ])
        
        self.final_norm = nn.RMSNorm(config["hidden_dim"])
        self.lm_head = nn.Linear(config["hidden_dim"], config["vocab_size"], bias=False)
        
        # Tie weights
        self.token_embed.weight = self.lm_head.weight
        
        # Creative: learnable output blending — model learns to mix layers
        self.layer_weights = nn.Parameter(torch.ones(config["num_layers"]) / config["num_layers"])
        
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, input_ids, attention_mask=None, labels=None):
        B, T = input_ids.shape
        
        x = self.token_embed(input_ids)
        x = self.dropout(x)
        
        if attention_mask is not None:
            mask = attention_mask[:, None, None, :]
        else:
            mask = None
        
        # Layer blending — each layer contributes a weighted amount
        layer_outputs = []
        for layer in self.layers:
            x = layer(x, mask)
            layer_outputs.append(x)
        
        # Weighted sum of all layer outputs
        weights = F.softmax(self.layer_weights, dim=0)
        blended = sum(w * out for w, out in zip(weights, layer_outputs))
        
        x = self.final_norm(blended)
        logits = self.lm_head(x)
        
        loss = None
        if labels is not None:
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            loss = F.cross_entropy(
                shift_logits.view(-1, shift_logits.size(-1)),
                shift_labels.view(-1),
            )
        
        return {"loss": loss, "logits": logits}


# ═══════════════════════════════════════════
#  TOKENIZER
# ═══════════════════════════════════════════
def train_tokenizer(data_files, vocab_size=16384):
    """Train a BPE tokenizer on your data"""
    tokenizer = Tokenizer(models.BPE())
    tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    
    trainer = trainers.BpeTrainer(
        vocab_size=vocab_size,
        special_tokens=["<pad>", "<s>", "</s>", "<unk>", "<mask>"],
        show_progress=True,
    )
    
    tokenizer.train(files=data_files, trainer=trainer)
    
    os.makedirs("export", exist_ok=True)
    tokenizer.save("export/tokenizer.json")
    print(f" Tokenizer saved — vocab size: {tokenizer.get_vocab_size()}")
    return tokenizer


# ═══════════════════════════════════════════
#  DATASET
# ═══════════════════════════════════════════
class ConversationDataset(Dataset):
    def __init__(self, data_paths, tokenizer, max_len=2048):
        self.tokenizer = tokenizer
        self.max_len = max_len
        self.samples = []
        
        for path in data_paths:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for convo in data:
                text = f"<s>{convo['user']}</s><s>{convo['assistant']}</s>"
                encoded = tokenizer.encode(text)
                if len(encoded.ids) <= max_len:
                    self.samples.append(encoded.ids)
        
        print(f" Loaded {len(self.samples)} samples")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        ids = self.samples[idx]
        pad_len = self.max_len - len(ids)
        
        input_ids = ids + [0] * pad_len
        labels = ids + [0] * pad_len
        attention_mask = [1] * len(ids) + [0] * pad_len
        
        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
            "attention_mask": torch.tensor(attention_mask, dtype=torch.long),
        }


# ═══════════════════════════════════════════
#  TRAINING LOOP
# ═══════════════════════════════════════════
def train():
    config = CONFIG
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f" Using device: {device}")
    
    # Find data files
    data_dir = Path("data")
    data_files = list(data_dir.glob("*.json"))
    
    if not data_files:
        print(" No training data found in data/")
        print(" Add .json files with format: [{\"user\": \"...\", \"assistant\": \"...\"}]")
        return
    
    # Train or load tokenizer
    tokenizer_path = Path("export/tokenizer.json")
    if tokenizer_path.exists():
        from tokenizers import Tokenizer as TokLoader
        tokenizer = TokLoader.from_file(str(tokenizer_path))
        print(" Loaded existing tokenizer")
    else:
        tokenizer = train_tokenizer([str(f) for f in data_files], config["vocab_size"])
    
    # Dataset
    dataset = ConversationDataset([str(f) for f in data_files], tokenizer, config["max_seq_len"])
    dataloader = DataLoader(
        dataset,
        batch_size=config["batch_size"],
        shuffle=True,
        num_workers=2,
        pin_memory=True,
    )
    
    # Model
    model = ChrxmaticcModel(config).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f" Model params: {total_params:,} ({total_params/1e6:.1f}M)")
    
    # Optimizer with weight decay separation
    decay_params = []
    no_decay_params = []
    for name, param in model.named_parameters():
        if param.requires_grad:
            if 'norm' in name or 'bias' in name or 'temperature' in name or 'layer_weights' in name:
                no_decay_params.append(param)
            else:
                decay_params.append(param)
    
    optimizer = torch.optim.AdamW([
        {"params": decay_params, "weight_decay": config["weight_decay"]},
        {"params": no_decay_params, "weight_decay": 0.0},
    ], lr=config["learning_rate"], betas=(0.9, 0.95))
    
    # Scheduler
    total_steps = (len(dataloader) // config["grad_accum_steps"]) * config["epochs"]
    scheduler = get_cosine_schedule_with_warmup(
        optimizer,
        num_warmup_steps=config["warmup_steps"],
        num_training_steps=total_steps,
    )
    
    # Training
    best_loss = float('inf')
    os.makedirs("export", exist_ok=True)
    
    for epoch in range(config["epochs"]):
        model.train()
        total_loss = 0
        optimizer.zero_grad()
        
        for step, batch in enumerate(dataloader):
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            
            output = model(input_ids, attention_mask, labels)
            loss = output["loss"] / config["grad_accum_steps"]
            loss.backward()
            
            total_loss += loss.item()
            
            if (step + 1) % config["grad_accum_steps"] == 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()
            
            if step % 100 == 0:
                print(f"  Epoch {epoch+1} | Step {step} | Loss {loss.item()*config['grad_accum_steps']:.4f} | LR {scheduler.get_last_lr()[0]:.2e}")
        
        avg_loss = total_loss / len(dataloader) * config["grad_accum_steps"]
        print(f" Epoch {epoch+1} complete — Avg Loss: {avg_loss:.4f}")
        
        # Save best model
        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "loss": avg_loss,
                "config": config,
            }, "export/best_model.pt")
            print(f" Saved best model (loss: {avg_loss:.4f})")
    
    print(f"\n Training complete! Best loss: {best_loss:.4f}")
    print(f" Model saved to export/best_model.pt")
    print(f" Tokenizer saved to export/tokenizer.json")


if __name__ == "__main__":
    train()
