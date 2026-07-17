/* ═══════════════════════════════════════════
   chrx-cursor.js — Personality-Synced Cursor v1.0
   God ray cursor changes with AI personality
   ═══════════════════════════════════════════ */

var CURSOR_CONFIGS = {
  sonnet:         { size: 160, opacity: 0.12, blur: 30, color: null, trail: 8, label: 'precision laser' },
  conversational: { size: 220, opacity: 0.18, blur: 50, color: null, trail: 4, label: 'bouncy blob' },
  vision:         { size: 200, opacity: 0.14, blur: 40, color: null, trail: 6, label: 'creative swirl' },
  intermediate:   { size: 140, opacity: 0.1,  blur: 25, color: null, trail: 10, label: 'quick flicker' },
  speed:          { size: 100, opacity: 0.06, blur: 15, color: null, trail: 14, label: 'barely visible streak' },
  surprise:       { size: 260, opacity: 0.22, blur: 60, color: null, trail: 2, label: 'random teleports' }
};

var currentCursorConfig = CURSOR_CONFIGS['sonnet'];
var cursorRay, cursorRing;
var mouseX = -200, mouseY = -200;
var rayX = -200, rayY = -200;
var ringX = -200, ringY = -200;
var trailPoints = [];
var MAX_TRAIL = 20;

function initCursor() {
  cursorRay = document.getElementById('cursorGodRay') || createCursorElements();
  cursorRing = document.getElementById('cursorRingMaster');
  if (!cursorRay || !cursorRing) return;
  
  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    trailPoints.push({ x: mouseX, y: mouseY, life: 1 });
    if (trailPoints.length > MAX_TRAIL) trailPoints.shift();
  });
  
  document.addEventListener('mousedown', function() {
    if (cursorRing) cursorRing.classList.add('clicking');
  });
  
  document.addEventListener('mouseup', function() {
    if (cursorRing) cursorRing.classList.remove('clicking');
  });
  
  animate();
}

function createCursorElements() {
  var ray = document.createElement('div');
  ray.id = 'cursorGodRay';
  ray.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border-radius:50%;mix-blend-mode:screen;transform:translate(-50%,-50%);transition:width .3s,height .3s,opacity .3s';
  document.body.appendChild(ray);
  
  var ring = document.createElement('div');
  ring.id = 'cursorRingMaster';
  ring.style.cssText = 'position:fixed;pointer-events:none;z-index:99998;border-radius:50%;border:2px solid;transform:translate(-50%,-50%);transition:width .15s,height .15s,border-color .3s';
  document.body.appendChild(ring);
  
  return ray;
}

function setCursorPersonality(personality) {
  currentCursorConfig = CURSOR_CONFIGS[personality] || CURSOR_CONFIGS['sonnet'];
  var accent = getComputedStyle(document.body).getPropertyValue('--a').trim() || '#d4a574';
  var glow = getComputedStyle(document.body).getPropertyValue('--glow').trim() || 'rgba(212,165,116,.25)';
  
  if (cursorRay) {
    cursorRay.style.width = currentCursorConfig.size + 'px';
    cursorRay.style.height = currentCursorConfig.size + 'px';
    cursorRay.style.opacity = currentCursorConfig.opacity;
    cursorRay.style.background = 'radial-gradient(circle, ' + accent + ' 0%, transparent 70%)';
  }
  if (cursorRing) {
    cursorRing.style.borderColor = accent;
    cursorRing.style.boxShadow = '0 0 ' + currentCursorConfig.blur + 'px ' + accent + ', 0 0 ' + (currentCursorConfig.blur * 2) + 'px ' + glow;
  }
}

function animate() {
  if (!cursorRay) return;
  
  var smoothFactor = currentCursorConfig.trail / 20;
  rayX += (mouseX - rayX) * smoothFactor;
  rayY += (mouseY - rayY) * smoothFactor;
  cursorRay.style.transform = 'translate(' + (rayX - currentCursorConfig.size/2) + 'px, ' + (rayY - currentCursorConfig.size/2) + 'px)';
  
  ringX += (mouseX - ringX) * 0.5;
  ringY += (mouseY - ringY) * 0.5;
  if (cursorRing) cursorRing.style.transform = 'translate(' + (ringX - 20) + 'px, ' + (ringY - 20) + 'px)';
  
  for (var i = trailPoints.length - 1; i >= 0; i--) {
    trailPoints[i].life -= 0.04;
    if (trailPoints[i].life <= 0) trailPoints.splice(i, 1);
  }
  
  if (currentCursorConfig.label === 'random teleports' && Math.random() < 0.02) {
    if (cursorRay) {
      cursorRay.style.transform = 'translate(' + (Math.random() * window.innerWidth) + 'px, ' + (Math.random() * window.innerHeight) + 'px)';
    }
  }
  
  requestAnimationFrame(animate);
}

if (typeof window !== 'undefined' && window.innerWidth > 768) {
  setTimeout(initCursor, 1000);
}

console.log(':compass: chrx-cursor.js loaded — personality cursor ready');
