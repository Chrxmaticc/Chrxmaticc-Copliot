// Groq AI — Fallback Provider (Fast, Free Tier, Needs Key)
// Author: Chrxmee-Midnightt

var https = require('https');

var GROQ_KEY = process.env.GROQ_KEY || '';

function ask(userInput, history, systemPrompt) {
  return new Promise(function(resolve) {
    if (!GROQ_KEY) {
      resolve({ success: false, error: 'no API key', provider: 'groq' });
      return;
    }

    var messages = [{ role: 'system', content: systemPrompt }];
    
    for (var i = 0; i < history.length; i++) {
      messages.push(history[i]);
    }
    messages.push({ role: 'user', content: userInput });

    var data = JSON.stringify({
      model: 'llama3-8b-8192',
      messages: messages,
      max_tokens: 250,
      temperature: 0.85
    });

    var options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body = body + chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          
          if (res.statusCode === 429) {
            resolve({ success: false, error: 'rate_limited', provider: 'groq' });
            return;
          }
          
          var text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          
          if (text) {
            resolve({ success: true, text: text, provider: 'groq' });
          } else {
            resolve({ success: false, error: 'empty response', provider: 'groq' });
          }
        } catch (e) {
          resolve({ success: false, error: e.message, provider: 'groq' });
        }
      });
    });

    req.on('error', function(e) {
      resolve({ success: false, error: e.message, provider: 'groq' });
    });
    req.on('timeout', function() {
      req.destroy();
      resolve({ success: false, error: 'timeout', provider: 'groq' });
    });
    req.write(data);
    req.end();
  });
}

module.exports = { ask: ask };
