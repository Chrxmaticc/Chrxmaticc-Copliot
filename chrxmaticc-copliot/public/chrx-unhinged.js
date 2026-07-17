/* ═══════════════════════════════════════════
   chrx-unhinged.js — Geto, Bee, Touch Grass v1.0
   Jumpscare, fortune cookie, konami, patience
   ═══════════════════════════════════════════ */

var GETO_CLICK_COUNT = 0;
var GETO_CLICK_WINDOW = 60000;
var GETO_CLICK_TIMER = null;
var GETO_MAX_CLICKS = 21;
var GETO_ANNOYED = false;
var TOUCH_GRASS_ACTIVE = false;
var TOUCH_GRASS_TIMER = null;
var PROCRASTINATION_START = null;
var PROCRASTINATION_TASK = null;
var BEE_AGITATION = 0;
var SESSION_START = Date.now();

function initUnhinged() {
  initGetoPeek();
  initBeeFlight();
  initTouchGrass();
  initFortuneCookie();
  initKonamiVariants();
  initProcrastinationDetector();
  
  document.addEventListener('click', function(e) {
    if (e.target.closest('.geto-peek')) {
      handleGetoClick();
    }
  });
}

/* ═══ GETO PEEK + JUMPSCARE ═══ */
function initGetoPeek() {
  var geto = document.getElementById('getoPeek');
  if (!geto) {
    geto = document.createElement('div');
    geto.id = 'getoPeek';
    geto.className = 'geto-peek';
    geto.innerHTML = '<img src="1525658200622239756.webp" alt="geto blank chibi">';
    geto.style.cssText = 'position:fixed;bottom:-5px;right:-5px;z-index:50;width:80px;height:80px;cursor:pointer;transition:all .3s;opacity:.4;animation:getoBounce 4s ease-in-out infinite';
    document.body.appendChild(geto);
    
    var style = document.createElement('style');
    style.textContent = '@keyframes getoBounce{0%,100%{transform:translateY(0) rotate(0deg)}30%{transform:translateY(-12px) rotate(3deg)}60%{transform:translateY(-4px) rotate(-2deg)}85%{transform:translateY(-18px) rotate(0deg)}}';
    document.head.appendChild(style);
  }
}

function handleGetoClick() {
  GETO_CLICK_COUNT++;
  
  if (!GETO_CLICK_TIMER) {
    GETO_CLICK_TIMER = setTimeout(function() {
      GETO_CLICK_COUNT = 0;
      GETO_CLICK_TIMER = null;
    }, GETO_CLICK_WINDOW);
  }
  
  var geto = document.getElementById('getoPeek');
  if (!geto) return;
  
  if (GETO_CLICK_COUNT <= 5) {
    showGetoFortune();
    geto.style.transform = 'scale(1.1) translateY(-8px)';
    setTimeout(function() { geto.style.transform = ''; }, 200);
  } else if (GETO_CLICK_COUNT <= 10) {
    geto.style.transform = 'scale(1.2) translateY(-14px) rotate(-8deg)';
    geto.style.opacity = '0.6';
    setTimeout(function() { geto.style.transform = ''; geto.style.opacity = '0.4'; }, 400);
  } else if (GETO_CLICK_COUNT <= 15) {
    geto.style.filter = 'hue-rotate(-30deg) saturate(2)';
    geto.style.animation = 'getoBounce 0.3s ease-in-out infinite';
    geto.style.opacity = '0.75';
  } else if (GETO_CLICK_COUNT <= 20) {
    geto.style.transform = 'scale(1.5)';
    geto.style.filter = 'hue-rotate(-50deg) saturate(3) brightness(1.3)';
    geto.style.animation = 'getoBounce 0.15s ease-in-out infinite';
    document.body.style.boxShadow = 'inset 0 0 100px rgba(255,0,0,0.15)';
  } else if (GETO_CLICK_COUNT >= GETO_MAX_CLICKS) {
    triggerJumpscare();
    GETO_CLICK_COUNT = 0;
    clearTimeout(GETO_CLICK_TIMER);
    GETO_CLICK_TIMER = null;
  }
}

