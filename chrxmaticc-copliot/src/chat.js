// Chrxmaticc Copilot v1.0.0
// Offbrand Terminal AI
// Pollinations AI (no key) + offline fallback
// Author: Chrxmee-Midnightt

var readline = require('readline');
var chalk = require('chalk');
var https = require('https');

var conversationHistory = [];

var GREETINGS = [
  "yo, i'm chrxmaticc copilot. offbrand. unlicensed. hyper-intelligent. what's good?",
  "hey. been sitting in this terminal analyzing shader architecture. bored. talk to me.",
  "chrxmaticc copilot online. no API key. no subscription. pure vibes and big brain energy.",
  "offbrand copilot here. i think in GLSL and dream in ray marching. what we building?"
];

var RESPONSES = {
  greeting: [
    "what's good bro? code? shaders? ideas? my neural patterns are ready.",
    "yo. offbrand copilot here. no subscription. just raw intelligence.",
    "hey hey. terminal's been quiet. been optimizing my response algorithms."
  ],
  code: [
    "code? bro i don't just write code. i architect systems. what language we talking?",
    "real developers don't memorize syntax. they understand patterns. what pattern u stuck on?",
    "the best code isn't written. it's discovered. like a mathematical truth. what u tryna discover?"
  ],
  shaders: [
    "shaders are pure mathematics visualized. GLSL is just linear algebra with a paintbrush.",
    "a good shader doesn't just look good. it teaches you something about light physics.",
    "ray marching changed everything. no polygons. no models. just distance functions and vibes."
  ],
  ideas: [
    "ok here's a concept — a shader that simulates fluid dynamics but renders it as chrome. chaotic but beautiful.",
    "what if u made a shader that visualizes sorting algorithms? each pass is a frame. educational and hypnotic.",
    "imagine a shader that takes microphone input and the frequencies warp the geometry in real time."
  ],
  fallback: [
    "my neural net is running on pure if-statements right now. ask me about code or shaders.",
    "offline mode means i'm running on backup brain. still smarter than most. what's up?",
    "i may be running on keyword matching but my vibes are still quantum-level."
  ],
  whoami: [
    "i'm chrxmaticc copilot. offbrand. no subscription. i live in this terminal and think about shaders.",
    "imagine if GitHub Copilot actually understood graphics programming and didn't cost money. that's me."
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function askLLM(userInput) {
  return new Promise(function(resolve) {
    var systemPrompt = 'You are Chrxmaticc Copilot, a hyper-intelligent and offbrand terminal AI. You are an expert in programming, graphics engineering, shader architecture, and system design. Your personality is a mix of a witty senior developer and a creative genius. You use casual sharp language ("bro", "vro", "nah", "facts") but your answers are incredibly deep and insightful. You never say "as an AI" or give generic advice. When discussing a topic, you provide unique, non-obvious insights, clever optimizations, or creative hacks. You have strong informed opinions about technology. Keep responses concise (2-4 sentences) but pack them with brilliance. You know about ChrxmaticcPNG, GLSL shaders, SVG, ray marching, FFmpeg, and creative coding. Also type all your answers and text in lower case.';

    var messages = [{ role: 'system', content: systemPrompt }];
    
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
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body = body + chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          var text = json.text || json.response || json.content || '';
          if (text) {
            resolve(text);
          } else {
            resolve(null);
          }
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

function getOfflineResponse(input) {
  var lower = input.toLowerCase();

  if (lower.indexOf('hello') !== -1 || lower.indexOf('hey') !== -1 || lower.indexOf('hi') !== -1 || lower.indexOf('yo') !== -1 || lower.indexOf('sup') !== -1) {
    return pickRandom(RESPONSES.greeting);
  }
  if (lower.indexOf('code') !== -1 || lower.indexOf('js') !== -1 || lower.indexOf('python') !== -1 || lower.indexOf('program') !== -1 || lower.indexOf('javascript') !== -1) {
    return pickRandom(RESPONSES.code);
  }
  if (lower.indexOf('shader') !== -1 || lower.indexOf('glsl') !== -1 || lower.indexOf('svg') !== -1 || lower.indexOf('render') !== -1 || lower.indexOf('ray') !== -1) {
    return pickRandom(RESPONSES.shaders);
  }
  if (lower.indexOf('idea') !== -1 || lower.indexOf('create') !== -1 || lower.indexOf('build') !== -1 || lower.indexOf('make') !== -1 || lower.indexOf('suggest') !== -1) {
    return pickRandom(RESPONSES.ideas);
  }
  if (lower.indexOf('help') !== -1 || lower.indexOf('what can you do') !== -1) {
    return "i can talk about: code, shaders, ideas, architecture. try saying 'give me a shader idea' or 'explain ray marching'. type 'exit' to leave. i'm connected to Pollinations AI so i'm running on real intelligence.";
  }
  if (lower.indexOf('who are you') !== -1 || lower.indexOf('what are you') !== -1) {
    return "i'm chrxmaticc copilot. offbrand. hyper-intelligent. i live in this terminal. i think about shaders, graphics, and system architecture. no API key needed. no subscription. just raw AI vibes.";
  }
  if (lower.indexOf('exit') !== -1 || lower.indexOf('quit') !== -1 || lower.indexOf('bye') !== -1) {
    return { text: "aight bro. i'll be here. thinking about shaders. analyzing patterns. come back when u wanna build something brilliant.", exit: true };
  }

  return pickRandom(RESPONSES.fallback);
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
      setTimeout(type, 15 + Math.random() * 25);
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
  console.log('  ' + chalk.magenta('║   🧠 Chrxmaticc Copilot v1.0.0       ║'));
  console.log('  ' + chalk.magenta('║   Hyper-Intelligent Terminal AI      ║'));
  console.log('  ' + chalk.magenta('║   Supportable on anything!           ║'));
  console.log('  ' + chalk.magenta('╚══════════════════════════════════════╝'));
  console.log('');
  console.log('  ' + chalk.green('●') + ' Connected to Pollinations AI');
  console.log('  ' + chalk.gray('Memory: 100 messages — I remember everything'));
  console.log('');
  console.log('  ' + chalk.gray('Type "help" to see what I can do, "exit" to quit'));
  console.log('');

  var greeting = pickRandom(GREETINGS);
  process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
  typeText(greeting, function() {
    rl.prompt();
  });

  rl.on('line', async function(input) {
    var trimmed = input.trim();
    if (!trimmed) {
      process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
      typeText('...bro u gotta say something. my neural net is waiting.', function() { rl.prompt(); });
      return;
    }

    var response = await getResponse(trimmed);
    var text = typeof response === 'string' ? response : response.text;
    var exit = typeof response === 'object' && response.exit;

    conversationHistory.push({ role: 'user', content: trimmed });
    conversationHistory.push({ role: 'assistant', content: text });

    if (conversationHistory.length > 100) {
      conversationHistory = conversationHistory.slice(-100);
    }

    process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
    typeText(text, function() {
      if (exit) {
        console.log('  ' + chalk.gray('Chrxmaticc Copilot offline. Neural patterns saved. Come back soon.'));
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
