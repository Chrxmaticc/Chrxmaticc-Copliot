// Chrxmaticc Copilot — Chat API with File Support
// Author: Chrxmee-Midnightt
// Model: Groq (multi-model via personalities)

var https = require('https');
var path = require('path');
var fs = require('fs');

var GROQ_KEY = process.env.GROQ_KEY || '';

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

  try {
    var reply = await askGroq(systemPrompt, message, model, temperature, maxTokens);
    res.status(200).json({ response: reply, provider: 'groq', model: model });
  } catch (e) {
    res.status(200).json({ response: getFallback(message), provider: 'offline' });
  }
};

function askGroq(systemPrompt, userMessage, model, temperature, maxTokens) {
  return new Promise(function(resolve, reject) {
    if (!GROQ_KEY) {
      reject('no key');
      return;
    }

    var body = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: temperature,
      max_completion_tokens: maxTokens
    });

    var options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      }
    };

    var req = https.request(options, function(response) {
      var data = '';
      response.on('data', function(chunk) { data += chunk; });
      response.on('end', function() {
        try {
          var json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(json.error.message || 'groq error');
          } else {
            reject('empty response');
          }
        } catch (e) {
          reject('parse error');
        }
      });
    });

    req.on('error', function(e) {
      reject(e.message || 'request failed');
    });

    req.write(body);
    req.end();
  });
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /weather, /crypto, /roll, /joke, /speak. Attach files with the link button.';
  return 'I\'m in offline mode. Limited responses but still here.';
}
