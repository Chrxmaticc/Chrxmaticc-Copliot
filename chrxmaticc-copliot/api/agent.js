// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Agentic API       ║
// ║  Workflows • AI QA • Tools • Memory     ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

var GROQ_KEY = process.env.GROQ_KEY || '';
var GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
var VISION_URL = 'https://image.pollinations.ai/describe';

var path = require('path');
var fs = require('fs');

var PERSONALITIES = {};
var personalitiesDir = path.join(__dirname, '..', 'src', 'personalities');
if (fs.existsSync(personalitiesDir)) {
  fs.readdirSync(personalitiesDir).filter(function(f) { return f.endsWith('.js'); }).forEach(function(f) {
    var p = require(path.join(personalitiesDir, f));
    PERSONALITIES[f.replace('.js', '')] = p;
  });
}

var DEFAULT_PERSONALITY = PERSONALITIES['conversational'] || {
  name: 'Copilot Conversational',
  systemPrompt: 'You are Chrxmaticc Copilot. Be helpful, casual, and concise.',
  temperature: 0.8,
  maxTokens: 650,
  model: 'llama-3.3-70b-versatile'
};

var IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.avif'];

var WORKFLOW_PROMPTS = {
  code: '',
  think: '\n\n[system: think deeply before answering. break logic down step-by-step in a thinking block before writing code. show your reasoning.]',
  plan: '\n\n[system: PLAN MODE. you are helping the user plan something. ask ONE question at a time. present 3-5 clickable options AND a "Custom" option. questions must be relevant to what the user asked. after gathering enough info (4-6 questions), present the complete plan as a structured document and offer to switch to code mode.]',
  review: '\n\n[system: REVIEW MODE. analyze the code for bugs, security issues, performance problems. rate each issue by severity. give overall rating out of 10. be brutally honest.]',
  surprise: '\n\n[system: CHAOS MODE. over-engineer with features nobody asked for. add animations, particle effects, easter eggs. code must work but be absurdly over-the-top. roast the user.]',
  cancel: ''
};

var EFFORT_LEVELS = {
  low: { maxTokens: 500, temperature: 0.8, addition: '\n\n[effort: low — minimal working code. skip edge cases and docs.]' },
  medium: { maxTokens: 1000, temperature: 0.7, addition: '\n\n[effort: medium — clean functional code with basic error handling.]' },
  high: { maxTokens: 2000, temperature: 0.6, addition: '\n\n[effort: high — thorough optimized code with edge cases and docs.]' },
  extreme: { maxTokens: 4000, temperature: 0.5, addition: '\n\n[effort: extreme — go all in. every edge case, full docs, tests, optimization, accessibility. make it a masterpiece.]' }
};

var BUTTON_PROMPTS = {
  types: '\n\n[use TypeScript for all code]',
  docs: '\n\n[generate JSDoc/documentation for every function]',
  optimize: '\n\n[after writing code, suggest 3 performance optimizations]',
  explain: '\n\n[explain every decision as you code]',
  compare: '\n\n[after coding, show 2 alternative approaches with tradeoffs]',
  test: '\n\n[auto-generate test cases for the code]',
  animate: '\n\n[add CSS animations and transitions]',
  theme: '\n\n[generate light + dark mode variants]',
  accessible: '\n\n[ensure WCAG compliance and screen reader support]',
  minimal: '\n\n[strip code to bare essentials]',
  reuse: '\n\n[prefer existing libraries over custom code]',
  ship: '\n\n[add build config and deployment notes]',
  inline: '\n\n[single-file output only]',
  nocomments: '\n\n[strip all comments]',
  instant: '\n\n[skip explanation, just the code]',
  security: '\n\n[focus on security vulnerabilities]',
  performance: '\n\n[focus on performance bottlenecks]',
  patterns: '\n\n[check design pattern usage]',
  readability: '\n\n[focus on readability and naming]',
  clarity: '\n\n[ensure code is self-documenting]',
  architecture: '\n\n[focus on architecture tradeoffs]',
  deep: '\n\n[provide deep technical analysis]',
  guided: '\n\n[guided walkthrough style]',
  beginner: '\n\n[beginner-friendly explanations]',
  examples: '\n\n[include practical examples]',
  creative: '\n\n[inject creative chaos]',
  wholesome: '\n\n[be encouraging and supportive]',
  overengineer: '\n\n[over-engineer to absurd levels]',
  polyglot: '\n\n[show solutions in multiple languages]',
  design: '\n\n[focus on visual design]',
  ux: '\n\n[focus on user experience]',
  experimental: '\n\n[try experimental approaches]',
  glitch: '\n\n[embrace glitch art and chaos]',
  efficient: '\n\n[prioritize efficiency]',
  practical: '\n\n[focus on practical solutions]',
  useful: '\n\n[make the chaos useful]',
  shortcuts: '\n\n[use clever shortcuts]',
  rapid: '\n\n[plan rapidly]',
  bullet: '\n\n[bullet points only]',
  quick: '\n\n[quick review, major issues only]',
  critical: '\n\n[critical issues only]',
  snap: '\n\n[snap judgment]',
  random: '\n\n[completely random]',
  speedrun: '\n\n[speedrun mode]',
  scalability: '\n\n[focus on scalability]',
  tradeoffs: '\n\n[show tradeoffs between approaches]',
  moodboard: '\n\n[create visual mood board]',
  mood: '\n\n[analyze mood and tone]',
  a11y: '\n\n[audit accessibility]',
  simplicity: '\n\n[simplify the code]',
  alternatives: '\n\n[explore alternatives]',
  visual: '\n\n[use visual thinking]'
};

