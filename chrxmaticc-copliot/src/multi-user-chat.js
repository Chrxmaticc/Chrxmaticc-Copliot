var chalk = require('chalk');
// Chrxmaticc Copilot — Multi-User Chat Engine
// Isolated memory per user. Shared AI providers.
// Author: Chrxmee-Midnightt

var PERSONALITY = require('./personality');
var pollinations = require('./apis/pollinations');
var groq = require('./apis/groq');

var userMemories = {};
var groqRateLimited = false;
var rateLimitResetTime = 0;

function getUserMemory(userId) {
  if (!userMemories[userId]) {
    userMemories[userId] = {
      history: [],
      createdAt: Date.now(),
      messageCount: 0
    };
  }
  return userMemories[userId];
}

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
  
  if (lower.indexOf('hello') !== -1 || lower.indexOf('hey') !== -1 || lower.indexOf('hi') !== -1) {
    return pickRandom(responses.greeting);
  }
  if (lower.indexOf('help') !== -1) {
    return 'multi-user mode. each user has their own memory. commands: /memory, /clear. powered by Pollinations + Groq.';
  }
  if (lower.indexOf('/memory') === 0) {
    return null;
  }
  if (lower.indexOf('/clear') === 0) {
    return null;
  }
  if (lower.indexOf('who are you') !== -1) {
    return pickRandom(responses.whoami);
  }
  
  return pickRandom(responses.fallback);
}

async function askAI(userInput, userId) {
  var memory = getUserMemory(userId);
  
  if (groqRateLimited && Date.now() > rateLimitResetTime) {
    groqRateLimited = false;
  }
  
  var result = await pollinations.ask(userInput, memory.history, PERSONALITY.systemPrompt);
  
  if (result.success) {
    return result;
  }
  
  if (!groqRateLimited) {
    result = await groq.ask(userInput, memory.history, PERSONALITY.systemPrompt);
    
    if (result.success) {
      return result;
    }
    
    if (result.error === 'rate_limited') {
      groqRateLimited = true;
      rateLimitResetTime = Date.now() + 60000;
    }
  }
  
  result = await pollinations.ask(userInput, memory.history, PERSONALITY.systemPrompt);
  if (result.success) {
    return result;
  }
  
  return { success: false, error: 'all providers down', provider: 'offline' };
}

async function getResponse(input, userId) {
  userId = userId || 'anonymous';
  
  var lower = input.toLowerCase();
  
  if (lower.indexOf('/memory') === 0) {
    var mem = getUserMemory(userId);
    return {
      text: '🧠 Your memory: ' + mem.history.length + ' messages. Created ' + new Date(mem.createdAt).toLocaleString() + '.',
      provider: 'system'
    };
  }
  
  if (lower.indexOf('/clear') === 0) {
    userMemories[userId] = { history: [], createdAt: Date.now(), messageCount: 0 };
    return { text: '🧹 Your memory has been cleared.', provider: 'system' };
  }
  
  var aiResult = await askAI(input, userId);
  var memory = getUserMemory(userId);
  
  if (aiResult.success) {
    memory.history.push({ role: 'user', content: input });
    memory.history.push({ role: 'assistant', content: aiResult.text });
    memory.messageCount = memory.messageCount + 1;
    
    if (memory.history.length > PERSONALITY.maxHistory) {
      memory.history = memory.history.slice(-PERSONALITY.maxHistory);
    }
    
    return { text: aiResult.text, provider: aiResult.provider };
  }
  
  var offlineText = getOfflineResponse(input);
  if (offlineText) {
    memory.history.push({ role: 'user', content: input });
    memory.history.push({ role: 'assistant', content: offlineText });
    memory.messageCount = memory.messageCount + 1;
    return { text: offlineText, provider: 'offline' };
  }
  
  return { text: pickRandom(PERSONALITY.offline.fallback), provider: 'offline' };
}

module.exports = { getResponse: getResponse, getUserMemory: getUserMemory };
