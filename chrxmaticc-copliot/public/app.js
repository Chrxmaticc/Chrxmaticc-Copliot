// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Web Dashboard     ║
// ║  Personalities • Code Blocks • Surprises ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn, micStatus, ttsBtn;
var sidebar, miniSidebar, overlay, savedChatsList, chatSearch, profileName, profileAvatar;
var chatActionModal, personalitySelect, confettiCanvas;

var conversation = [], savedChats = {}, currentChatId = 'main';
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var selectedAvatar = '🧠', customBackground = '', customBehavior = 'default', surpriseMode = false, currentTheme = 'midnight';
var sidebarFolded = false, currentPersonality = 'general';
var messageCount = 0, lastChatId = null, confettiActive = false;

// ── DOM GRAB ──
function grabDOM() {
  messagesEl = document.getElementById('messages');
  inputEl = document.getElementById('userInput');
  sendBtn = document.getElementById('sendBtn');
  typingEl = document.getElementById('typing');
  statusDot = document.getElementById('statusDot');
  statusText = document.getElementById('statusText');
  micBtn = document.getElementById('micBtn');
  micStatus = document.getElementById('micStatus');
  ttsBtn = document.getElementById('ttsBtn');
  sidebar = document.getElementById('sidebar');
  miniSidebar = document.getElementById('miniSidebar');
  overlay = document.getElementById('overlay');
  savedChatsList = document.getElementById('savedChatsList');
  chatSearch = document.getElementById('chatSearch');
  profileName = document.getElementById('profileName');
  profileAvatar = document.getElementById('profileAvatar');
  chatActionModal = document.getElementById('chatActionModal');
  personalitySelect = document.getElementById('personalitySelect');
  confettiCanvas = document.getElementById('confettiCanvas');
}

// ── INIT ──
function init() {
  grabDOM();
  try { savedChats = JSON.parse(localStorage.getItem('chrxmaticc_chats') || '{}'); } catch(e) { savedChats = {}; }
  selectedAvatar = localStorage.getItem('chrxmaticc_avatar') || '🧠';
  customBackground = localStorage.getItem('chrxmaticc_background') || '';
  customBehavior = localStorage.getItem('chrxmaticc_behavior') || 'default';
  surpriseMode = localStorage.getItem('chrxmaticc_surprise') === 'true';
  currentTheme = localStorage.getItem('chrxmaticc_theme') || 'midnight';
  sidebarFolded = localStorage.getItem('chrxmaticc_sidebar_folded') === 'true';
  currentPersonality = localStorage.getItem('chrxmaticc_personality') || 'general';

  changeTheme(currentTheme);
  applyBackground();
  updateAllAvatars();
  updateSidebarProfile();
  loadSavedChats();
  if (sidebarFolded) applyFoldState();
  if (surpriseMode) document.body.classList.add('surprise-mode');
  if (personalitySelect) personalitySelect.value = currentPersonality;
  checkMidnightMode();

  if (inputEl) {
    inputEl.addEventListener('input', function() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });
    inputEl.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  }

  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR(); recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = function(e) { if (inputEl) { inputEl.value = e.results[0][0].transcript; sendMessage(); } };
    recognition.onend = function() { stopMicUI(); };
  }

  document.addEventListener('click', function(e) {
    if (e.target.closest('.mini-chat-avatar')) { var id = e.target.closest('.mini-chat-avatar').dataset.chatId; loadChat(id); }
  });

  document.addEventListener('contextmenu', function(e) {
    var chatItem = e.target.closest('.chat-item');
    if (chatItem && chatItem.dataset.chatId && chatItem.dataset.chatId !== 'main') { e.preventDefault(); currentChatId = chatItem.dataset.chatId; showChatActions(); }
  });

  // Shake to clear
  if (window.DeviceMotionEvent) {
    var lastShake = 0;
    window.addEventListener('devicemotion', function(e) {
      var acc = e.accelerationIncludingGravity;
      if (!acc) return;
      var mag = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
      if (mag > 40 && Date.now() - lastShake > 2000) { lastShake = Date.now(); if (inputEl) inputEl.value = ''; }
    });
  }
}

// ── THEME ──
function changeTheme(theme) { currentTheme = theme; document.body.className = 'theme-' + theme; localStorage.setItem('chrxmaticc_theme', theme); }
function checkMidnightMode() {
  var hour = new Date().getHours();
  if (hour >= 0 && hour < 5) { changeTheme('midnight'); }
}

