var https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var prompt = body.prompt || '';
  var referenceUrl = body.referenceUrl || '';

  if (!prompt && !referenceUrl) return res.status(400).json({ error: 'Missing prompt or reference.' });

  var finalPrompt = prompt || 'enhance and animate';
  var frames = 4;
  var urls = [];
  for (var i = 0; i < frames; i++) {
    var framePrompt = encodeURIComponent(finalPrompt + ', frame ' + (i+1) + ' of ' + frames + ', smooth animation');
    urls.push('https://image.pollinations.ai/prompt/' + framePrompt + '?width=512&height=512&nologo=true&seed=' + (Date.now()+i));
  }

  res.status(200).json({ success: true, frames: urls, prompt: prompt, model: 'Copilot Generator 1.0', note: 'Experimental. Individual frames generated as images.' });
};
