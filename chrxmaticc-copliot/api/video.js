// Chrxmaticc Copilot — Video Generator API
// Generates image frames, client stitches into GIF
// Author: Chrxmee-Midnightt

var https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var prompt = (body.prompt || 'a beautiful animation').slice(0, 300);
  var frames = Math.min(8, Math.max(2, body.frames || 4));
  var width = 512;
  var height = 512;

  var frameUrls = [];
  for (var i = 0; i < frames; i++) {
    var framePrompt = prompt + ', frame ' + (i + 1) + ' of ' + frames + ', smooth motion, consistent style, same scene';
    var safePrompt = encodeURIComponent(framePrompt.slice(0, 400));
    frameUrls.push('https://image.pollinations.ai/prompt/' + safePrompt + '?width=' + width + '&height=' + height + '&nologo=true&seed=' + (Date.now() + i));
  }

  res.status(200).json({
    success: true,
    frames: frameUrls,
    prompt: prompt,
    model: 'Copilot Generator 1.0',
    provider: 'Pollinations AI',
    frameCount: frames,
    note: 'Frames generated. Client will stitch into animated GIF.'
  });
};