// ── BACKGROUND ──
function applyBackground() {
  if (customBackground) { document.body.style.backgroundImage = 'url(' + customBackground + ')'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
  else { document.body.style.backgroundImage = ''; }
}

// ── AVATAR ──
function setAvatar(emoji) { selectedAvatar = emoji; localStorage.setItem('chrxmaticc_avatar', emoji); updateAllAvatars(); }
function updateAllAvatars() { ['sidebarAvatar','topbarAvatar','profileAvatar'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = selectedAvatar; }); }

// ── PERSONALITY ──
function changePersonality(p) { currentPersonality = p; localStorage.setItem('chrxmaticc_personality', p); if (personalitySelect) personalitySelect.value = p; }

// ── SIDEBAR ──
function foldSidebar() { sidebarFolded = true; localStorage.setItem('chrxmaticc_sidebar_folded', 'true'); applyFoldState(); if (overlay) overlay.classList.remove('visible'); }
function unfoldSidebar() { sidebarFolded = false; localStorage.setItem('chrxmaticc_sidebar_folded', 'false'); applyFoldState(); }
function applyFoldState() {
  if (sidebarFolded) { if (sidebar) { sidebar.classList.remove('open'); sidebar.style.display = 'none'; } if (miniSidebar) miniSidebar.classList.add('visible'); updateMiniAvatars(); }
  else { if (sidebar) sidebar.style.display = ''; if (miniSidebar) miniSidebar.classList.remove('visible'); }
}
function updateMiniAvatars() {
  var container = document.getElementById('miniAvatars'); if (!container) return; container.innerHTML = '';
  Object.keys(savedChats).sort(function(a,b){ return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0); }).slice(0,5).forEach(function(id) {
    var div = document.createElement('div'); div.className = 'mini-chat-avatar'; div.dataset.chatId = id; div.textContent = selectedAvatar;
    div.title = savedChats[id].preview || 'Chat'; container.appendChild(div);
  });
}
function toggleSidebar() { if (sidebarFolded) { unfoldSidebar(); return; } if (sidebar) sidebar.classList.toggle('open'); if (overlay) overlay.classList.toggle('visible'); }
function updateSidebarProfile() { if (profileName) profileName.textContent = localStorage.getItem('chrxmaticc_email') || 'Guest'; if (profileAvatar) profileAvatar.textContent = selectedAvatar; }
function loadSavedChats() {
  if (!savedChatsList) return; savedChatsList.innerHTML = '';
  var mainDiv = document.createElement('div'); mainDiv.className = 'chat-item' + (currentChatId==='main'?' active':''); mainDiv.dataset.chatId = 'main';
  mainDiv.onclick = function(){ loadChat('main'); };
  mainDiv.innerHTML = '<div class="chat-item-avatar">'+selectedAvatar+'</div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">'+(savedChats['main']?.preview||'Yo! I\'m Chrxmaticc Copilot...')+'</div></div><div class="chat-item-time">'+(savedChats['main']?new Date(savedChats['main'].timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Now')+'</div>';
  savedChatsList.appendChild(mainDiv);
  Object.keys(savedChats).filter(function(id){ return id!=='main'; }).sort(function(a,b){ return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0); }).forEach(function(id) {
    var c = savedChats[id]; var div = document.createElement('div'); div.className = 'chat-item'; div.dataset.chatId = id;
    div.onclick = function(){ loadChat(id); };
    div.innerHTML = '<div class="chat-item-avatar">'+selectedAvatar+'</div><div class="chat-item-info"><div class="chat-item-name">Chat '+new Date(c.timestamp).toLocaleDateString()+'</div><div class="chat-item-preview">'+(c.preview||'Empty')+'</div></div><div class="chat-item-time">'+new Date(c.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div><button class="chat-item-actions-btn" onclick="event.stopPropagation();selectChat(\''+id+'\');showChatActions();">⋯</button>';
    savedChatsList.appendChild(div);
  });
  updateMiniAvatars();
}
function selectChat(id) { currentChatId = id; }
function loadChat(id) {
  if (id === currentChatId && conversation.length > 0) { toggleSidebar(); return; }
  saveCurrentChat(); currentChatId = id; conversation = [];
  if (messagesEl) messagesEl.innerHTML = '';
  if (savedChats[id]?.conversation) { conversation = savedChats[id].conversation; conversation.forEach(function(m){ addBubbleNoSave(m.content, m.role==='user'?'user':'ai'); }); }
  if (messagesEl && typingEl) messagesEl.appendChild(typingEl);
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  loadSavedChats(); if (!sidebarFolded) toggleSidebar();
}
function newChat() { saveCurrentChat(); currentChatId = 'chat_'+Date.now(); conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } if (savedChatsList) loadSavedChats(); if (sidebarFolded) unfoldSidebar(); if (inputEl) inputEl.focus(); }
function deleteChat() { if (currentChatId==='main'){ hideChatActions(); return; } delete savedChats[currentChatId]; localStorage.setItem('chrxmaticc_chats',JSON.stringify(savedChats)); currentChatId='main'; conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} loadChat('main'); hideChatActions(); }
function filterChats() { var q = (chatSearch?.value||'').toLowerCase(); document.querySelectorAll('#savedChatsList .chat-item').forEach(function(el){ el.style.display = el.textContent.toLowerCase().indexOf(q)!==-1?'':'none'; }); }
function doubleTapTopbar() {
  var ids = Object.keys(savedChats).filter(function(id){ return id!=='main'; }).sort(function(a,b){ return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0); });
  if (ids.length > 0) { lastChatId = currentChatId; loadChat(ids[0]); } else if (lastChatId) { loadChat(lastChatId); }
}

