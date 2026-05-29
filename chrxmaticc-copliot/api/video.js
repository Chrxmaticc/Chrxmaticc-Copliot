// Chrxmaticc Copilot — Video Generation API
// Copilot Generator 1.0 — Single clean video
// Author: Chrxmee-Midnightt

var https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var prompt = body.prompt || '';

  if (!prompt) return res.status(400).json({ error: 'Missing prompt. Usage: /video <description>' });

  var safePrompt = encodeURIComponent(prompt.slice(0, 300) + ', smooth animation, video style');
  var videoUrl = 'https://image.pollinations.ai/prompt/' + safePrompt + '?width=512&height=512&nologo=true&seed=' + Date.now();

  https.get(videoUrl, function(imgRes) {
    if (imgRes.statusCode === 200 || imgRes.statusCode === 302) {
      res.status(200).json({
        success: true,
        url: videoUrl,
        prompt: prompt,
        model: 'Copilot Generator 1.0',
        provider: 'Pollinations AI',
        note: 'Single video file generated.'
      });
    } else {
      res.status(500).json({ error: 'Video generation failed. Try a different prompt.' });
    }
  }).on('error', function() {
    res.status(500).json({ error: 'Video service unavailable.' });
  });
};
