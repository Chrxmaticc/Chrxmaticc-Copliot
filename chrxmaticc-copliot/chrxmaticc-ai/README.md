# Chrxmaticc AI

This folder contains the Python training pipeline and the JavaScript inference/export scaffolding for the Chrxmaticc AI model.

## What is here

- `train.py` — PyTorch transformer training pipeline.
- `tokenizer.py` — word-level tokenizer used during training.
- `export_for_js.py` — converts trained PyTorch checkpoint into JSON weights and config for JS.
- `model.js` — Node.js model loader for inference using `@tensorflow/tfjs-node`.
- `tokenizer.js` — JS tokenizer loader for inference.
- `requirements.txt` — Python dependencies.

## How to train

1. Create a `data/` folder in `chrxmaticc-ai`.
2. Add one or more JSON files with conversation data in this format:

```json
[
  {"user": "Hello", "assistant": "Hi there!"},
  {"user": "What can you do?", "assistant": "I can help answer questions."}
]
```

3. Install Python dependencies:

```bash
cd chrxmaticc-ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

4. Train the model:

```bash
python train.py
```

This saves `model.pt` and `tokenizer.json` into `export/`.

## How to export for JS

After training, run:

```bash
python export_for_js.py
```

This creates `export/model_weights.json` and `export/model_config.json` for JavaScript inference.

## Notes

- The current pipeline is designed around Python training and Node.js inference.
- The JS files in this folder are the place to improve if you want the model to run entirely in JavaScript.
- If you want, I can also make the JS tokenizer and export path fully consistent with the Python exporter.
