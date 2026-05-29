var https = require('https');
var userLimits = {};

function checkLimit(userId) {
  var now = Date.now();
  if (!userLimits[userId]) userLimits[userId] = { count: 0, reset: now + 3600000 };
  if (now > userLimits[userId].reset) userLimits[userId] = { count: 0, reset: now + 3600000 };
  if (userLimits[userId].count >= 10) return false;
  userLimits[userId].count++;
  return true;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var prompt = body.prompt || '';
  var referenceUrl = body.referenceUrl || '';
  var width = Math.min(1024, Math.max(128, body.width || 512));
  var height = Math.min(1024, Math.max(128, body.height || 512));
  var userId = body.userId || 'anonymous';

  if (!prompt && !referenceUrl) return res.status(400).json({ error: 'Missing prompt or reference image.' });
  if (!checkLimit(userId)) return res.status(429).json({ error: 'Rate limit reached. 10 images per hour.' });

  var finalPrompt = prompt;
  if (referenceUrl) {
    finalPrompt = prompt ? prompt + ' (reference image provided)' : 'enhance and stylize this image';
  }

  var safePrompt = encodeURIComponent(finalPrompt.slice(0, 500));
  var imageUrl = 'https://image.pollinations.ai/prompt/' + safePrompt + '?width=' + width + '&height=' + height + '&nologo=true&seed=' + Date.now();

  https.get(imageUrl, function(imgRes) {
    if (imgRes.statusCode === 200 || imgRes.statusCode === 302) {
      res.status(200).json({ success: true, url: imageUrl, prompt: prompt, model: 'Copilot Artist 1.0', remaining: 10 - (userLimits[userId]?.count || 0) });
    } else {
      res.status(500).json({ error: 'Generation failed. Try a different prompt.' });
    }
  }).on('error', function() { res.status(500).json({ error: 'Image service unavailable.' }); });
};