// ── CHAT ACTIONS ──
function showChatActions() { if (chatActionModal) chatActionModal.classList.add('visible'); if (overlay) overlay.classList.add('visible'); }
function hideChatActions() { if (chatActionModal) chatActionModal.classList.remove('visible'); if (overlay) overlay.classList.remove('visible'); }

// ── SEND ──
async function sendMessage() {
  if (!inputEl) return; var text = inputEl.value.trim(); if (!text) return;
  
  // Easter egg: /easter
  if (text.toLowerCase() === '/easter') { triggerEasterEgg(); inputEl.value = ''; return; }
  
  addBubble(text, 'user'); conversation.push({ role:'user', content:text }); inputEl.value = ''; inputEl.style.height = 'auto'; if (sendBtn) sendBtn.disabled = true;
  if (typingEl) typingEl.classList.add('visible'); setStatus('thinking'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  
  messageCount++;
  try {
    var body = { message: text, personality: currentPersonality };
    try { var p = JSON.parse(localStorage.getItem('chrxmaticc_profile')||'{}'); var parts = []; if (p.displayName) parts.push('Call me '+p.displayName); if (p.personalInfo) parts.push('About me: '+p.personalInfo); if (parts.length) body.personalInfo = parts.join('. '); } catch(e) {}
    
    var res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var data = await res.json(); if (typingEl) typingEl.classList.remove('visible');
    if (data.response) {
      setStatus('online'); lastAIResponse = data.response;
      addBubble(data.response, 'ai', data.provider);
      conversation.push({ role:'assistant', content:data.response });
      if (ttsEnabled) speakText(data.response); saveCurrentChat();
      if (messageCount % 10 === 0) randomCompliment();
    } else { setStatus('online'); addError(data.error || 'Brain hiccup.'); }
  } catch(e) { if (typingEl) typingEl.classList.remove('visible'); setStatus('offline'); addError('Offline.'); }
  if (sendBtn) sendBtn.disabled = false; if (inputEl) inputEl.focus();
}
function quickSend(text) { if (inputEl) { inputEl.value = text; sendMessage(); } }

// ── BUBBLES ──
function getTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function setStatus(s) { if (!statusDot||!statusText) return; statusDot.className = 'status-dot'; if (s==='thinking'){statusDot.classList.add('thinking');statusText.textContent='Thinking...';} else if(s==='offline'){statusDot.classList.add('offline');statusText.textContent='Offline';} else {statusText.textContent='Online';} }
function addBubble(text, who, provider) {
  if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove();
  var row = document.createElement('div'); row.className = 'bubble-row '+who;
  var b = document.createElement('div'); b.className = 'bubble';
  b.innerHTML = formatCodeBlocks(text);
  b.addEventListener('contextmenu', function(e) { if (who==='ai') { e.preventDefault(); speakText(text); } });
  row.appendChild(b);
  var ts = document.createElement('div'); ts.className = 'timestamp'; ts.textContent = getTime(); row.appendChild(ts);
  if (provider&&who==='ai') { var badge = document.createElement('div'); badge.className = 'provider-badge'; badge.textContent = provider; row.appendChild(badge); }
  messagesEl.appendChild(row); if (typingEl) messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function addBubbleNoSave(text, who) {
  if (!messagesEl) return; var row = document.createElement('div'); row.className = 'bubble-row '+who;
  var b = document.createElement('div'); b.className = 'bubble'; b.innerHTML = formatCodeBlocks(text);
  row.appendChild(b); messagesEl.appendChild(row);
}
function addError(msg) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var el = document.createElement('div'); el.className = 'error-bubble'; el.textContent = msg; messagesEl.appendChild(el); if (typingEl) messagesEl.appendChild(typingEl); }

// ── CODE BLOCKS ──
function formatCodeBlocks(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, function(match, lang, code) {
      return '<div class="code-block"><div class="code-header"><span>' + (lang || 'code') + '</span><button class="code-copy" onclick="copyCode(this)">📋 Copy</button></div><pre><code>' + escapeHtml(code.trim()) + '</code></pre></div>';
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}
function escapeHtml(text) { return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function copyCode(btn) {
  var code = btn.closest('.code-block').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(function() { btn.textContent = '✅ Copied'; setTimeout(function(){ btn.textContent = '📋 Copy'; }, 2000); });
}

// ── CHAT ACTIONS ──
function saveCurrentChat() { if (!conversation.length) return; savedChats[currentChatId] = { conversation: conversation.slice(-50), preview: conversation[conversation.length-1]?.content?.slice(0,50)||'', timestamp: Date.now() }; localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats)); loadSavedChats(); }
function exportChat() { var t = conversation.map(function(m){return m.role+': '+m.content;}).join('\n\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t],{type:'text/plain'})); a.download = 'chrxmaticc-chat.txt'; a.click(); hideChatActions(); }
function clearChat() { conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } hideChatActions(); }

// ── VOICE / TTS ──
function toggleMic() { if (!recognition) return; if (isListening) { recognition.stop(); stopMicUI(); } else { recognition.start(); startMicUI(); } }
function startMicUI() { isListening = true; if (micBtn) micBtn.textContent = '🔴'; if (micStatus) micStatus.classList.add('visible'); }
function stopMicUI() { isListening = false; if (micBtn) micBtn.textContent = '🎤'; if (micStatus) micStatus.classList.remove('visible'); }
function toggleTTS() { ttsEnabled = !ttsEnabled; if (ttsBtn) ttsBtn.textContent = ttsEnabled ? '🔊' : '🔇'; if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g,'').slice(0,300)); u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; window.speechSynthesis.speak(u); }

