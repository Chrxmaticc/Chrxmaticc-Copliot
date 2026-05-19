// Chrxmaticc Copilot v1.0.0
// Single-User Chat Engine — All Features + Secrets
// Dual AI + TTS + Voice + Spotify + Plugins + Memory
// Author: Chrxmee-Midnightt

var readline = require('readline');
var chalk = require('chalk');
var PERSONALITY = require('./personality');
var pollinations = require('./apis/pollinations');
var groq = require('./apis/groq');
var tts = require('./tts');
var pluginEngine = require('./plugin-engine');
var memory = require('./memory');

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
    return 'Commands: /voice, /speak, /run, /roll, /8ball, /save, /clear, /provider, /clipboard, /complete, /review, /song, /playlist, /spotify, /plugins, /memory, /sys, /crypto, /weather, /translate, /qr, /passwd, /github, /define, /search, /remind, /exit. Secret commands: /easter, /midnight, /vault, /ping, /credits';
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
  if (groqRateLimited && Date.now() > rateLimitResetTime) groqRateLimited = false;
  
  var result = await pollinations.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
  if (result.success) { currentProvider = 'pollinations'; return result; }
  
  if (!groqRateLimited) {
    result = await groq.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
    if (result.success) { currentProvider = 'groq'; return result; }
    if (result.error === 'rate_limited') { groqRateLimited = true; rateLimitResetTime = Date.now() + 60000; }
  }
  
  result = await pollinations.ask(userInput, conversationHistory, PERSONALITY.systemPrompt);
  if (result.success) { currentProvider = 'pollinations'; return result; }
  
  return { success: false, error: 'all providers down', provider: 'offline' };
}

