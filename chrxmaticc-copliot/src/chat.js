// Chrxmaticc Copilot v1.0.0
// Dual AI Provider — Pollinations + Groq failover
// Author: Chrxmee-Midnightt

var readline = require('readline');
var chalk = require('chalk');
var PERSONALITY = require('./personality');
var pollinations = require('./apis/pollinations');
var groq = require('./apis/groq');

var conversationHistory = [];
var currentProvider = 'pollinations';
var groqRateLimited = false;
var rateLimitResetTime = 0;

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
    return 'i can talk about: code, shaders, ideas, audio, video, animation. try saying "give me a shader idea" or "explain ray marching". type "exit" to leave. powered by Pollinations AI + Groq fallback.';
  }
  if (lower.indexOf('who are you') !== -1 || lower.indexOf('what are you') !== -1) {
    return pickRandom(responses.whoami);
  }
  if (lower.indexOf('exit') !== -1 || lower.indexOf('quit') !== -1 || lower.indexOf('bye') !== -1) {
    return { text: pickRandom(PERSONALITY.goodbyes), exit: true };
  }
  
  return pickRandom(responses.fallback);
}

async function askAI(userInput) {
  if (groqRateLimited && Date.now() > rateLimitResetTime) {
    groqRateLimited = false;
  }
  
  var result = await pollinations.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
  
  if (result.success) {
    currentProvider = 'pollinations';
    return result;
  }
  
  if (!groqRateLimited) {
    result = await groq.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
    
    if (result.success) {
      currentProvider = 'groq';
      return result;
    }
    
    if (result.error === 'rate_limited') {
      groqRateLimited = true;
      rateLimitResetTime = Date.now() + 60000;
    }
  }
  
  result = await pollinations.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
  if (result.success) {
    currentProvider = 'pollinations';
    return result;
  }
  
  return { success: false, error: 'all providers down', provider: 'offline' };
}

async function getResponse(input) {
  var aiResult = await askAI(input);
  
  if (aiResult.success) {
    return { text: aiResult.text, provider: aiResult.provider };
  }
  
  return { text: getOfflineResponse(input), provider: 'offline' };
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
  console.log('  ' + chalk.green('●') + ' Primary: Pollinations AI (free, no key)');
  console.log('  ' + chalk.cyan('●') + ' Fallback: Groq (Llama 3 8B, your key)');
  console.log('  ' + chalk.yellow('●') + ' Offline: personality.js (if both down)');
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
    var provider = response.provider || 'offline';

    conversationHistory.push({ role: 'user', content: trimmed });
    conversationHistory.push({ role: 'assistant', content: text });

    if (conversationHistory.length > PERSONALITY.maxHistory) {
      conversationHistory = conversationHistory.slice(-PERSONALITY.maxHistory);
    }

    var providerBadge = '';
    if (provider === 'pollinations') providerBadge = chalk.green(' [Pollinations]');
    if (provider === 'groq') providerBadge = chalk.cyan(' [Groq]');
    if (provider === 'offline') providerBadge = chalk.yellow(' [Offline]');

    process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
    typeText(text + providerBadge, function() {
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
