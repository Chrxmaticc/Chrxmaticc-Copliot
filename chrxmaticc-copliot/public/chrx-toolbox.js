/* ═══════════════════════════════════════════
   chrx-toolbox.js — Unhinged Toolbox v1.0
   Explain to Geto, Commit Roast, Make it Worse
   Deployment Anxiety Meter, Personality Fusion
   ═══════════════════════════════════════════ */

/* ═══ EXPLAIN IT TO GETO ═══ */
var getoDebugActive = false;
var getoDebugMood = 'neutral';

var GETO_MOODS = {
  neutral:    { src: '1525658200622239756.webp', label: 'geto is listening...' },
  confused:   { src: '1525658200622239756.webp', label: 'geto is confused...', filter: 'hue-rotate(30deg)' },
  skeptical:  { src: '1525658200622239756.webp', label: 'geto is skeptical...', filter: 'hue-rotate(-20deg) saturate(1.5)' },
  bored:      { src: '1525658200622239756.webp', label: 'geto is falling asleep...', filter: 'grayscale(0.5) brightness(0.8)' },
  gone:       { src: '1525658200622239756.webp', label: 'geto has left the debugging session.', filter: 'grayscale(1) brightness(0.5)', opacity: 0.3 },
  impressed:  { src: '1525658200622239756.webp', label: 'geto is impressed!', filter: 'brightness(1.3) saturate(1.3)' }
};

function toggleGetoDebug() {
  getoDebugActive = !getoDebugActive;
  
  if (getoDebugActive) {
    openGetoDebugPanel();
    getoDebugMood = 'neutral';
    updateGetoDebugMood('neutral');
  } else {
    closeGetoDebugPanel();
  }
}

function openGetoDebugPanel() {
  var existing = document.getElementById('getoDebugPanel');
  if (existing) { existing.style.display = 'flex'; return; }
  
  var panel = document.createElement('div');
  panel.id = 'getoDebugPanel';
  panel.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:400;width:320px;background:var(--surf);border:1px solid var(--brd);border-radius:20px;padding:20px;backdrop-filter:blur(28px);box-shadow:0 8px 48px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:12px;animation:popIn .3s cubic-bezier(.34,1.56,.64,1)';
  panel.innerHTML = '<div style="display:flex;align-items:center;gap:12px"><img id="getoDebugImg" src="1525658200622239756.webp" alt="geto" style="width:48px;height:48px;border-radius:12px;transition:all .3s"><div><div style="font-size:14px;font-weight:700;color:var(--txt)">Explain It To Geto</div><div id="getoDebugLabel" style="font-size:11px;color:var(--mut)">geto is listening...</div></div><button onclick="toggleGetoDebug()" style="margin-left:auto;background:none;border:none;color:var(--mut);cursor:pointer;font-size:18px">✕</button></div><textarea id="getoDebugInput" placeholder="Explain your problem to geto..." style="background:rgba(255,255,255,.04);border:1px solid var(--brd);border-radius:12px;padding:12px;color:var(--txt);font-family:inherit;font-size:13px;resize:none;min-height:80px;outline:none;transition:border-color .2s" oninput="onGetoDebugInput()"></textarea><div id="getoDebugHint" style="font-size:11px;color:var(--mut);font-style:italic">the act of explaining helps you solve it yourself. geto is your rubber duck.</div>';
  document.body.appendChild(panel);
}

function closeGetoDebugPanel() {
  var panel = document.getElementById('getoDebugPanel');
  if (panel) panel.style.display = 'none';
  getoDebugActive = false;
}

