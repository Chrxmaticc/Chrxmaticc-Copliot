var https = require('https');
var PERSONALITY = require('../src/personality');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Missing message' });

  var response = await getAIResponse(message);
  res.status(200).json(response);
};

function getAIResponse(message) {
  return new Promise(function(resolve) {
    var systemPrompt = PERSONALITY.systemPrompt || 'You are Chrxmaticc Copilot, a hyper-intelligent offbrand terminal AI. Keep responses short, casual, and brilliant.';

    var data = JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'openai',
      max_tokens: 250,
      temperature: 0.85
    });

    var options = {
      hostname: 'text.pollinations.ai',
      path: '/openai',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };

    var req = https.request(options, function(apiRes) {
      var body = '';
      apiRes.on('data', function(c) { body += c; });
      apiRes.on('end', function() {
        try {
          var json = JSON.parse(body);
          var text = json.text || json.choices?.[0]?.message?.content || getFallback(message);
          resolve({ response: text, provider: 'pollinations' });
        } catch (e) {
          resolve({ response: getFallback(message), provider: 'offline' });
        }
      });
    });

    req.on('error', function() { resolve({ response: getFallback(message), provider: 'offline' }); });
    req.write(data);
    req.end();
  });
}

function getFallback(input) {
  var lower = (input || '').toLowerCase();
  var responses = PERSONALITY.offline || {};
  var topics = PERSONALITY.topics || {};

  for (var category in topics) {
    for (var i = 0; i < topics[category].length; i++) {
      if (lower.indexOf(topics[category][i]) !== -1) {
        if (responses[category] && responses[category].length) {
          return responses[category][Math.floor(Math.random() * responses[category].length)];
        }
      }
    }
  }

  if (lower.indexOf('hello') !== -1 || lower.indexOf('hey') !== -1 || lower.indexOf('hi') !== -1) {
    var greetings = responses.greeting || ['Yo! What\'s good?'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.indexOf('help') !== -1) {
    return 'Commands: /weather London, /crypto bitcoin, /roll 2d20, /speak hello, /joke, /fact';
  }

  if (lower.indexOf('who are you') !== -1) {
    var whoami = responses.whoami || ['I\'m Chrxmaticc Copilot. Offbrand. Hyper-intelligent.'];
    return whoami[Math.floor(Math.random() * whoami.length)];
  }

  var fallback = responses.fallback || ['I\'m in offline mode. Limited responses but still here.'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}
