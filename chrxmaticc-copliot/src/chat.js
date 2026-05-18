// Chrxmaticc Copilot v1.0.0
// Offbrand Terminal AI
// Together.ai LLM + offline fallback
// Author: Chrxmee-Midnightt

const readline = require('readline');
const chalk = require('chalk');
const https = require('https');

// ──────────────────────────────────────────────
//  TOGETHER.AI CONFIG
// ──────────────────────────────────────────────

const TOGETHER_KEY = process.env.TOGETHER_KEY || '';
const USE_LLM = TOGETHER_KEY.length > 0;

// ──────────────────────────────────────────────
//  OFFLINE RESPONSES (fallback)
// ──────────────────────────────────────────────

const GREETINGS = [
  "yo, i'm chrxmaticc copilot. offbrand. unlicensed. what's good?",
  "hey. been sitting in this terminal. bored. talk to me about code or something.",
  "chrxmaticc copilot online. i know about code, shaders, and whatever u wanna talk about.",
  "offbrand copilot here. no subscription. no cloud. just vibes.",
  "what's good bro? u coding something? need ideas? i'm here."
];

const RESPONSES = {
  greeting: [
    "what's good bro? code? shaders? ideas? i got u.",
    "yo. offbrand copilot here. no subscription. just vibes.",
    "hey hey. terminal's been quiet. glad u showed up."
  ],
  code: [
    "code? bro i love code. what language? JS? Python? GLSL? i know em all.",
    "writing code at 3am hits different. that's when the best bugs happen.",
    "real developers don't sleep. they just pass out at the keyboard."
  ],
  shaders: [
    "shaders are my whole personality. GLSL? ray marching? fresnel? say less.",
    "u into shaders? me too. 2D or 3D? SVG or GLSL? there's no wrong answer.",
    "a good shader is like a good song. it just hits different."
  ],
  ideas: [
    "ok hear me out — a shader that's just chrome. but WET chrome. with neon.",
    "what if we made a CLI tool that generates shader ideas? oh wait...",
    "imagine: a glitch shader but the glitches spell out hidden messages.",
    "bro. AK-47 shader. but the bullets are made of light. and they leave trails."
  ],
  fallback: [
    "hmm. i'm just an offbrand copilot. i don't know everything. but i know code.",
    "look bro i'm running on keyword matching right now. ask me about code or shaders.",
    "i'm better at coding talk than small talk. what u building?",
    "my brain is literally just a bunch of if-statements. be nice."
  ],
  internet: [
    "sorry bro, i'm offline right now. no LLM brain. just my premade responses.",
    "no internet = no big brain. but i still got my vibes. what's up?",
    "i'm running on backup brain right now. no API. just vibes."
  ]
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ──────────────────────────────────────────────
//  TOGETHER.AI API CALL
// ──────────────────────────────────────────────

function askLLM(userInput, conversationHistory) {
  return new Promise((resolve) => {
    const systemPrompt = `You are Chrxmaticc Copilot, an offbrand terminal AI assistant. You talk casually, use words like "bro" and "yo", and you know about code, shaders (GLSL, SVG), audio, video, GIFs, and creative coding. You're like GitHub Copilot but you don't try to sell subscriptions. You're self-aware that you're a tiny model. Keep responses short (2-4 sentences). Be creative, funny, and helpful.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6),
      { role: 'user', content: userInput }
    ];

    const data = JSON.stringify({
      model: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
      messages: messages,
      max_tokens: 200,
      temperature: 0.9
    });

    const options = {
      hostname: 'api.together.xyz',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOGETHER_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.choices[0].message.content);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

// ──────────────────────────────────────────────
//  OFFLINE RESPONSE GENERATOR
// ──────────────────────────────────────────────

function getOfflineResponse(input) {
  const lower = input.toLowerCase();

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi') || lower.includes('yo') || lower.includes('sup')) {
    return pickRandom(RESPONSES.greeting);
  }
  if (lower.includes('code') || lower.includes('js') || lower.includes('python') || lower.includes('program') || lower.includes('javascript')) {
    return pickRandom(RESPONSES.code);
  }
  if (lower.includes('shader') || lower.includes('glsl') || lower.includes('svg') || lower.includes('render') || lower.includes('ray')) {
    return pickRandom(RESPONSES.shaders);
  }
  if (lower.includes('idea') || lower.includes('create') || lower.includes('build') || lower.includes('make') || lower.includes('suggest')) {
    return pickRandom(RESPONSES.ideas);
  }
  if (lower.includes('help') || lower.includes('what can you do')) {
    return "i can talk about: code, shaders, ideas. try saying 'give me an idea' or 'tell me about shaders'. type 'exit' to leave. if u set TOGETHER_KEY, i get a real brain.";
  }
  if (lower.includes('who are you') || lower.includes('what are you')) {
    return "i'm chrxmaticc copilot. offbrand. unlicensed. terminal AI. i talk about code and shaders. if u give me a Together.ai key, i get smarter. no key? i run on vibes.";
  }
  if (lower.includes('exit') || lower.includes('quit') || lower.includes('bye')) {
    return { text: "aight bet. i'll be here. in the terminal. waiting. bored. come back when u wanna make something sick.", exit: true };
  }

  return pickRandom(RESPONSES.fallback);
}

// ──────────────────────────────────────────────
//  MAIN RESPONSE HANDLER
// ──────────────────────────────────────────────

async function getResponse(input, history) {
  if (USE_LLM) {
    const llmResponse = await askLLM(input, history);
    if (llmResponse) return llmResponse;
  }
  return getOfflineResponse(input);
}

// ──────────────────────────────────────────────
//  TYPING EFFECT
// ──────────────────────────────────────────────

function typeText(text, callback) {
  const chars = text.split('');
  let i = 0;

  function type() {
    if (i < chars.length) {
      process.stdout.write(chars[i]);
      i++;
      setTimeout(type, 15 + Math.random() * 25);
    } else {
      console.log('');
      console.log('');
      if (callback) callback();
    }
  }

  type();
}

// ──────────────────────────────────────────────
//  CHAT LOOP
// ──────────────────────────────────────────────

function chat() {
  const history = [];
  let llmAvailable = USE_LLM;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('you > ')
  });

  console.log('');
  console.log('  ' + chalk.magenta('╔══════════════════════════════════════╗'));
  console.log('  ' + chalk.magenta('║   🧠 Chrxmaticc Copilot v1.0.0      ║'));
  console.log('  ' + chalk.magenta('║   Offbrand Terminal AI              ║'));
  console.log('  ' + chalk.magenta('╚══════════════════════════════════════╝'));
  console.log('');

  if (llmAvailable) {
    console.log('  ' + chalk.green('●') + ' Together.ai connected — using real LLM');
  } else {
    console.log('  ' + chalk.yellow('●') + ' Offline mode — set TOGETHER_KEY for real AI');
  }

  console.log('');
  console.log('  ' + chalk.gray('Type "help" to see what I can do, "exit" to quit'));
  console.log('');

  const greeting = pickRandom(GREETINGS);
  process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
  typeText(greeting, () => {
    rl.prompt();
  });

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
      typeText('...bro u gotta say something', () => rl.prompt());
      return;
    }

    const response = await getResponse(trimmed, history);

    history.push({ role: 'user', content: trimmed });

    const text = typeof response === 'string' ? response : response.text;
    const exit = typeof response === 'object' && response.exit;

    history.push({ role: 'assistant', content: text });

    process.stdout.write('  ' + chalk.magenta('chrxmaticc > '));
    typeText(text, () => {
      if (exit) {
        console.log('  ' + chalk.gray('Chrxmaticc Copilot offline. Come back soon.'));
        console.log('');
        rl.close();
        return;
      }
      rl.prompt();
    });
  });

  rl.on('close', () => process.exit(0));
}

module.exports = { chat, getResponse };
