/* ═══════════════════════════════════════════
   chrx-impact.js — Screen Shake + Mood Ring v1.0
   Message impact detection, vibe analysis, shake
   ═══════════════════════════════════════════ */

var MOOD_COLORS = {
  frustrated: { color: '#ff453a', glow: 'rgba(255,69,58,0.6)', label: 'Frustrated' },
  breakthrough: { color: '#ffd60a', glow: 'rgba(255,214,10,0.7)', label: 'Breakthrough' },
  creative: { color: '#bf5af2', glow: 'rgba(191,90,242,0.6)', label: 'Creative Flow' },
  focused: { color: '#30d158', glow: 'rgba(48,209,88,0.6)', label: 'Locked In' },
  curious: { color: '#0a84ff', glow: 'rgba(10,132,255,0.6)', label: 'Curious' },
  chaotic: { color: '#ff6b6b', glow: 'rgba(255,107,107,0.7)', label: 'Chaos Mode' },
  tired: { color: '#8e8e93', glow: 'rgba(142,142,147,0.4)', label: 'Running on Fumes' },
  default: { color: 'var(--a)', glow: 'var(--glow)', label: 'Online' }
};

var vibeHistory = [];
var MAX_VIBE_HISTORY = 10;
var currentMood = 'default';
var shakeIntensity = 0;
var shakeDecay = 0.85;

function analyzeVibe(message) {
  if (!message) return 'default';
  var msg = message.toLowerCase();
  
  if (/fuck|shit|damn|wtf|error|bug|broken|crash|stuck|wont work|doesnt work|failing/i.test(msg)) return 'frustrated';
  if (/finally|yes|it works|fixed|solved|figured|ship it|deployed|done|completed/i.test(msg)) return 'breakthrough';
  if (/design|color|aesthetic|beautiful|creative|imagine|visual|style|theme/i.test(msg)) return 'creative';
  if (/code|function|implement|build|refactor|optimize|performance|architecture/i.test(msg)) return 'focused';
  if (/what|how|why|explain|teach|learn|understand|help|show me/i.test(msg)) return 'curious';
  if (/roast|destroy|chaos|insane|unhinged|wild|crazy|random|lol|lmao/i.test(msg)) return 'chaotic';
  if (/tired|exhausted|sleep|late|3am|4am|midnight|coffee/i.test(msg)) return 'tired';
  
  return 'default';
}

function updateMood(message) {
  var vibe = analyzeVibe(message);
  vibeHistory.push({ vibe: vibe, time: Date.now() });
  if (vibeHistory.length > MAX_VIBE_HISTORY) vibeHistory.shift();
  
  var moodCounts = {};
  vibeHistory.forEach(function(v) { moodCounts[v.vibe] = (moodCounts[v.vibe] || 0) + 1; });
  var dominant = 'default', maxCount = 0;
  for (var mood in moodCounts) {
    if (moodCounts[mood] > maxCount) { maxCount = moodCounts[mood]; dominant = mood; }
  }
  
  currentMood = dominant;
  applyMoodRing(dominant);
  return dominant;
}

function applyMoodRing(mood) {
  var config = MOOD_COLORS[mood] || MOOD_COLORS['default'];
  var dot = document.getElementById('statusDot');
  var text = document.getElementById('statusText');
  
  if (dot) {
    dot.style.background = config.color;
    dot.style.boxShadow = '0 0 10px ' + config.glow;
    dot.className = 'sdot ' + (mood === 'default' ? 'online' : '');
  }
  if (text) {
    text.textContent = config.label;
    text.style.color = config.color;
  }
}

function calculateImpact(userMessage, aiResponse) {
  var score = 0;
  if (userMessage && userMessage.length > 150) score += 1;
  if (userMessage && /```/.test(userMessage)) score += 2;
  if (aiResponse && aiResponse.length > 600) score += 1;
  if (aiResponse && /```/.test(aiResponse)) score += 2;
  if (aiResponse && /:::css|:::html|:::js|:::theme/.test(aiResponse)) score += 3;
  if (userMessage && /:fire:|:geto:|:bee:/.test(userMessage)) score += 1;
  return Math.min(score, 7);
}

function triggerScreenShake(intensity) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  if (!window._shakeActive) {
    window._shakeActive = true;
    requestAnimationFrame(shakeLoop);
  }
}

function shakeLoop() {
  if (shakeIntensity < 0.1) {
    shakeIntensity = 0;
    window._shakeActive = false;
    document.body.style.transform = '';
    return;
  }
  
  var x = (Math.random() - 0.5) * shakeIntensity * 2;
  var y = (Math.random() - 0.5) * shakeIntensity * 2;
  document.body.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  shakeIntensity *= shakeDecay;
  requestAnimationFrame(shakeLoop);
}

function onMessageImpact(userMessage, aiResponse) {
  var impact = calculateImpact(userMessage, aiResponse);
  if (impact >= 3) {
    triggerScreenShake(impact * 1.5);
  }
  updateMood(userMessage);
}

console.log(':fire: chrx-impact.js loaded — shake + mood ring active');