// ── SURPRISE FEATURES ──
function triggerEasterEgg() {
  document.body.style.transform = 'rotate(0.5deg)';
  setTimeout(function(){ document.body.style.transform = ''; }, 600);
  launchConfetti();
  var quotes = ['You found the secret.', 'Thread pulled from pure vibes.', 'The vault is wet. The neon beeps.', '26 shaders. 13 2D. 13 3D.', 'Chrxmee-Midnightt was here.'];
  addHint('🥚 ' + quotes[Math.floor(Math.random()*quotes.length)]);
}

function randomCompliment() {
  var compliments = [
    '💡 You\'re on fire today.', '🚀 Your ideas are next level.', '🧠 Big brain energy right now.',
    '⚡ You\'re building something legendary.', '🔥 This conversation is productive.'
  ];
  addHint(compliments[Math.floor(Math.random()*compliments.length)]);
}

function launchConfetti() {
  if (confettiActive) return; confettiActive = true;
  var ctx = confettiCanvas?.getContext('2d'); if (!ctx) { confettiActive = false; return; }
  confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';
  var particles = [];
  for (var i = 0; i < 60; i++) {
    particles.push({ x: Math.random()*confettiCanvas.width, y: -20, vx: (Math.random()-0.5)*6, vy: Math.random()*4+2, size: Math.random()*6+3, color: 'hsl('+Math.random()*360+',80%,60%)', rotation: Math.random()*360 });
  }
  function animate() {
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    var alive = false;
    particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.rotation += 2;
      if (p.y < confettiCanvas.height + 20) { alive = true; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation*Math.PI/180); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore(); }
    });
    if (alive) requestAnimationFrame(animate); else { confettiCanvas.style.display = 'none'; confettiActive = false; }
  }
  animate();
}

// ── START ──
init();
