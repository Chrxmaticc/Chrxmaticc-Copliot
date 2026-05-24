// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Web Dashboard     ║
// ║  Foldable Sidebar • Multi-Chat • Actions ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn, micStatus, ttsBtn;
var sidebar, miniSidebar, overlay, savedChatsList, chatSearch, profileName, profileAvatar;
var chatActionModal;

var conversation = [], savedChats = {}, currentChatId = 'main';
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var selectedAvatar = '🧠', customBackground = '', customBehavior = 'default', surpriseMode = false, currentTheme = 'midnight';
var sidebarFolded = false;

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

  changeTheme(currentTheme);
  applyBackground();
  updateAllAvatars();
  updateSidebarProfile();
  loadSavedChats();
  if (sidebarFolded) applyFoldState();
  if (surpriseMode) document.body.classList.add('surprise-mode');

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

  // Click mini avatars to switch chats
  document.addEventListener('click', function(e) {
    if (e.target.closest('.mini-chat-avatar')) {
      var id = e.target.closest('.mini-chat-avatar').dataset.chatId;
      loadChat(id);
    }
  });

  // Long press on chat items for actions
  document.addEventListener('contextmenu', function(e) {
    var chatItem = e.target.closest('.chat-item');
    if (chatItem && chatItem.dataset.chatId && chatItem.dataset.chatId !== 'main') {
      e.preventDefault();
      currentChatId = chatItem.dataset.chatId;
      showChatActions();
    }
  });
}

// ── THEME ──
function changeTheme(theme) { currentTheme = theme; document.body.className = 'theme-' + theme; localStorage.setItem('chrxmaticc_theme', theme); }

// ── BACKGROUND ──
function applyBackground() {
  if (customBackground) { document.body.style.backgroundImage = 'url(' + customBackground + ')'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
  else { document.body.style.backgroundImage = ''; }
}
function promptBackground() { var url = prompt('Paste image URL:'); if (url && url.trim()) { customBackground = url.trim(); localStorage.setItem('chrxmaticc_background', customBackground); applyBackground(); } }
function removeBackground() { customBackground = ''; localStorage.removeItem('chrxmaticc_background'); document.body.style.backgroundImage = ''; }

// ── AVATAR ──
function setAvatar(emoji) { selectedAvatar = emoji; localStorage.setItem('chrxmaticc_avatar', emoji); updateAllAvatars(); }
function updateAllAvatars() { ['sidebarAvatar','topbarAvatar','profileAvatar'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = selectedAvatar; }); }

// ── SIDEBAR FOLD ──
function foldSidebar() {
  sidebarFolded = true;
  localStorage.setItem('chrxmaticc_sidebar_folded', 'true');
  applyFoldState();
  if (overlay) overlay.classList.remove('visible');
}

function unfoldSidebar() {
  sidebarFolded = false;
  localStorage.setItem('chrxmaticc_sidebar_folded', 'false');
  applyFoldState();
}

function applyFoldState() {
  if (sidebarFolded) {
    if (sidebar) { sidebar.classList.remove('open'); sidebar.style.display = 'none'; }
    if (miniSidebar) { miniSidebar.classList.add('visible'); }
    updateMiniAvatars();
  } else {
    if (sidebar) sidebar.style.display = '';
    if (miniSidebar) miniSidebar.classList.remove('visible');
  }
}

function updateMiniAvatars() {
  var container = document.getElementById('miniAvatars');
  if (!container) return;
  container.innerHTML = '';
  var ids = Object.keys(savedChats).sort(function(a,b) { return (savedChats[b].timestamp||0) - (savedChats[a].timestamp||0); }).slice(0, 5);
  ids.forEach(function(id) {
    var div = document.createElement('div');
    div.className = 'mini-chat-avatar';
    div.dataset.chatId = id;
    div.textContent = selectedAvatar;
    div.title = savedChats[id].preview || 'Chat';
    container.appendChild(div);
  });
}