function onGetoDebugInput() {
  var input = document.getElementById('getoDebugInput');
  if (!input) return;
  
  var text = input.value;
  var len = text.length;
  
  if (len === 0) {
    updateGetoDebugMood('neutral');
  } else if (len < 20) {
    updateGetoDebugMood('confused');
  } else if (len < 80) {
    updateGetoDebugMood('neutral');
  } else if (len < 200) {
    updateGetoDebugMood('skeptical');
  } else if (len < 400) {
    updateGetoDebugMood('neutral');
  } else {
    updateGetoDebugMood('bored');
  }
  
  // Auto-close if too long with no activity
  clearTimeout(window._getoDebugTimeout);
  window._getoDebugTimeout = setTimeout(function() {
    if (getoDebugActive && len > 500) {
      updateGetoDebugMood('gone');
      setTimeout(function() {
        if (getoDebugActive) toggleGetoDebug();
      }, 3000);
    }
  }, 30000);
}

function updateGetoDebugMood(mood) {
  getoDebugMood = mood;
  var config = GETO_MOODS[mood];
  var img = document.getElementById('getoDebugImg');
  var label = document.getElementById('getoDebugLabel');
  
  if (img && config) {
    img.style.filter = config.filter || '';
    img.style.opacity = config.opacity || 1;
  }
  if (label && config) {
    label.textContent = config.label;
  }
}

/* ═══ COMMIT MESSAGE ROAST ═══ */
var WEAK_COMMIT_PATTERNS = [
  { pattern: /^fix/i, roast: 'fix what? be specific. geto is disappointed.', suggestion: 'fix: [describe what you fixed]' },
  { pattern: /^update/i, roast: 'update what? this tells future you nothing.', suggestion: 'feat:|fix:|chore:|docs:|style:|refactor:|perf:|test: [description]' },
  { pattern: /^stuff/i, roast: 'stuff. STUFF. geto is leaving.', suggestion: 'please use conventional commits before geto cries' },
  { pattern: /^wip/i, roast: 'wip commits are for cowards. finish the feature.', suggestion: 'squash this later or write a real message' },
  { pattern: /^.*$/i, roast: null, suggestion: null }
];

function roastCommitMessage(message) {
  if (!message || message.length < 5) {
    return { score: 1, roast: 'this commit message is shorter than getos attention span.', suggestion: 'write at least a summary of what changed' };
  }
  
  if (message.length < 15) {
    return { score: 3, roast: 'barely trying. geto is squinting.', suggestion: 'add more context — what, why, how' };
  }
  
  if (/^(fix|update|stuff|wip|test|tmp|temp|aaaa|asdf)/i.test(message)) {
    return { score: 2, roast: 'this commit message is a crime against git history.', suggestion: 'use conventional commits: type(scope): description' };
  }
  
  if (/^(feat|fix|chore|docs|style|refactor|perf|test|ci|build)(\(.+\))?: .{10,}/.test(message)) {
    return { score: 9, roast: 'acceptable. geto nods silently.', suggestion: null };
  }
  
  if (message.length > 50 && /[a-z]/.test(message)) {
    return { score: 6, roast: 'decent effort. geto is mildly pleased.', suggestion: 'consider using conventional commit format for bonus points' };
  }
  
  return { score: 5, roast: 'its fine. geto has no strong feelings.', suggestion: 'conventional commits would make this cleaner' };
}

function showCommitRoast(message) {
  var result = roastCommitMessage(message);
  var emoji = result.score >= 8 ? ':fire:' : result.score >= 5 ? ':geto:' : ':bee:';
  var toastMsg = emoji + ' Commit score: ' + result.score + '/10. ' + result.roast;
  if (result.suggestion) toastMsg += ' ' + result.suggestion;
  if (typeof toast === 'function') toast(toastMsg);
  return result;
}

