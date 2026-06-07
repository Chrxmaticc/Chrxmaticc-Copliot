# chrxmaticc-ai/export_for_js.py
# ╔══════════════════════════════════════════╗
# ║  Export PyTorch model → JS-readable     ║
# ║  Run after training to serve in Node    ║
# ╚══════════════════════════════════════════╝

import torch
import json
from train import ChrxmaticcModel, CONFIG

def export():
    device = torch.device("cpu")
    
    checkpoint = torch.load("export/model.pt", map_location=device, weights_only=False)
    config = checkpoint.get("config", CONFIG)
    vocab_size = checkpoint.get("vocab_size", 5000)
    
    model = ChrxmaticcModel(vocab_size, config)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    
    weights = {}
    for name, param in model.state_dict().items():
        weights[name] = param.numpy().tolist()
    
    with open("export/model_weights.json", "w") as f:
        json.dump(weights, f)
    
    with open("export/model_config.json", "w") as f:
        json.dump({**config, "vocab_size": vocab_size}, f, indent=2)
    
    print(" Exported model_weights.json")
    print(" Exported model_config.json")
    print(" Ready for Transformer.js inference")

if __name__ == "__main__":
    export()