// ── SIDEBAR ──
function toggleSidebar() {
  if (sidebarFolded) { unfoldSidebar(); return; }
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('visible');
}

function updateSidebarProfile() {
  if (profileName) profileName.textContent = localStorage.getItem('chrxmaticc_email') || 'Guest';
  if (profileAvatar) profileAvatar.textContent = selectedAvatar;
}

function loadSavedChats() {
  if (!savedChatsList) return;
  savedChatsList.innerHTML = '';
  
  // Main chat always first
  var mainDiv = document.createElement('div');
  mainDiv.className = 'chat-item' + (currentChatId === 'main' ? ' active' : '');
  mainDiv.dataset.chatId = 'main';
  mainDiv.onclick = function() { loadChat('main'); };
  mainDiv.innerHTML = '<div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">' + (savedChats['main']?.preview || 'Yo! I\'m Chrxmaticc Copilot...') + '</div></div><div class="chat-item-time">' + (savedChats['main'] ? new Date(savedChats['main'].timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Now') + '</div>';
  savedChatsList.appendChild(mainDiv);

  // Other chats
  var ids = Object.keys(savedChats).filter(function(id) { return id !== 'main'; }).sort(function(a,b) { return (savedChats[b].timestamp||0) - (savedChats[a].timestamp||0); });
  ids.forEach(function(id) {
    var c = savedChats[id];
    var div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = id;
    div.onclick = function() { loadChat(id); };
    div.innerHTML = '<div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chat ' + new Date(c.timestamp).toLocaleDateString() + '</div><div class="chat-item-preview">' + (c.preview || 'Empty') + '</div></div><div class="chat-item-time">' + new Date(c.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) + '</div><button class="chat-item-actions-btn" onclick="event.stopPropagation(); selectChat(\'' + id + '\'); showChatActions();">⋯</button>';
    savedChatsList.appendChild(div);
  });

  updateMiniAvatars();
}

function selectChat(id) { currentChatId = id; }
function loadChat(id) {
  if (id === currentChatId && conversation.length > 0) { toggleSidebar(); return; }
  saveCurrentChat();
  currentChatId = id;
  conversation = [];
  if (messagesEl) messagesEl.innerHTML = '';
  if (savedChats[id]?.conversation) {
    conversation = savedChats[id].conversation;
    conversation.forEach(function(m) { addBubbleNoSave(m.content, m.role==='user'?'user':'ai'); });
  }
  if (messagesEl && typingEl) messagesEl.appendChild(typingEl);
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  loadSavedChats();
  if (!sidebarFolded) toggleSidebar();
}

function newChat() {
  saveCurrentChat();
  currentChatId = 'chat_' + Date.now();
  conversation = [];
  if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); }
  if (savedChatsList) loadSavedChats();
  if (sidebarFolded) unfoldSidebar();
  if (inputEl) inputEl.focus();
}

function deleteChat() {
  if (currentChatId === 'main') { hideChatActions(); return; }
  delete savedChats[currentChatId];
  localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats));
  currentChatId = 'main';
  conversation = [];
  if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); }
  loadChat('main');
  hideChatActions();
}

function filterChats() {
  var q = (chatSearch?.value||'').toLowerCase();
  document.querySelectorAll('#savedChatsList .chat-item').forEach(function(el) {
    el.style.display = el.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
  });
}

// ── CHAT ACTIONS MODAL ──
function showChatActions() { if (chatActionModal) chatActionModal.classList.add('visible'); if (overlay) overlay.classList.add('visible'); }
function hideChatActions() { if (chatActionModal) chatActionModal.classList.remove('visible'); if (overlay) overlay.classList.remove('visible'); }

