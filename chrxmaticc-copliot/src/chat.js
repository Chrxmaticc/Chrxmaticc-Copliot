// Chrxmaticc Copilot v1.0.0
// Stripped down — personality.js handles everything
// Author: Chrxmee-Midnightt

var readline = require('readline');
var chalk = require('chalk');
var https = require('https');
var PERSONALITY = require('./personality');

var conversationHistory = [];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getOfflineResponse(input) {
  var lower = input.toLowerCase();
  var topics = PERSONALITY.topics;
  var responses = PERSONALITY.offline;
  
  for (var category in topics) {
    for (var i = 0; i < topics[category].length; i++) {
      if (lower.indexOf(topics[category][i]) !== -1) {
        if (responses[category]) return pickRandom(responses[category]);
      }
    }
  }
  
  if (lower.indexOf('hello') !== -1 || lower.indexOf('hey') !== -1 || lower.indexOf('hi') !== -1 || lower.indexOf('yo') !== -1) {
    return pickRandom(responses.greeting);
  }
  if (lower.indexOf('help') !== -1 || lower.indexOf('what can you do') !== -1) {
    return 'i can talk about: code, shaders, ideas, audio, video, animation. try saying "give me a shader idea" or "explain ray marching". type "exit" to leave.';
  }
  if (lower.indexOf('who are you') !== -1 || lower.indexOf('what are you') !== -1) {
    return pickRandom(responses.whoami);
  }
  if (lower.indexOf('exit') !== -1 || lower.indexOf('quit') !== -1 || lower.indexOf('bye') !== -1) {
    return { text: pickRandom(PERSONALITY.goodbyes), exit: true };
  }
  
  return pickRandom(responses.fallback);
}

function askLLM(userInput) {
  return new Promise(function(resolve) {
    var messages = [{ role: 'system', content: PERSONALITY.systemPrompt }];
    
    for (var i = 0; i < conversationHistory.length; i++) {
      messages.push(conversationHistory[i]);
    }
    messages.push({ role: 'user', content: userInput });

    var data = JSON.stringify({
      messages: messages,
      max_tokens: 250,
      temperature: 0.85
    });

    var options = {
      hostname: 'pollinations.ai',
      path: '/api/generate',
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
          var text = json.text || json.response || json.content || '';
          resolve(text || null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', function() { resolve(null); });
    req.on('timeout', function() { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

async function getResponse(input) {
  var llmResponse = await askLLM(input);
  if (llmResponse) return llmResponse;
  return getOfflineResponse(input);
}

function typeText(text, callback) {
  var chars = text.split('');
  var i = 0;
  function type() {
    if (i < chars.length) {
      process.stdout.write(chars[i]);
      i = i + 1;
      setTimeout(type, PERSONALITY.typingSpeedMin + Math.random() * (PERSONALITY.typingSpeedMax - PERSONALITY.typingSpeedMin));
    } else {
      console.log('');
      console.log('');
      if (callback) callback();
    }
  }
  type();
}

function chat() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('you > ')
  });

  console.log('');
  console.log('  ' + chalk.magenta('╔══════════════════════════════════════╗'));
  console.log('  ' + chalk.magenta('║   🧠 ' + PERSONALITY.name + ' v' + PERSONALITY.version + '              ║'));
  console.log('  ' + chalk.magenta('║   ' + PERSONALITY.tagline + '  ║'));
  console.log('  ' + chalk.magenta('╚══════════════════════════════════════╝'));
  console.log('');
  console.log('  ' + chalk.green('●') + ' Connected to Pollinations AI');
  console.log('  ' + chalk.gray('Memory: ' + PERSONALITY.maxHistory + ' messages'));
  console.log('');
  console.log('  ' + chalk.gray('Type "help" to see what I can do, "exit" to quit'));
  console.log('');

  var greeting = pickRandom(PERSONALITY.greetings);
  process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
  typeText(greeting, function() { rl.prompt(); });

  rl.on('line', async function(input) {
    var trimmed = input.trim();
    if (!trimmed) {
      process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
      typeText(pickRandom(PERSONALITY.emptyInput), function() { rl.prompt(); });
      return;
    }

    var response = await getResponse(trimmed);
    var text = typeof response === 'string' ? response : response.text;
    var exit = typeof response === 'object' && response.exit;

    conversationHistory.push({ role: 'user', content: trimmed });
    conversationHistory.push({ role: 'assistant', content: text });

    if (conversationHistory.length > PERSONALITY.maxHistory) {
      conversationHistory = conversationHistory.slice(-PERSONALITY.maxHistory);
    }

    process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
    typeText(text, function() {
      if (exit) {
        console.log('  ' + chalk.gray(PERSONALITY.name + ' offline. Come back soon.'));
        console.log('');
        rl.close();
        return;
      }
      rl.prompt();
    });
  });

  rl.on('close', function() { process.exit(0); });
}

module.exports = { chat: chat, getResponse: getResponse };
