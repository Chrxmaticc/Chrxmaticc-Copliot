// Chrxmaticc Copilot — Chat API with File Support
// Author: Chrxmee-Midnightt
// Model: Groq (multi-model via personalities)

var https = require('https');
var path = require('path');
var fs = require('fs');

// Groq config
var GROQ_API_KEY = process.env.GROQ_API_KEY || '';

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

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var message = body.message || '';
  if (!message) return res.status(400).json({ error: 'Missing message' });

  var personalityKey = PERSONALITY_MAP[body.personality] || 'conversational';
  var selectedPersonality = PERSONALITIES[personalityKey] || DEFAULT_PERSONALITY;
  var systemPrompt = selectedPersonality.systemPrompt;
  var model = selectedPersonality.model || 'llama-3.3-70b-versatile';
  var temperature = selectedPersonality.temperature || 0.8;
  var maxTokens = selectedPersonality.maxTokens || 650;

  if (body.personalInfo) {
    systemPrompt += ' The user shared: ' + body.personalInfo + '. Use this when relevant.';
  }

  if (body.fileContent) {
    message = '[File: ' + (body.fileName || 'unknown') + ']\nContent: ' + body.fileContent.slice(0, 2000) + '\n\nUser: ' + message;
    systemPrompt += ' The user attached a file. Read its content and respond accordingly.';
  }

  var response = await getAIResponse(message, systemPrompt, model, temperature, maxTokens);
  res.status(200).json(response);
};

function getAIResponse(message, systemPrompt, model, temperature, maxTokens) {
  return new Promise(function(resolve) {
    if (!GROQ_API_KEY) {
      resolve({ response: getFallback(message), provider: 'offline' });
      return;
    }

    var data = JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: model,
      max_tokens: maxTokens || 250,
      temperature: temperature || 0.85
    });

    var options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY
      },
      timeout: 30000
    };

    var req = https.request(options, function(apiRes) {
      var body = '';
      apiRes.on('data', function(c) { body += c; });
      apiRes.on('end', function() {
        try {
          var json = JSON.parse(body);
          var text = json.choices?.[0]?.message?.content || getFallback(message);
          resolve({ response: text, provider: 'groq', model: model });
        } catch (e) {
          resolve({ response: getFallback(message), provider: 'offline' });
        }
      });
    });

    req.on('error', function() {
      resolve({ response: getFallback(message), provider: 'offline' });
    });
    req.write(data);
    req.end();
  });
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /video, /weather, /crypto, /roll, /joke, /speak. Attach files with the link button.';
  return 'I\'m in offline mode. Limited responses but still here.';
}