function triggerJumpscare() {
  var geto = document.getElementById('getoPeek');
  if (!geto) return;
  
  // Save original state
  var origStyles = geto.style.cssText;
  
  // Fullscreen geto
  geto.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;cursor:none;transition:all .2s ease-in;opacity:1;filter:none;animation:none;display:flex;align-items:center;justify-content:center;background:#000';
  geto.querySelector('img').style.cssText = 'width:80vw;height:80vh;object-fit:contain;animation:jumpscareShake .1s ease-in-out infinite';
  
  // Glitch overlay
  var glitch = document.getElementById('glitchOverlay') || createGlitchOverlay();
  glitch.classList.add('active');
  glitch.style.opacity = '1';
  
  // Play sound
  playJumpscareSound();
  
  // Screen shake
  if (typeof triggerScreenShake === 'function') triggerScreenShake(15);
  
  // Reset after 2 seconds
  setTimeout(function() {
    geto.style.cssText = origStyles;
    var img = geto.querySelector('img');
    if (img) img.style.cssText = 'width:100%;height:100%;object-fit:contain';
    document.body.style.boxShadow = '';
    glitch.classList.remove('active');
    glitch.style.opacity = '0';
  }, 2000);
  
  var shakeStyle = document.createElement('style');
  shakeStyle.textContent = '@keyframes jumpscareShake{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(-20px,10px) scale(1.05)}50%{transform:translate(15px,-15px) scale(1.02)}75%{transform:translate(-10px,-5px) scale(1.08)}}';
  document.head.appendChild(shakeStyle);
}

function createGlitchOverlay() {
  var overlay = document.createElement('div');
  overlay.id = 'glitchOverlay';
  overlay.className = 'glitch-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99990;pointer-events:none;opacity:0;transition:opacity .1s;background:linear-gradient(0deg,rgba(255,0,0,.05) 0%,transparent 40%,rgba(0,0,255,.05) 100%);mix-blend-mode:overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function playJumpscareSound() {
  try {
    var audio = new Audio('jumpscare.mp3');
    audio.volume = 1.0;
    audio.play().catch(function() {});
  } catch(e) {}
}

/* ═══ FORTUNE COOKIE ═══ */
var FORTUNES = [
  'you will ship at 4am and it will break production.',
  'the bee is plotting something. watch your back.',
  'a wild semicolon appears. your code is now fixed.',
  'geto sees your search history. he is disappointed.',
  'your next commit message will be "fixed stuff" and you will feel shame.',
  'the chrome demon approves of your chaos.',
  'a mysterious bug appears. it was a typo all along.',
  'you will refactor code that didnt need refactoring.',
  'the touch grass system is watching. take a break.',
  'somewhere, a developer is using var. dont be that developer.',
  'your CSS is too powerful. tone it down.',
  'geto thinks your last deploy was mid. prove him wrong.',
  'the bee says buzz buzz (translation: hydrate yourself)',
  'a production outage is in your future. jk. maybe.',
  'you are one commit away from greatness or disaster.'
];

function initFortuneCookie() {
  // Fortune is triggered by geto clicks 1-5
}

function showGetoFortune() {
  var fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  var toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.innerHTML = '<img src="1525658200622239756.webp" alt="geto" style="width:24px;height:24px;border-radius:4px"> ' + fortune;
  toast.style.cssText = 'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:14px;font-size:13px;z-index:300;backdrop-filter:blur(20px);display:flex;align-items:center;gap:10px;animation:toastIn .3s ease,toastOut .3s ease 3s forwards;pointer-events:none;font-weight:500;max-width:380px;border:1px solid var(--brd);border-left:3px solid var(--a);background:var(--surf);color:var(--txt)';
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3500);
}