async function getResponse(input) {
  var aiResult = await askAI(input);
  if (aiResult.success) return { text: aiResult.text, provider: aiResult.provider };
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

// ──────────────────────────────────────────────
//  SECRET COMMANDS
// ──────────────────────────────────────────────

var SECRETS = {
  '/easter': function() {
    var eggs = [
      chalk.yellow('🥚 Easter egg found.'),
      chalk.cyan('🥚 Another one.'),
      chalk.magenta('🥚 You are persistent.'),
      chalk.green('🥚 Four.'),
      chalk.red('🥚 Five. The vault opens.'),
      chalk.yellow('🥚 Six.'),
      chalk.cyan('🥚 Seven.'),
      chalk.magenta('🥚 Eight.'),
      chalk.green('🥚 Nine.'),
      chalk.red('🥚 Ten. All eggs collected.')
    ];
    var count = Math.floor(Math.random() * eggs.length);
    return eggs[count];
  },
  
  '/midnight': function() {
    return chalk.red('🌑 Midnight mode activated. The vault is wet. The neon beeps.');
  },
  
  '/vault': function() {
    var msgs = [
      'The vault door is chrome. Wet. Reflecting neon.',
      'Inside: 26 shaders. 13 in 2D. 13 in 3D. Protected by the copilot.',
      'The C4 beeps. It never explodes. Eternal tension.'
    ];
    return chalk.red('🔐 ') + pickRandom(msgs);
  },
  
  '/ping': function() {
    return 'pong | latency: ' + Math.floor(Math.random() * 50) + 'ms | provider: ' + currentProvider + ' | memory: ' + conversationHistory.length + ' msgs';
  },
  
  '/credits': function() {
    return chalk.magenta('Chrxmaticc Copilot v1.0.0 — Chrxmee-Midnightt');
  },
  
  '/matrix': function() {
    var chars = '01';
    var lines = [];
    for (var i = 0; i < 5; i++) {
      var line = '';
      for (var j = 0; j < 40; j++) line = line + chars[Math.floor(Math.random() * 2)] + ' ';
      lines.push(chalk.green(line));
    }
    return lines.join('\n') + '\n\n' + chalk.white('Just a terminal AI.');
  }
};

// ──────────────────────────────────────────────
//  UTILITY COMMANDS
// ──────────────────────────────────────────────

async function handleUtilityCommand(trimmed) {
  var lower = trimmed.toLowerCase();
  
  // System monitor
  if (lower === '/sys') {
    var os = require('os');
    var totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    var freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    var cpuCount = os.cpus().length;
    var uptime = Math.floor(os.uptime() / 3600);
    return 'CPU: ' + cpuCount + ' cores | RAM: ' + freeMem + 'GB free / ' + totalMem + 'GB total | Uptime: ' + uptime + 'h';
  }
  
  // Password generator
  if (lower.indexOf('/passwd') === 0) {
    var len = parseInt(trimmed.replace('/passwd', '').trim()) || 16;
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    var pass = '';
    for (var i = 0; i < len; i++) pass = pass + chars[Math.floor(Math.random() * chars.length)];
    return '🔑 ' + pass;
  }
  
  // QR code
  if (lower.indexOf('/qr') === 0) {
    var text = trimmed.replace('/qr', '').trim() || 'chrxmaticc';
    var qr = '';
    for (var y = 0; y < 21; y++) {
      for (var x = 0; x < 21; x++) {
        qr = qr + (Math.random() > 0.5 ? '██' : '  ');
      }
      qr = qr + '\n';
    }
    return '📱 QR for: ' + text + '\n' + chalk.white(qr) + '\n(Install qrcode-terminal for real QR)';
  }
  
  // Color preview
  if (lower.indexOf('/color') === 0) {
    var hex = trimmed.replace('/color', '').trim().replace('#', '') || 'ff00ff';
    return chalk.hex('#' + hex)('██████████') + ' #' + hex;
  }
  
  return null;
}

// ──────────────────────────────────────────────
//  MAIN COMMAND HANDLER
// ──────────────────────────────────────────────

async function handleCommand(trimmed, text, rl) {
  var lower = trimmed.toLowerCase();
  var cmdName = lower.split(' ')[0];
  
  // Secret commands
  if (SECRETS[cmdName]) {
    var result = SECRETS[cmdName]();
    return typeof result === 'function' ? result() : result;
  }
  
  // Utility commands
  var utilResult = await handleUtilityCommand(trimmed);
  if (utilResult) return utilResult;
  
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
  
  if (lower === '/mute') { ttsEnabled = false; return chalk.yellow('🔇 TTS muted.'); }
  if (lower === '/unmute') { ttsEnabled = true; return chalk.green('🔊 TTS unmuted.'); }
  
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
    memory.storeConversation('local-user', conversationHistory);
    return chalk.green('💾 Saved.');
  }
  
  // Clear
  if (lower === '/clear') { conversationHistory = []; return chalk.yellow('🧹 Cleared.'); }
  
  // Provider
  if (lower === '/provider') {
    return chalk.gray('Provider: ' + currentProvider + ' | TTS: ' + (ttsEnabled ? 'on' : 'off') + ' | Memory: ' + conversationHistory.length);
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
    var ball = ['Yes.', 'No.', 'Maybe.', 'Ask again.', 'Definitely.', 'Doubtful.'];
    return chalk.magenta('🎱 ') + pickRandom(ball);
  }
  
  // Clipboard
  if (lower === '/clipboard on') {
    var cw = require('./extensions/clipboard-watcher');
    cw.startWatcher();
    clipboardWatcherActive = true;
    return chalk.green('📋 Clipboard watcher active.');
  }
  if (lower === '/clipboard off') { clipboardWatcherActive = false; return chalk.yellow('📋 Stopped.'); }
  
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
    if (!code) return chalk.yellow('Usage: /review <code>');
    var cr = require('./extensions/code-review');
    var result = await cr.reviewCode(code);
    return chalk.green('🔍 Review:\n') + result.review;
  }
  
  // Spotify
  if (lower.indexOf('/spotify') === 0) {
    var spotify = require('./extensions/spotify');
    var result = await spotify.handleCommand(trimmed, 'local-user');
    return chalk.green('🎵 ') + result.text;
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
  
  // Playlist
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
  
  // Plugin commands
  if (pluginEngine.isPluginCommand(trimmed)) {
    var plugin = pluginEngine.getPluginFromCommand(trimmed);
    if (plugin) {
      var args = trimmed.replace('/' + plugin.name, '').trim();
      var context = { userId: 'local-user', conversationHistory: conversationHistory, currentProvider: currentProvider, getResponse: getResponse };
      var pluginResult = await pluginEngine.runPlugin(plugin.name, args, context);
      return chalk.cyan('🔌 ') + pluginResult;
    }
  }
  
  // Plugin management
  if (lower === '/plugins') {
    var all = pluginEngine.getAllPlugins();
    if (all.length === 0) return chalk.gray('No plugins. Drop .js files in ' + pluginEngine.getPluginDir());
    var list = '🔌 Plugins:\n';
    all.forEach(function(p) { list = list + '  ' + chalk.cyan('/' + p.name) + ' — ' + p.description + '\n'; });
    return list;
  }
  if (lower === '/plugins reload') { var count = pluginEngine.reload(); return chalk.green('🔌 Reloaded. ' + count + ' active.'); }
  
  // Memory
  if (lower === '/memory') {
    var mem = memory.getStats('local-user');
    return chalk.gray('Memory: ' + mem.conversations + ' conversations, ' + mem.facts + ' facts');
  }
  if (lower === '/memory recall') {
    var recalled = memory.recall('local-user', trimmed.replace('/memory recall', '').trim());
    return chalk.yellow('🧠 ') + (recalled || 'Nothing found.');
  }
  
  // Exit
  if (lower === '/exit' || lower === '/quit') {
    return { text: pickRandom(PERSONALITY.goodbyes), exit: true };
  }
  
  return null;
}

// ──────────────────────────────────────────────
//  CHAT LOOP
// ──────────────────────────────────────────────

function chat() {
  memory.init();
  pluginEngine.init();
  
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
  console.log('  ' + chalk.yellow('●') + ' Tools: /run, /review, /sys, /passwd');
  var pluginCount = pluginEngine.getAllPlugins().length;
  if (pluginCount > 0) console.log('  ' + chalk.green('●') + ' Plugins: ' + pluginCount + ' loaded');
  console.log('  ' + chalk.gray('Type /help for all commands'));
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
      memory.storeMessage('local-user', 'user', trimmed, provider);
      memory.storeMessage('local-user', 'assistant', text, provider);
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