/* ═══ MAKE IT WORSE ═══ */
var MAKE_WORSE_TRANSFORMS = [
  { name: 'marquee everything', fn: function(code) { return '<marquee>' + code + '</marquee>'; } },
  { name: 'emoji variables', fn: function(code) { return code.replace(/\b(var|let|const)\s+(\w+)/g, '$1 :geto:_$2'); } },
  { name: 'triple nested', fn: function(code) { return code.replace(/\{/g, '{{\n  setTimeout(function() {'); } },
  { name: 'add 404 handlers', fn: function(code) { return code + '\n\n// 404 handler\napp.use(function(req,res){res.status(404).send("geto couldnt find this page :geto:")})'; } },
  { name: 'console.log spam', fn: function(code) { return code.replace(/function\s+(\w+)/g, 'function $1{console.log("$1 called by geto");console.log("arguments:",arguments);console.log("stack:",new Error().stack)'); } },
  { name: 'rainbow text', fn: function(code) { return '<div style="background:linear-gradient(90deg,red,orange,yellow,green,blue,indigo,violet);-webkit-background-clip:text;-webkit-text-fill-color:transparent">' + code + '</div>'; } }
];

function makeItWorse(code) {
  var transform = MAKE_WORSE_TRANSFORMS[Math.floor(Math.random() * MAKE_WORSE_TRANSFORMS.length)];
  try {
    return { name: transform.name, code: transform.fn(code) };
  } catch(e) {
    return { name: 'broken', code: code + '\n\n// geto broke this. sorry. :geto:' };
  }
}

/* ═══ DEPLOYMENT ANXIETY METER ═══ */
function checkDeployReadiness(code) {
  var score = 10;
  var issues = [];
  
  if (code.indexOf('console.log') !== -1) { score -= 2; issues.push('console.log found — remove before deploy'); }
  if (code.indexOf('TODO') !== -1) { score -= 1; issues.push('TODOs remaining'); }
  if (code.indexOf('FIXME') !== -1) { score -= 2; issues.push('FIXMEs in code — are you sure?'); }
  if (code.indexOf('var ') !== -1) { score -= 1; issues.push('using var — consider let/const'); }
  if (code.length < 50) { score -= 3; issues.push('very little code — is this complete?'); }
  if (!/try|catch/.test(code) && code.length > 200) { score -= 1; issues.push('no error handling detected'); }
  
  var label;
  if (score >= 9) label = 'SHIP IT COWARD :fire:';
  else if (score >= 7) label = 'PROBABLY FINE :geto:';
  else if (score >= 5) label = 'MAYBE WAIT :bee:';
  else if (score >= 3) label = 'DONT YOU DARE';
  else label = 'TOUCH GRASS INSTEAD';
  
  return { score: Math.max(0, score), label: label, issues: issues };
}

function showDeployMeter(code) {
  var result = checkDeployReadiness(code);
  var msg = ':computer: Deploy readiness: ' + result.score + '/10 — ' + result.label;
  if (result.issues.length) msg += '\nIssues: ' + result.issues.join(', ');
  if (typeof toast === 'function') toast(msg);
  if (result.score <= 3 && typeof triggerScreenShake === 'function') triggerScreenShake(6);
  return result;
}

/* ═══ PERSONALITY FUSION ═══ */
var FUSION_COMBOS = {
  'sonnet+conversational': { label: 'Roasting Engineer', desc: 'elite code with maximum sass' },
  'sonnet+vision': { label: 'Design Engineer', desc: 'beautiful code, pixel-perfect' },
  'conversational+speed': { label: 'Chaos Sprinter', desc: 'fast, unhinged, efficient' },
  'vision+intermediate': { label: 'Quick Designer', desc: 'rapid fire design suggestions' },
  'sonnet+speed': { label: 'Turbo Engineer', desc: 'lightning fast production code' }
};

function fusePersonalities(p1, p2) {
  var key1 = p1 + '+' + p2;
  var key2 = p2 + '+' + p1;
  var fusion = FUSION_COMBOS[key1] || FUSION_COMBOS[key2];
  
  if (fusion) {
    return { name: fusion.label, desc: fusion.desc, primary: p1, secondary: p2 };
  }
  return { name: p1 + ' x ' + p2, desc: 'custom fusion — results may vary', primary: p1, secondary: p2 };
}

console.log(':wrench: chrx-toolbox.js loaded — geto debug, commit roast, make it worse, deploy meter, fusion ready');