// ═══════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var body = req.body || {};
  var message = body.message || '';
  var personality = body.personality || 'conversational';
  var workflow = body.workflow || 'code';
  var effort = body.effort || 'medium';
  var roastLevel = body.roastLevel || 50;
  var buttons = body.buttons || {};
  var fileName = body.fileName || '';
  var fileType = body.fileType || '';
  var imageUrl = body.imageUrl || '';
  var planHistory = body.planHistory || [];

  if (!message && !imageUrl && !body.fileContent) {
    return res.status(400).json({ error: 'Missing message' });
  }

  var selectedPersonality = PERSONALITIES[personality] || DEFAULT_PERSONALITY;
  var systemPrompt = selectedPersonality.systemPrompt;
  var model = selectedPersonality.model || 'llama-3.3-70b-versatile';
  var temperature = selectedPersonality.temperature || 0.8;
  var maxTokens = selectedPersonality.maxTokens || 650;

  // Apply effort
  var effortConfig = EFFORT_LEVELS[effort] || EFFORT_LEVELS.medium;
  if (workflow === 'code') {
    maxTokens = effortConfig.maxTokens;
    temperature = effortConfig.temperature;
    systemPrompt += effortConfig.addition;
  }

  // Apply workflow prompt
  systemPrompt += WORKFLOW_PROMPTS[workflow] || '';

  // Apply button toggles
  for (var btn in buttons) {
    if (buttons[btn] && BUTTON_PROMPTS[btn]) systemPrompt += BUTTON_PROMPTS[btn];
  }

  // Roast level
  if (roastLevel > 0) {
    systemPrompt += '\n\n[roast level: ' + roastLevel + '%. ' + (roastLevel >= 75 ? 'brutally honest, roast hard.' : roastLevel >= 50 ? 'keep madman tone, light roasts.' : roastLevel >= 25 ? 'mildly sarcastic.' : 'helpful, minimal roasts.') + ']';
  }

  if (body.personalInfo) {
    systemPrompt += '\n\nUser context: ' + body.personalInfo;
  }

  // ── IMAGE HANDLING ──
  var isImage = false;
  if (fileType && fileType.startsWith('image/')) isImage = true;
  if (fileName) { var ext = '.' + fileName.split('.').pop().toLowerCase(); if (IMAGE_EXTENSIONS.indexOf(ext) !== -1) isImage = true; }
  if (imageUrl) isImage = true;

  if (isImage) {
    try {
      var descUrl = imageUrl || body.fileContent || '';
      var description = await describeImage(descUrl);
      if (description) {
        message = '[Image description: ' + description + ']\n\nUser: ' + (message || 'What do you see?');
        systemPrompt += ' The user uploaded an image. A description is provided. Respond as if you can see it.';
      }
    } catch(e) {}
  }

  // ── TEXT FILE HANDLING ──
  if (body.fileContent && !isImage) {
    message = '[File: ' + (fileName || 'unknown') + ']\nContent:\n' + String(body.fileContent).slice(0, 3000) + '\n\nUser: ' + (message || 'See attached file.');
  }

  // ═══════════════════════════════════════
  //  PLAN WORKFLOW — AI asks the questions
  // ═══════════════════════════════════════
  if (workflow === 'plan') {
    var planContext = '';
    if (planHistory.length > 0) {
      planContext = '\n\nPlan progress so far:\n' + planHistory.map(function(a, i) {
        return 'Q' + (i + 1) + ': ' + a.question + '\nA' + (i + 1) + ': ' + a.answer;
      }).join('\n');
    }

    var planSystemPrompt = systemPrompt + '\n\n' +
      'CRITICAL INSTRUCTIONS FOR PLAN MODE:\n' +
      '1. You are in an interactive planning session. Do NOT write code.\n' +
      '2. Ask the user ONE question at a time about their project.\n' +
      '3. Present exactly 3-5 clickable options plus a "Custom" option.\n' +
      '4. Format your response EXACTLY like this:\n' +
      'QUESTION: [your one-sentence question here]\n' +
      'OPTIONS:\n' +
      '- [Option 1]\n' +
      '- [Option 2]\n' +
      '- [Option 3]\n' +
      '- Custom\n' +
      '5. Make questions relevant to the project being planned.\n' +
      '6. After 5-6 questions, present the COMPLETE PLAN as a structured document.\n' +
      '7. When presenting the final plan, start with "PLAN COMPLETE:"' + planContext;

    var planMessage = planHistory.length === 0 ? message : 'Continue the planning. Ask the next question.';

    if (planHistory.length >= 5) {
      planMessage += '\n\n[You have enough information. Present the COMPLETE PLAN now. Start with PLAN COMPLETE:]';
    }

    try {
      var planResponse = await askGroq(planSystemPrompt, planMessage, model, 0.7, 800);
      var parsed = parsePlanOutput(planResponse);

      if (parsed.type === 'qa') {
        res.status(200).json({
          type: 'qa',
          question: parsed.question,
          options: parsed.options
        });
      } else {
        res.status(200).json({
          response: parsed.text || planResponse,
          provider: 'groq',
          model: model,
          planComplete: true
        });
      }
    } catch(e) {
      res.status(200).json({ response: getFallback(message), provider: 'offline' });
    }
    return;
  }

  // ═══════════════════════════════════════
  //  ALL OTHER WORKFLOWS
  // ═══════════════════════════════════════
  try {
    var reply = await askGroq(systemPrompt, message, model, temperature, maxTokens);
    var isCode = workflow === 'code' && (reply.indexOf('```') !== -1 || reply.indexOf('function') !== -1 || reply.indexOf('const') !== -1 || reply.indexOf('import') !== -1 || reply.indexOf('<!DOCTYPE') !== -1 || reply.indexOf('<html') !== -1);
    res.status(200).json({
      response: reply,
      provider: 'groq',
      model: model,
      codePreview: isCode
    });
  } catch(e) {
    res.status(200).json({ response: getFallback(message), provider: 'offline' });
  }
};

