// Chrxmaticc Copilot v1.0.0
// Single-User Chat Engine — Full Commands
// Dual AI + TTS + Voice + Spotify + Extensions
// Author: Chrxmee-Midnightt

var readline = require('readline');
var chalk = require('chalk');
var PERSONALITY = require('./personality');
var pollinations = require('./apis/pollinations');
var groq = require('./apis/groq');
var tts = require('./tts');

var conversationHistory = [];
var currentProvider = 'pollinations';
var groqRateLimited = false;
var rateLimitResetTime = 0;
var ttsEnabled = true;
var clipboardWatcherActive = false;

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
  if (lower.indexOf('help') !== -1) {
    return 'commands: /voice, /speak, /run, /roll, /8ball, /save, /clear, /provider, /clipboard, /complete, /review, /song, /playlist, /spotify, /exit';
  }
  if (lower.indexOf('who are you') !== -1) {
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

async function handleCommand(trimmed, text, rl) {
  var lower = trimmed.toLowerCase();
  
  // Voice
  if (lower === '/voice' || lower === '/v') {
    var voice = require('./voice');
    voice.voiceChat(rl, function() { rl.prompt(); });
    return chalk.magenta('🎤 Listening...');
  }
  
  // TTS
  if (lower.indexOf('/speak') === 0) {
    var speakText = trimmed.replace('/speak', '').trim() || text;
    if (ttsEnabled) {
      tts.speak(speakText, 'en', function(err) {
        if (err) console.log('  ' + chalk.red('TTS Error: ' + err.message));
      });
      return '🗣️ ' + speakText;
    }
    return chalk.gray('TTS muted. /unmute');
  }
  
  if (lower === '/mute') {
    ttsEnabled = false;
    return chalk.yellow('🔇 TTS muted.');
  }
  
  if (lower === '/unmute') {
    ttsEnabled = true;
    return chalk.green('🔊 TTS unmuted.');
  }
  
  // Run command
  if (lower.indexOf('/run') === 0) {
    var cmd = trimmed.replace('/run', '').trim();
    if (!cmd) return chalk.yellow('Usage: /run <command>');
    try {
      var execSync = require('child_process').execSync;
      var output = execSync(cmd, { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 500 });
      return chalk.green('$ ' + cmd + '\n') + output.slice(0, 1000);
    } catch (e) {
      return chalk.red('$ ' + cmd + '\nError: ') + e.message;
    }
  }
  
  // Save
  if (lower === '/save') {
    var fs = require('fs');
    var log = '';
    for (var i = 0; i < conversationHistory.length; i++) {
      log = log + conversationHistory[i].role + ': ' + conversationHistory[i].content + '\n';
    }
    fs.writeFileSync('chrxmaticc-chat.log', log);
    return chalk.green('💾 Saved.');
  }
  
  // Clear
  if (lower === '/clear') {
    conversationHistory = [];
    return chalk.yellow('🧹 Cleared.');
  }
  
  // Provider
  if (lower === '/provider') {
    var clipStatus = clipboardWatcherActive ? 'on' : 'off';
    return chalk.gray('Provider: ' + currentProvider + ' | TTS: ' + (ttsEnabled ? 'on' : 'off') + ' | Clipboard: ' + clipStatus + ' | Memory: ' + conversationHistory.length);
  }
  
  // Roll dice
  if (lower.indexOf('/roll') === 0) {
    var dice = lower.replace('/roll', '').trim() || '1d6';
    var parts = dice.split('d');
    var count = parseInt(parts[0]) || 1;
    var sides = parseInt(parts[1]) || 6;
    var results = [];
    for (var i = 0; i < count; i++) results.push(Math.floor(Math.random() * sides) + 1);
    var total = results.reduce(function(a, b) { return a + b; }, 0);
    return chalk.yellow('🎲 ' + dice + ': ') + results.join(', ') + chalk.green(' = ' + total);
  }
  
  // 8-ball
  if (lower.indexOf('/8ball') === 0) {
    var ball = ['It is certain.', 'Without a doubt.', 'Yes.', 'Ask again.', 'No.', 'Very doubtful.'];
    return chalk.magenta('🎱 ') + pickRandom(ball);
  }
  
  // Clipboard watcher
  if (lower === '/clipboard on') {
    var cw = require('./extensions/clipboard-watcher');
    cw.startWatcher();
    clipboardWatcherActive = true;
    return chalk.green('📋 Clipboard watcher active.');
  }
  
  if (lower === '/clipboard off') {
    clipboardWatcherActive = false;
    return chalk.yellow('📋 Clipboard watcher stopped.');
  }
  
  // Terminal complete
  if (lower.indexOf('/complete') === 0) {
    var partial = trimmed.replace('/complete', '').trim();
    if (!partial) return chalk.yellow('Usage: /complete <partial command>');
    var th = require('./extensions/terminal-hook');
    var suggestion = await th.suggestCommand(partial);
    return chalk.cyan('💡 ') + suggestion;
  }
  
  // Code review
  if (lower.indexOf('/review') === 0) {
    var code = trimmed.replace('/review', '').trim();
    if (!code) return chalk.yellow('Usage: /review <paste code>');
    var cr = require('./extensions/code-review');
    var result = await cr.reviewCode(code);
    return chalk.green('🔍 Review:\n') + result.review;
  }
  
  // Song analysis
  if (lower.indexOf('/song') === 0) {
    var track = trimmed.replace('/song', '').trim();
    if (!track) return chalk.yellow('Usage: /song <track> - <artist>');
    var sp = require('./extensions/spotify');
    var parts = track.split(' - ');
    var analysis = await sp.analyzeTrack(parts[0], parts[1] || '');
    return chalk.green('🎵 ') + analysis;
  }
  
  // Playlist generation
  if (lower.indexOf('/playlist') === 0) {
    var mood = trimmed.replace('/playlist', '').trim() || 'chill';
    var sp = require('./extensions/spotify');
    var playlist = await sp.createPlaylistPrompt(mood);
    return chalk.green('🎧 Playlist:\n') + playlist;
  }
  
  // Similar songs
  if (lower.indexOf('/similar') === 0) {
    var track = trimmed.replace('/similar', '').trim();
    if (!track) return chalk.yellow('Usage: /similar <track> - <artist>');
    var sp = require('./extensions/spotify');
    var parts = track.split(' - ');
    var similar = await sp.suggestSimilar(parts[0], parts[1] || '');
    return chalk.green('🎧 Similar:\n') + similar;
  }
  
  // Spotify full integration
  if (lower.indexOf('/spotify') === 0) {
    var spotify = require('./extensions/spotify');
    var result = await spotify.handleCommand(trimmed, 'local-user');
    return chalk.green('🎵 ') + result.text;
  }
  
  // Exit
  if (lower === '/exit' || lower === '/quit') {
    return { text: pickRandom(PERSONALITY.goodbyes), exit: true };
  }
  
  return null;
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
  console.log('  ' + chalk.green('●') + ' AI: Pollinations + Groq');
  console.log('  ' + chalk.magenta('●') + ' Voice: /voice  |  TTS: /speak');
  console.log('  ' + chalk.cyan('●') + ' Spotify: /spotify login');
  console.log('  ' + chalk.yellow('●') + ' Tools: /run, /review, /complete');
  console.log('  ' + chalk.gray('Memory: ' + PERSONALITY.maxHistory + ' msgs  |  /help for all'));
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

    var commandResult = await handleCommand(trimmed, text, rl);
    if (commandResult) {
      if (typeof commandResult === 'object' && commandResult.exit) {
        text = commandResult.text;
        exit = true;
      } else {
        text = commandResult;
        provider = 'system';
      }
    }

    if (provider !== 'system') {
      conversationHistory.push({ role: 'user', content: trimmed });
      conversationHistory.push({ role: 'assistant', content: text });
    }

    if (conversationHistory.length > PERSONALITY.maxHistory) {
      conversationHistory = conversationHistory.slice(-PERSONALITY.maxHistory);
    }

    var providerBadge = '';
    if (provider === 'pollinations') providerBadge = chalk.green(' [Pollinations]');
    else if (provider === 'groq') providerBadge = chalk.cyan(' [Groq]');
    else if (provider === 'offline') providerBadge = chalk.yellow(' [Offline]');
    else if (provider === 'system') providerBadge = chalk.magenta(' [System]');

    process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
    typeText(text + providerBadge, function() {
      if (exit) {
        console.log('  ' + chalk.gray(PERSONALITY.name + ' offline.'));
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