/* ═══ BEE FLIGHT ═══ */
function initBeeFlight() {
  var bee = document.getElementById('beeFly');
  if (!bee) {
    bee = document.createElement('div');
    bee.id = 'beeFly';
    bee.className = 'bee-fly';
    bee.innerHTML = '<img src="IMG_9413.gif" alt="minecraft bee flying">';
    bee.style.cssText = 'position:fixed;z-index:51;pointer-events:none;width:36px;height:36px;animation:beePath 14s linear infinite';
    document.body.appendChild(bee);
    
    var style = document.createElement('style');
    style.textContent = '@keyframes beePath{0%{top:8%;left:-5%;transform:rotate(0deg)}25%{top:65%;left:28%;transform:rotate(12deg)}50%{top:18%;left:68%;transform:rotate(-8deg)}75%{top:55%;left:48%;transform:rotate(4deg)}100%{top:8%;left:105%;transform:rotate(0deg)}}';
    document.head.appendChild(style);
  }
}

function agitateBee(intensity) {
  BEE_AGITATION = Math.min(BEE_AGITATION + intensity, 10);
  var bee = document.getElementById('beeFly');
  if (!bee) return;
  
  if (BEE_AGITATION >= 8) {
    bee.style.animationDuration = '3s';
    bee.style.filter = 'hue-rotate(' + (BEE_AGITATION * 20) + 'deg) saturate(2)';
  } else if (BEE_AGITATION >= 5) {
    bee.style.animationDuration = '7s';
    bee.style.filter = 'hue-rotate(' + (BEE_AGITATION * 10) + 'deg)';
  }
}

/* ═══ TOUCH GRASS ═══ */
function initTouchGrass() {
  checkSessionTime();
  setInterval(checkSessionTime, 60000);
}

function checkSessionTime() {
  var elapsed = (Date.now() - SESSION_START) / 1000 / 60 / 60;
  if (elapsed >= 8 && !TOUCH_GRASS_ACTIVE) {
    activateTouchGrass();
  }
}

