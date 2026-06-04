// Chrxmaticc Copilot — Chat API with Free Image Vision
// Author: Chrxmee-Midnightt
// Groq + Pollinations Vision (free, no API key)

var path = require('path');
var fs = require('fs');

var GROQ_KEY = process.env.GROQ_KEY || '';
var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
var VISION_URL = 'https://image.pollinations.ai/describe';

var PERSONALITIES = {};
var personalitiesDir = path.join(__dirname, '..', 'src', 'personalities');
if (fs.existsSync(personalitiesDir)) {
  fs.readdirSync(personalitiesDir).filter(function(f) { return f.endsWith('.js'); }).forEach(function(f) {
    var p = require(path.join(personalitiesDir, f));
    PERSONALITIES[f.replace('.js', '')] = p;
  });
}

var PERSONALITY_MAP = {
  'conversational': 'conversational', 'general': 'conversational', 'copilot': 'conversational',
  'sonnet': 'sonnet', 'coder': 'sonnet',
  'vision': 'vision', 'creative': 'vision',
  'intermediate': 'intermediate',
  'speed': 'speed'
};

var DEFAULT_PERSONALITY = PERSONALITIES['conversational'] || {
  name: 'Copilot Conversational',
  systemPrompt: 'You are Chrxmaticc Copilot. Be helpful, casual, and concise.',
  temperature: 0.8,
  maxTokens: 650,
  model: 'llama-3.3-70b-versatile'
};

// Image file extensions
var IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.avif'];

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var message = body.message || '';
  var fileName = body.fileName || '';
  var fileType = body.fileType || '';
  var imageUrl = body.imageUrl || '';

  if (!message && !imageUrl && !body.fileContent) {
    return res.status(400).json({ error: 'Missing message' });
  }

  var personalityKey = PERSONALITY_MAP[body.personality] || 'conversational';
  var selectedPersonality = PERSONALITIES[personalityKey] || DEFAULT_PERSONALITY;
  var systemPrompt = selectedPersonality.systemPrompt;
  var model = selectedPersonality.model || 'llama-3.3-70b-versatile';
  var temperature = selectedPersonality.temperature || 0.8;
  var maxTokens = selectedPersonality.maxTokens || 650;

  if (body.personalInfo) {
    systemPrompt += ' The user shared: ' + body.personalInfo + '. Use this when relevant.';
  }

  // ── IMAGE DETECTION & VISION ──
  var isImage = false;

  // Check by MIME type
  if (fileType && fileType.startsWith('image/')) {
    isImage = true;
  }
  // Check by file extension
  if (fileName) {
    var ext = '.' + fileName.split('.').pop().toLowerCase();
    if (IMAGE_EXTENSIONS.indexOf(ext) !== -1) {
      isImage = true;
    }
  }
  // Check if imageUrl is provided
  if (imageUrl) {
    isImage = true;
  }

  if (isImage) {
    try {
      var descUrl = imageUrl || body.fileContent || '';
      var description = await describeImage(descUrl);
      if (description) {
        message = '[The user uploaded an image. Here is a description of what it shows: "' + description + '"]\n\nUser: ' + (message || 'What do you see in this image? Describe it and respond accordingly.');
        systemPrompt += ' The user has shared an image. A description of the image has been provided. Use this description to respond as if you can see the image. Be vivid and detailed when describing it back.';
      }
    } catch(e) {
      // Vision failed, continue with just file info
      message = '[Image: ' + (fileName || 'uploaded') + ']\n\nUser: ' + (message || 'I uploaded an image.');
      systemPrompt += ' The user uploaded an image but automatic description failed. Let them know and ask them to describe it.';
    }
  }

  // ── TEXT FILE HANDLING ──
  if (body.fileContent && !isImage) {
    message = '[File: ' + (fileName || 'unknown') + ']\nContent:\n' + String(body.fileContent).slice(0, 3000) + '\n\nUser: ' + (message || 'See attached file.');
    systemPrompt += ' The user attached a file. Read its content and respond accordingly.';
  }

  try {
    var reply = await askGroq(systemPrompt, message, model, temperature, maxTokens);
    res.status(200).json({ response: reply, provider: 'groq', model: model });
  } catch (e) {
    res.status(200).json({ response: getFallback(message), provider: 'offline' });
  }
};

// ── Free image description via Pollinations ──
async function describeImage(imageUrl) {
  // If it's a blob URL or data URL, we can't send it directly to Pollinations
  // The frontend should pass a proper URL
  if (!imageUrl || imageUrl.indexOf('blob:') === 0 || imageUrl.indexOf('data:') === 0) {
    return null;
  }

  try {
    var url = VISION_URL + '?url=' + encodeURIComponent(imageUrl);
    var response = await fetch(url);
    var text = await response.text();

    if (text && text.length > 10 && text.toLowerCase().indexOf('error') === -1 && text.toLowerCase().indexOf('failed') === -1) {
      return text.trim();
    }
    return null;
  } catch(e) {
    return null;
  }
}

async function askGroq(systemPrompt, userMessage, model, temperature, maxTokens) {
  if (!GROQ_KEY) throw new Error('no key');

  var response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_KEY
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  var json = await response.json();

  if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
    return json.choices[0].message.content;
  }

  if (json.error) throw new Error(json.error.message || 'groq error');
  throw new Error('empty response');
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /weather, /crypto, /roll, /joke, /speak. Attach files with the link button.';
  return 'I\'m in offline mode. Limited responses but still here.';
}
