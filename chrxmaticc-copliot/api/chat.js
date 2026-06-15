// api/chat.js
// Chrxmaticc Copilot — Chat API (Dual Provider: Groq + Claude)
var GROQ_KEY = process.env.GROQ_KEY || '';
var CLAUDE_KEY = process.env.CLAUDE_KEY || '';
var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
var CLAUDE_URL = 'https://openrouter.ai/api/v1/chat/completions';

var path = require('path');
var fs = require('fs');

var PERSONALITIES = {};
var personalitiesDir = path.join(__dirname, '..', 'src', 'personalities');
if (fs.existsSync(personalitiesDir)) {
  fs.readdirSync(personalitiesDir).filter(function(f) { return f.endsWith('.js'); }).forEach(function(f) {
    var p = require(path.join(personalitiesDir, f));
    PERSONALITIES[f.replace('.js', '')] = p;
  });
}

var DEFAULT_PERSONALITY = PERSONALITIES['conversational'] || {
  name: 'Copilot Conversational',
  systemPrompt: 'You are Chrxmaticc Copilot. Be helpful, casual, and concise.',
  temperature: 0.85,
  maxTokens: 650,
  model: 'llama-3.3-70b-versatile',
  provider: 'groq'
};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var message = body.message || '';
  if (!message) return res.status(400).json({ error: 'Missing message' });

  var selectedPersonality = PERSONALITIES[body.personality] || DEFAULT_PERSONALITY;
  var systemPrompt = selectedPersonality.systemPrompt;
  var model = selectedPersonality.model || 'llama-3.3-70b-versatile';
  var temperature = selectedPersonality.temperature || 0.8;
  var maxTokens = selectedPersonality.maxTokens || 650;
  var provider = selectedPersonality.provider || 'groq';

  if (body.personalInfo) {
    systemPrompt += ' ' + body.personalInfo;
  }

  try {
    var reply = await askAI(systemPrompt, message, model, temperature, maxTokens, provider);
    res.status(200).json({ response: reply, provider: provider, model: model });
  } catch (e) {
    res.status(200).json({ response: getFallback(message), provider: 'offline' });
  }
};

async function askAI(systemPrompt, userMessage, model, temperature, maxTokens, provider) {
  var key = provider === 'openrouter' ? CLAUDE_KEY : GROQ_KEY;
  var url = provider === 'openrouter' ? CLAUDE_URL : GROQ_URL;
  
  if (!key) throw new Error('no key for ' + provider);

  var headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + key
  };
  
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://chrxmaticc-copliot.vercel.app';
    headers['X-Title'] = 'Chrxmaticc Copilot';
  }

  var response = await fetch(url, {
    method: 'POST',
    headers: headers,
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
  
  if (json.error) throw new Error(json.error.message || provider + ' error');
  throw new Error('empty response from ' + provider);
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /weather, /crypto, /roll, /joke, /speak. Attach files with the link button.';
  return 'I\'m in offline mode. Limited responses but still here.';
}