// ── SEND ──
async function sendMessage() {
  if (!inputEl) return; var text = inputEl.value.trim(); if (!text) return;
  addBubble(text, 'user'); conversation.push({ role:'user', content:text }); inputEl.value = ''; inputEl.style.height = 'auto'; if (sendBtn) sendBtn.disabled = true;
  if (typingEl) typingEl.classList.add('visible'); setStatus('thinking'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  try {
    var body = { message: text };
    try { var p = JSON.parse(localStorage.getItem('chrxmaticc_profile')||'{}'); var parts = []; if (p.displayName) parts.push('Call me '+p.displayName); if (p.personalInfo) parts.push('About me: '+p.personalInfo); if (parts.length) body.personalInfo = parts.join('. '); } catch(e) {}
    var res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var data = await res.json(); if (typingEl) typingEl.classList.remove('visible');
    if (data.response) { setStatus('online'); lastAIResponse = data.response; addBubble(data.response, 'ai', data.provider); conversation.push({ role:'assistant', content:data.response }); if (ttsEnabled) speakText(data.response); saveCurrentChat(); }
    else { setStatus('online'); addError(data.error || 'Brain hiccup.'); }
  } catch(e) { if (typingEl) typingEl.classList.remove('visible'); setStatus('offline'); addError('Offline.'); }
  if (sendBtn) sendBtn.disabled = false; if (inputEl) inputEl.focus();
}
function quickSend(text) { if (inputEl) { inputEl.value = text; sendMessage(); } }

// ── BUBBLES ──
function getTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function setStatus(s) { if (!statusDot||!statusText) return; statusDot.className = 'status-dot'; if (s==='thinking'){statusDot.classList.add('thinking');statusText.textContent='Thinking...';} else if(s==='offline'){statusDot.classList.add('offline');statusText.textContent='Offline';} else {statusText.textContent='Online';} }
function addBubble(text, who, provider) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var row = document.createElement('div'); row.className = 'bubble-row '+who; var b = document.createElement('div'); b.className = 'bubble'; b.textContent = text; row.appendChild(b); var ts = document.createElement('div'); ts.className = 'timestamp'; ts.textContent = getTime(); row.appendChild(ts); if (provider&&who==='ai') { var badge = document.createElement('div'); badge.className = 'provider-badge'; badge.textContent = provider; row.appendChild(badge); } messagesEl.appendChild(row); if (typingEl) messagesEl.appendChild(typingEl); messagesEl.scrollTop = messagesEl.scrollHeight; }
function addBubbleNoSave(text, who) { if (!messagesEl) return; var row = document.createElement('div'); row.className = 'bubble-row '+who; var b = document.createElement('div'); b.className = 'bubble'; b.textContent = text; row.appendChild(b); messagesEl.appendChild(row); }
function addError(msg) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var el = document.createElement('div'); el.className = 'error-bubble'; el.textContent = msg; messagesEl.appendChild(el); if (typingEl) messagesEl.appendChild(typingEl); }

// ── CHAT ACTIONS ──
function saveCurrentChat() { if (!conversation.length) return; savedChats[currentChatId] = { conversation: conversation.slice(-50), preview: conversation[conversation.length-1]?.content?.slice(0,50)||'', timestamp: Date.now() }; localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats)); loadSavedChats(); }
function exportChat() { var t = conversation.map(function(m){return m.role+': '+m.content;}).join('\n\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t],{type:'text/plain'})); a.download = 'chrxmaticc-chat.txt'; a.click(); hideChatActions(); }
function clearChat() { conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } hideChatActions(); }

// ── VOICE / TTS ──
function toggleMic() { if (!recognition) return; if (isListening) { recognition.stop(); stopMicUI(); } else { recognition.start(); startMicUI(); } }
function startMicUI() { isListening = true; if (micBtn) micBtn.textContent = '🔴'; if (micStatus) micStatus.classList.add('visible'); }
function stopMicUI() { isListening = false; if (micBtn) micBtn.textContent = '🎤'; if (micStatus) micStatus.classList.remove('visible'); }
function toggleTTS() { ttsEnabled = !ttsEnabled; if (ttsBtn) ttsBtn.textContent = ttsEnabled ? '🔊' : '🔇'; if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.slice(0,300)); u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; window.speechSynthesis.speak(u); }

// ── START ──
init();
