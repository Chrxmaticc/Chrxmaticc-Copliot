// Pollinations AI — Primary Provider (Free, No Key)
// Author: Chrxmee-Midnightt

var https = require('https');

function ask(userInput, history, systemPrompt) {
  return new Promise(function(resolve) {
    var messages = [{ role: 'system', content: systemPrompt }];
    
    for (var i = 0; i < history.length; i++) {
      messages.push(history[i]);
    }
    messages.push({ role: 'user', content: userInput });

    var data = JSON.stringify({
      messages: messages,
      model: 'openai',
      max_tokens: 250,
      temperature: 0.85
    });

    var options = {
      hostname: 'text.pollinations.ai',
      path: '/openai',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };

    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body = body + chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          var text = json.text || json.response || json.content || json.choices?.[0]?.message?.content || '';
          if (text) {
            resolve({ success: true, text: text, provider: 'pollinations' });
          } else {
            resolve({ success: false, error: 'empty response', provider: 'pollinations' });
          }
        } catch (e) {
          resolve({ success: false, error: e.message, provider: 'pollinations' });
        }
      });
    });

    req.on('error', function(e) {
      resolve({ success: false, error: e.message, provider: 'pollinations' });
    });
    req.on('timeout', function() {
      req.destroy();
      resolve({ success: false, error: 'timeout', provider: 'pollinations' });
    });
    req.write(data);
    req.end();
  });
}

module.exports = { ask: ask };