// ═══════════════════════════════════════════
//  PARSE PLAN OUTPUT
// ═══════════════════════════════════════════
function parsePlanOutput(text) {
  // Check if plan is complete
  if (text.indexOf('PLAN COMPLETE') !== -1) {
    return { type: 'plan', text: text.replace('PLAN COMPLETE:', '').trim() };
  }

  // Extract QUESTION
  var questionMatch = text.match(/QUESTION:\s*(.+?)(?:\n|$)/i);
  if (!questionMatch) {
    // Maybe the AI just wrote a plan or answered normally
    return { type: 'text', text: text };
  }

  var question = questionMatch[1].trim();

  // Extract OPTIONS
  var optionsMatch = text.match(/OPTIONS:\s*([\s\S]+?)(?:\n\n|$)/i);
  var options = [];
  if (optionsMatch) {
    var optionLines = optionsMatch[1].split('\n');
    for (var line of optionLines) {
      var cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned && cleaned !== 'OPTIONS:' && options.length < 6) {
        options.push(cleaned);
      }
    }
  }

  // Ensure we have options
  if (options.length === 0) {
    options = ['Yes', 'No', 'Custom'];
  }

  // Ensure Custom is always an option
  if (options.indexOf('Custom') === -1 && options.indexOf('custom') === -1) {
    options.push('Custom');
  }

  return { type: 'qa', question: question, options: options };
}

// ═══════════════════════════════════════════
//  GROQ CALL
// ═══════════════════════════════════════════
async function askGroq(systemPrompt, userMessage, model, temperature, maxTokens) {
  if (!GROQ_KEY) throw new Error('no key');

  var response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_KEY
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  var json = await response.json();
  if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
    return json.choices[0].message.content;
  }
  if (json.error) throw new Error(json.error.message || 'groq error');
  throw new Error('empty response');
}

// ═══════════════════════════════════════════
//  IMAGE DESCRIPTION (Pollinations)
// ═══════════════════════════════════════════
async function describeImage(imageUrl) {
  if (!imageUrl || imageUrl.indexOf('blob:') === 0 || imageUrl.indexOf('data:') === 0) return null;
  try {
    var response = await fetch(VISION_URL + '?url=' + encodeURIComponent(imageUrl));
    var text = await response.text();
    if (text && text.length > 10 && text.indexOf('error') === -1 && text.indexOf('Queue full') === -1) return text.trim();
    return null;
  } catch(e) { return null; }
}

// ═══════════════════════════════════════════
//  FALLBACK
// ═══════════════════════════════════════════
function getFallback(input) {
  var lower = (input || '').toLowerCase();
  if (lower.indexOf('hello') !== -1) return 'Yo! What\'s good?';
  if (lower.indexOf('help') !== -1) return 'Commands: /image, /weather, /crypto, /roll, /joke, /speak. Attach files with the link button.';
  return 'I\'m in offline mode. Limited responses but still here.';
}
