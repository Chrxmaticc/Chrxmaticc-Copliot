# chrxmaticc-ai/export_model.py
# Export trained model to TensorFlow.js format for Node inference
import torch
import json
from pathlib import Path
from train import ChrxmaticcModel, CONFIG

def export():
    device = torch.device("cpu")
    config = CONFIG
    
    # Load checkpoint
    checkpoint = torch.load("export/best_model.pt", map_location=device)
    model = ChrxmaticcModel(config)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    
    # Export weights as JSON for TF.js
    weights = {}
    for name, param in model.state_dict().items():
        weights[name] = param.numpy().tolist()
    
    export_dir = Path("export")
    export_dir.mkdir(exist_ok=True)
    
    with open(export_dir / "model_weights.json", "w") as f:
        json.dump(weights, f)
    
    with open(export_dir / "model_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("Model exported to export/model_weights.json")
    print("Config exported to export/model_config.json")
    print("Ready for Node.js inference with @tensorflow/tfjs-node")

if __name__ == "__main__":
    export()
