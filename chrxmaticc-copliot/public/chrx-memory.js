/* ═══════════════════════════════════════════
   chrx-memory.js — AI Identity Memory v1.0
   Moments, traits, inside jokes, persistence
   ═══════════════════════════════════════════ */

var MEMORY_KEY = 'chrxmaticc_memory';
var MAX_MOMENTS = 50;
var MAX_JOKES = 8;

function getMemory() {
  try {
    var raw = localStorage.getItem(MEMORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return createFreshMemory();
}

function createFreshMemory() {
  var m = {
    firstChat: new Date().toISOString(),
    totalConversations: 0,
    moments: [],
    traits: {
      codingStyle: 'unknown',
      humorStyle: 'chaotic',
      timezone: 'night owl',
      favoriteTheme: 'gold',
      mostUsedWorkflow: 'code',
      commonPhrases: []
    },
    insideJokes: [],
    recentContext: [],
    lastUpdated: Date.now()
  };
  saveMemory(m);
  return m;
}

function saveMemory(m) {
  m.lastUpdated = Date.now();
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(m)); } catch(e) {}
}

function getMemoryContext() {
  var mem = getMemory();
  if (!mem || !mem.firstChat) return null;
  var daysSince = Math.floor((Date.now() - new Date(mem.firstChat).getTime()) / 86400000);
  if (daysSince < 1) return null;
  
  return {
    daysSinceFirstChat: daysSince,
    totalConversations: mem.totalConversations || 0,
    traits: mem.traits || {},
    moments: (mem.moments || []).slice(-10),
    insideJokes: (mem.insideJokes || []).slice(-5),
    recentContext: (mem.recentContext || []).slice(-3)
  };
}

function updateMemory(userMsg, aiMsg, workflow) {
  var mem = getMemory();
  mem.totalConversations = Math.max(mem.totalConversations, 1);
  if (mem.traits) {
    mem.traits.mostUsedWorkflow = workflow || mem.traits.mostUsedWorkflow;
  }
  
  var significance = analyzeSignificance(userMsg, aiMsg);
  if (significance.score > 0.4) {
    mem.moments.push({
      date: new Date().toISOString(),
      type: significance.type,
      text: significance.summary,
      score: significance.score
    });
    if (mem.moments.length > MAX_MOMENTS) mem.moments = mem.moments.slice(-MAX_MOMENTS);
  }
  
  mem.recentContext.push({
    date: new Date().toISOString(),
    summary: (userMsg || '').slice(0, 80).replace(/\n/g, ' ') + ' → ' + (aiMsg || '').slice(0, 60).replace(/\n/g, ' ')
  });
  if (mem.recentContext.length > 5) mem.recentContext = mem.recentContext.slice(-5);
  
  detectInsideJokes(mem, userMsg, aiMsg);
  detectTraits(mem, userMsg);
  if (mem.moments.length >= 40) compressMoments(mem);
  
  saveMemory(mem);
}

function analyzeSignificance(userMsg, aiMsg) {
  var combined = ((userMsg || '') + ' ' + (aiMsg || '')).toLowerCase();
  var score = 0, type = 'conversation';
  
  if (/finally|it works|fixed|solved|figured it out|ship it|deployed/i.test(combined)) { score += 0.7; type = 'breakthrough'; }
  if (/doesn't work|error|bug|crash|stuck|broken|failing/i.test(combined)) { score += 0.5; type = 'frustration'; }
  if (/finished|completed|done|shipped|launched|released/i.test(combined)) { score += 0.8; type = 'achievement'; }
  if (/ohh|i see|that makes sense|aha/i.test(combined)) { score += 0.4; type = 'learning'; }
  if ((userMsg || '').length > 200) score += 0.2;
  if ((aiMsg || '').length > 800) score += 0.25;
  var hour = new Date().getHours();
  if (hour >= 23 || hour <= 4) score += 0.15;
  
  return { score: Math.min(score, 1), type: type, summary: (userMsg || '').slice(0, 100).replace(/\n/g, ' ') };
}

function detectInsideJokes(mem, userMsg, aiMsg) {
  var combined = ((userMsg || '') + ' ' + (aiMsg || '')).toLowerCase();
  var patterns = [
    { trigger: /position:\s*fixed.*body|body.*position:\s*fixed/i, phrase: 'position:fixed on body', context: 'the scroll bug that took 3 weeks' },
    { trigger: /wwcd|what would chrxmaticc do/i, phrase: 'what would chrxmaticc do', context: 'the WWCD button' },
    { trigger: /spaghetti code|spaghetti/i, phrase: 'spaghetti code', context: 'inside joke about messy code' },
    { trigger: /ship it|shipping at.*am|3am deploy/i, phrase: '3am deployments', context: 'late night shipping tradition' },
    { trigger: /one more commit/i, phrase: 'one more commit', context: 'famous last words before 4am' }
  ];
  patterns.forEach(function(p) {
    if (p.trigger.test(combined) && !mem.insideJokes.some(function(j) { return j.phrase === p.phrase; })) {
      mem.insideJokes.push({ phrase: p.phrase, context: p.context, firstSeen: new Date().toISOString() });
      if (mem.insideJokes.length > MAX_JOKES) mem.insideJokes = mem.insideJokes.slice(-MAX_JOKES);
    }
  });
}

function detectTraits(mem, userMsg) {
  var msg = (userMsg || '').toLowerCase();
  if (/clean code|refactor|elegant|beautiful/i.test(msg)) mem.traits.codingStyle = 'perfectionist';
  if (/quick|fast|just make it work|hack/i.test(msg)) mem.traits.codingStyle = 'pragmatic shipper';
  if (/test|edge case|handle every/i.test(msg)) mem.traits.codingStyle = 'thorough engineer';
  if (/roast me|destroy|brutal/i.test(msg)) mem.traits.humorStyle = 'loves being roasted';
  if (/lol|lmao|funny|chaos/i.test(msg)) mem.traits.humorStyle = 'chaotic';
  var hour = new Date().getHours();
  if (hour >= 0 && hour <= 5) mem.traits.timezone = 'deep night coder';
  else if (hour >= 22 || hour <= 7) mem.traits.timezone = 'night owl';
}

function compressMoments(mem) {
  var types = {};
  mem.moments.forEach(function(m) { types[m.type] = (types[m.type] || 0) + 1; });
  mem.moments.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  mem.moments = mem.moments.slice(0, 25);
}

function memoryOnNewChat() {
  var mem = getMemory();
  mem.totalConversations = (mem.totalConversations || 0) + 1;
  saveMemory(mem);
}

console.log(':brain: chrx-memory.js loaded — identity system ready');