function activateTouchGrass() {
  TOUCH_GRASS_ACTIVE = true;
  
  var overlay = document.createElement('div');
  overlay.id = 'touchGrassOverlay';
  overlay.innerHTML = '<div style="position:fixed;inset:0;background:linear-gradient(180deg,#87CEEB,#228B22);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:40px"><img src="1525658200622239756.webp" alt="geto" style="width:120px;height:120px;border-radius:20px;margin-bottom:20px;box-shadow:0 8px 40px rgba(0,0,0,.3)"><h1 style="font-size:48px;font-weight:900;color:#fff;text-shadow:0 4px 20px rgba(0,0,0,.5);margin-bottom:8px">TOUCH GRASS.</h1><p style="font-size:20px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.3);margin-bottom:8px">this is not a request.</p><img src="IMG_9413.gif" alt="bee" style="width:60px;height:60px;margin-bottom:16px"><p style="font-size:28px;font-weight:700;color:#ff0;text-shadow:0 2px 10px rgba(0,0,0,.5)" id="grassTimer">15:00</p><p style="font-size:14px;color:rgba(255,255,255,.7);margin-top:8px">geto is photoshopped onto a nature background. he looks peaceful. do not inspect element. he will know.</p></div>';
  document.body.appendChild(overlay);
  
  var timeLeft = 900;
  TOUCH_GRASS_TIMER = setInterval(function() {
    timeLeft--;
    var min = Math.floor(timeLeft / 60);
    var sec = timeLeft % 60;
    var timerEl = document.getElementById('grassTimer');
    if (timerEl) timerEl.textContent = min + ':' + (sec < 10 ? '0' : '') + sec;
    
    if (timeLeft <= 0) {
      clearInterval(TOUCH_GRASS_TIMER);
      if (overlay.parentNode) overlay.remove();
      TOUCH_GRASS_ACTIVE = false;
      SESSION_START = Date.now();
      if (typeof toast === 'function') toast('geto welcomes you back. now hydrate. :geto:');
    }
  }, 1000);
  
  // Prevent bypass
  document.addEventListener('keydown', function blockKeys(e) {
    if (TOUCH_GRASS_ACTIVE && (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u'))) {
      e.preventDefault();
      timeLeft += 300; // Add 5 more minutes
      if (typeof toast === 'function') toast('geto caught you. +5 minutes. :geto:');
    }
  }, { capture: true });
}

/* ═══ KONAMI VARIANTS ═══ */
function initKonamiVariants() {
  var konami = [], seq = [38,38,40,40,37,39,37,39,66,65];
  
  document.addEventListener('keydown', function(e) {
    konami.push(e.keyCode);
    if (konami.length > 10) konami.shift();
    if (konami.join(',') !== seq.join(',')) return;
    
    var theme = document.body.className.replace('theme-', '') || 'gold';
    konami = [];
    
    switch(theme) {
      case 'gold':
        if (typeof launchConfetti === 'function') launchConfetti();
        if (typeof toast === 'function') toast(':fire: TREASURE UNLEASHED :fire:');
        for (var i = 0; i < 30; i++) setTimeout(function() { /* burst particles */ }, i * 30);
        break;
      case 'midnight':
        if (typeof toast === 'function') toast(':sparkles: STARS FALL FROM THE SKY :sparkles:');
        document.body.style.background = '#000';
        for (var j = 0; j < 50; j++) { /* spawn star particles */ }
        setTimeout(function() { document.body.style.background = ''; }, 5000);
        break;
      case 'rainbow':
        if (typeof toast === 'function') toast(':rainbow: PRIDE GLITCH ACTIVATED :rainbow:');
        document.body.style.animation = 'rainbowKonami .5s linear infinite';
        setTimeout(function() { document.body.style.animation = ''; }, 4000);
        break;
      case 'chromatic':
        triggerJumpscare();
        setTimeout(function() { triggerJumpscare(); }, 2500);
        if (typeof toast === 'function') toast(':geto: GETO AND BEE DANCE BATTLE :bee:');
        break;
      default:
        if (typeof launchConfetti === 'function') launchConfetti();
        if (typeof toast === 'function') toast(':geto: CHAOS UNLEASHED :bee:');
    }
  });
  
  var rainbowStyle = document.createElement('style');
  rainbowStyle.textContent = '@keyframes rainbowKonami{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}';
  document.head.appendChild(rainbowStyle);
}

/* ═══ PROCRASTINATION DETECTOR ═══ */
function initProcrastinationDetector() {
  PROCRASTINATION_START = Date.now();
}

function setProcrastinationTask(task) {
  PROCRASTINATION_TASK = task;
  PROCRASTINATION_START = Date.now();
  BEE_AGITATION = 0;
}

function checkProcrastination(currentMessage) {
  if (!PROCRASTINATION_TASK) return;
  
  var elapsed = (Date.now() - PROCRASTINATION_START) / 1000 / 60;
  
  if (elapsed > 180 && BEE_AGITATION < 3) {
    agitateBee(1);
  } else if (elapsed > 300 && BEE_AGITATION < 6) {
    agitateBee(2);
    if (typeof toast === 'function') toast(':bee: you said youd ' + PROCRASTINATION_TASK + ' 5 hours ago...');
  } else if (elapsed > 480 && BEE_AGITATION < 9) {
    agitateBee(3);
    if (typeof triggerScreenShake === 'function') triggerScreenShake(4);
    if (typeof toast === 'function') toast(':geto: ' + PROCRASTINATION_TASK.toUpperCase() + '. NOW. :fire:');
  }
}

console.log(':geto: chrx-unhinged.js loaded — jumpscare + bee + touch grass ready :bee:');
