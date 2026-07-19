/* ═══════════════════════════════════════════
   chrx-markdown.js — Live Code Execution v1.0
   :::css :::html :::js :::theme :::preset :::reset
   ═══════════════════════════════════════════ */

var CHRX_PRESETS = {};
var INJECTED_CSS_ID = 'chrx-injected-css';
var INJECTED_STYLES = [];

(function initMarkdown() {
  try {
    CHRX_PRESETS = JSON.parse(localStorage.getItem('chrx_presets') || '{}');
    INJECTED_STYLES = JSON.parse(localStorage.getItem('chrx_injected_styles') || '[]');
    if (INJECTED_STYLES.length > 0) injectCSS(INJECTED_STYLES.join('\n'));
  } catch(e) {}
})();

function parseChrxMarkdown(text) {
  if (!text || typeof text !== 'string') return { cleanText: text || '', blocks: [] };
  var blocks = [];
  var regex = /:::(\w+)(?:\s+(.+?))?\n([\s\S]*?):::/g;
  var match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ type: match[1], param: match[2] || '', content: match[3].trim(), raw: match[0] });
  }
  var cleanText = text.replace(regex, '').trim();
  return { cleanText: cleanText, blocks: blocks };
}

function executeChrxBlock(block) {
  switch (block.type) {
    case 'theme':
      var themeMap = { gold: 'gold', midnight: 'midnight', glass: 'glass', chrome: 'chrome', white: 'white', light: 'white', chromatic: 'chromatic', liquid: 'liquid', rainbow: 'rainbow', hacker: 'hacker' };
      var t = themeMap[block.param] || block.param || 'gold';
      if (typeof setTheme === 'function') setTheme(t);
      return { html: getEmojiHTML(':geto:') + ' Theme: <strong>' + t + '</strong>', type: 'system' };
    
    case 'css':
      injectCSS(block.content);
      return { html: '✨ CSS injected (' + block.content.length + ' chars)', type: 'system' };
    
    case 'html':
      return { html: '<div class="chrx-html-block" style="border-radius:12px;overflow:hidden;margin:8px 0">' + block.content + '</div>', type: 'html' };
    
    case 'js':
      try {
        var result = new Function('"use strict";' + block.content)();
        return { html: '✅ JS executed' + (result !== undefined ? ': ' + String(result).slice(0, 100) : ''), type: 'system' };
      } catch(e) {
        return { html: '❌ JS Error: ' + e.message, type: 'error' };
      }
    
    case 'preset':
      var parts = (block.param || '').split(' ');
      if (parts[0] === 'save' && parts[1]) {
        CHRX_PRESETS[parts[1]] = INJECTED_STYLES.join('\n');
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        return { html: '💾 Preset <strong>' + parts[1] + '</strong> saved', type: 'system' };
      } else if (parts[0] === 'load' && parts[1] && CHRX_PRESETS[parts[1]]) {
        injectCSS(CHRX_PRESETS[parts[1]]);
        return { html: '📂 Preset <strong>' + parts[1] + '</strong> loaded', type: 'system' };
      } else if (parts[0] === 'delete' && parts[1]) {
        delete CHRX_PRESETS[parts[1]];
        localStorage.setItem('chrx_presets', JSON.stringify(CHRX_PRESETS));
        return { html: '🗑️ Preset <strong>' + parts[1] + '</strong> deleted', type: 'system' };
      } else if (parts[0] === 'list') {
        var names = Object.keys(CHRX_PRESETS);
        return { html: '📋 Presets: ' + (names.length ? names.join(', ') : 'none'), type: 'system' };
      }
      return { html: '❌ Usage: :::preset save|load|delete|list [name]', type: 'error' };
    
    case 'reset':
    function resetAllInjections() {
  // Remove injected style element
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (styleEl) styleEl.remove();
  INJECTED_STYLES = [];
  localStorage.removeItem('chrx_injected_styles');

  // Remove any custom font links added by :::html or :::css
  var fontLinks = document.querySelectorAll('link[data-chrx-font]');
  fontLinks.forEach(function(link) { link.remove(); });

  // Remove any HTML blocks rendered by :::html
  var htmlBlocks = document.querySelectorAll('.chrx-html-block');
  htmlBlocks.forEach(function(block) { block.remove(); });

  // Restore default font (the one set by your style.css)
  document.body.style.fontFamily = '';

  // Clear all preset storage (optional, remove if you want presets to persist)
  // CHRX_PRESETS = {};
  // localStorage.removeItem('chrx_presets');
}
    
    default:
      return null;
  }
}

function injectCSS(css) {
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = INJECTED_CSS_ID;
    document.head.appendChild(styleEl);
  }
  INJECTED_STYLES.push(css);
  styleEl.textContent = INJECTED_STYLES.join('\n');
  try { localStorage.setItem('chrx_injected_styles', JSON.stringify(INJECTED_STYLES)); } catch(e) {}
}

function resetAllInjections() {
  INJECTED_STYLES = [];
  var styleEl = document.getElementById(INJECTED_CSS_ID);
  if (styleEl) styleEl.remove();
  try { localStorage.removeItem('chrx_injected_styles'); } catch(e) {}
}

console.log(':fire: chrx-markdown.js loaded — live code execution ready');
