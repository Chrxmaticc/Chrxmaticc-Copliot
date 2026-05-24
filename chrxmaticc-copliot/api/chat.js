var https = require('https');

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
    var data = JSON.stringify({
      messages: [
        { role: 'system', content: 'You are Chrxmaticc Copilot, a hyper-intelligent offbrand terminal AI. Keep responses short, casual, and brilliant. Use "bro" and casual language. Always speak in lower cases, always. and be helpful and chill.' },
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
  if (lower.indexOf('hello') !== -1 || lower.indexOf('hey') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /weather London, /crypto bitcoin, /roll 2d20, /speak hello, /joke, /fact';
  if (lower.indexOf('/weather') === 0) return 'Weather needs a city. Try /weather London';
  if (lower.indexOf('/crypto') === 0) return 'Crypto needs a coin. Try /crypto bitcoin';
  if (lower.indexOf('/roll') === 0) return 'Try /roll 2d20 to roll two 20-sided dice';
  if (lower.indexOf('/joke') === 0) return 'Why do programmers prefer dark mode? Because light attracts bugs.';
  if (lower.indexOf('/fact') === 0) return 'The first computer bug was an actual moth found in a relay in 1947.';
  return 'I\'m in offline mode. Limited responses but still here. Try /help for commands.';
}
