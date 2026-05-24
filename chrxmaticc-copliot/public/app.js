// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Web Dashboard     ║
// ║  Fully Working • All Features Connected  ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

// ──────────────────────────────────────────────
//  DOM ELEMENTS (safe grab)
// ──────────────────────────────────────────────
var messagesEl = document.getElementById('messages');
var inputEl = document.getElementById('userInput');
var sendBtn = document.getElementById('sendBtn');
var typingEl = document.getElementById('typing');
var statusDot = document.getElementById('statusDot');
var statusText = document.getElementById('statusText');
var micBtn = document.getElementById('micBtn');
var micStatus = document.getElementById('micStatus');
var ttsBtn = document.getElementById('ttsBtn');
var sidebar = document.getElementById('sidebar');
var overlay = document.getElementById('overlay');
var contactModal = document.getElementById('contactModal');
var savedChatsList = document.getElementById('savedChatsList');
var chatSearch = document.getElementById('chatSearch');
var profileName = document.getElementById('profileName');
var profileAvatar = document.getElementById('profileAvatar');

// ──────────────────────────────────────────────
//  STATE
// ──────────────────────────────────────────────
var conversation = [];
var savedChats = {};
var currentChatId = 'main';
var isListening = false;
var ttsEnabled = true;
var lastAIResponse = '';
var recognition = null;
var selectedAvatar = '🧠';
var customBackground = '';
var customBehavior = 'default';
var surpriseMode = false;
var currentTheme = 'midnight';

// ──────────────────────────────────────────────
//  INIT — Load everything from localStorage
// ──────────────────────────────────────────────
function init() {
  try { savedChats = JSON.parse(localStorage.getItem('chrxmaticc_chats') || '{}'); } catch(e) { savedChats = {}; }
  selectedAvatar = localStorage.getItem('chrxmaticc_avatar') || '🧠';
  customBackground = localStorage.getItem('chrxmaticc_background') || '';
  customBehavior = localStorage.getItem('chrxmaticc_behavior') || 'default';
  surpriseMode = localStorage.getItem('chrxmaticc_surprise') === 'true';
  currentTheme = localStorage.getItem('chrxmaticc_theme') || 'midnight';
  
  changeTheme(currentTheme);
  applyBackground();
  updateAllAvatars();
  updateSidebarProfile();
  loadSavedChats();
  
  if (surpriseMode) document.body.classList.add('surprise-mode');
}

// ──────────────────────────────────────────────
//  THEMES
// ──────────────────────────────────────────────
function changeTheme(theme) {
  currentTheme = theme;
  document.body.className = 'theme-' + theme;
  localStorage.setItem('chrxmaticc_theme', theme);
}

// ──────────────────────────────────────────────
//  BACKGROUNDS
// ──────────────────────────────────────────────
function applyBackground() {
  if (customBackground) {
    document.body.style.backgroundImage = 'url(' + customBackground + ')';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  } else {
    document.body.style.backgroundImage = '';
  }
}

function promptBackground() {
  var url = prompt('Paste an image URL for your chat background:');
  if (url && url.trim()) {
    customBackground = url.trim();
    localStorage.setItem('chrxmaticc_background', customBackground);
    applyBackground();
  }
}

function removeBackground() {
  customBackground = '';
  localStorage.removeItem('chrxmaticc_background');
  applyBackground();
}

// ──────────────────────────────────────────────
//  AVATARS
// ──────────────────────────────────────────────
function setAvatar(emoji) {
  selectedAvatar = emoji;
  localStorage.setItem('chrxmaticc_avatar', emoji);
  updateAllAvatars();
}

function updateAllAvatars() {
  var ids = ['sidebarAvatar', 'topbarAvatar', 'contactAvatar', 'profileAvatar'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.textContent = selectedAvatar;
  }
}

// ──────────────────────────────────────────────
//  BEHAVIORS
// ──────────────────────────────────────────────
function setBehavior(behavior) {
  customBehavior = behavior;
  localStorage.setItem('chrxmaticc_behavior', behavior);
}

// ──────────────────────────────────────────────
//  SURPRISE MODE
// ──────────────────────────────────────────────
function toggleSurpriseMode() {
  surpriseMode = !surpriseMode;
  localStorage.setItem('chrxmaticc_surprise', surpriseMode.toString());
  if (surpriseMode) { document.body.classList.add('surprise-mode'); }
  else { document.body.classList.remove('surprise-mode'); }
}

// ──────────────────────────────────────────────
//  SIDEBAR
// ──────────────────────────────────────────────
function toggleSidebar() {
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('visible');
}

function updateSidebarProfile() {
  var email = localStorage.getItem('chrxmaticc_email');
  if (profileName) profileName.textContent = email || 'Guest';
  if (profileAvatar) profileAvatar.textContent = selectedAvatar;
}

function loadSavedChats() {
  if (!savedChatsList) return;
  savedChatsList.innerHTML = '';
  
  var mainItem = document.createElement('div');
  mainItem.className = 'chat-item active';
  mainItem.onclick = function() { loadChat('main'); };
  mainItem.innerHTML = '<div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">Yo! I\'m Chrxmaticc Copilot...</div></div><div class="chat-item-time">Now</div>';
  savedChatsList.appendChild(mainItem);
  
  var ids = Object.keys(savedChats).sort(function(a,b) { return (savedChats[b].timestamp||0) - (savedChats[a].timestamp||0); });
  for (var i = 0; i < ids.length; i++) {
    var chat = savedChats[ids[i]];
    var div = document.createElement('div');
    div.className = 'chat-item';
    div.onclick = (function(id) { return function() { loadChat(id); }; })(ids[i]);
    div.innerHTML = '<div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chat ' + new Date(chat.timestamp).toLocaleDateString() + '</div><div class="chat-item-preview">' + (chat.preview || 'Empty') + '</div></div><div class="chat-item-time">' + new Date(chat.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) + '</div>';
    savedChatsList.appendChild(div);
  }
}

function loadChat(id) {
  saveCurrentChat();
  currentChatId = id;
  conversation = [];
  if (messagesEl) messagesEl.innerHTML = '';
  
  if (savedChats[id] && savedChats[id].conversation) {
    conversation = savedChats[id].conversation;
    for (var i = 0; i < conversation.length; i++) {
      addBubbleNoSave(conversation[i].content, conversation[i].role === 'user' ? 'user' : 'ai');
    }
  }
  if (messagesEl && typingEl) messagesEl.appendChild(typingEl);
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  toggleSidebar();
}

function newChat() {
  saveCurrentChat();
  currentChatId = 'chat_' + Date.now();
  conversation = [];
  if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); }
}

function filterChats() {
  var query = (chatSearch ? chatSearch.value : '').toLowerCase();
  var items = document.querySelectorAll('#savedChatsList .chat-item');
  for (var i = 0; i < items.length; i++) {
    items[i].style.display = items[i].textContent.toLowerCase().indexOf(query) !== -1 ? '' : 'none';
  }
}

// ──────────────────────────────────────────────
//  SEND MESSAGE — The core
// ──────────────────────────────────────────────
async function sendMessage() {
  if (!inputEl) return;
  var text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, 'user');
  conversation.push({ role: 'user', content: text });
  inputEl.value = '';
  inputEl.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true;

  if (typingEl) typingEl.classList.add('visible');
  setStatus('thinking');
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    var data = await res.json();
    if (typingEl) typingEl.classList.remove('visible');

    if (data.response) {
      setStatus('online');
      lastAIResponse = data.response;
      addBubble(data.response, 'ai', data.provider);
      conversation.push({ role: 'assistant', content: data.response });
      if (ttsEnabled) speakText(data.response);
      saveCurrentChat();
    } else {
      setStatus('online');
      addError(data.error || 'Brain hiccup. Try again.');
    }
  } catch (err) {
    if (typingEl) typingEl.classList.remove('visible');
    setStatus('offline');
    addError('Copilot is offline. Is the server running?');
  }

  if (sendBtn) sendBtn.disabled = false;
  if (inputEl) inputEl.focus();
}

function quickSend(text) {
  if (inputEl) { inputEl.value = text; sendMessage(); }
}

// ──────────────────────────────────────────────
//  BUBBLES
// ──────────────────────────────────────────────
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setStatus(state) {
  if (!statusDot || !statusText) return;
  statusDot.className = 'status-dot';
  if (state === 'thinking') { statusDot.classList.add('thinking'); statusText.textContent = 'Thinking...'; }
  else if (state === 'offline') { statusDot.classList.add('offline'); statusText.textContent = 'Offline'; }
  else { statusText.textContent = 'Online'; }
}

function addBubble(text, who, provider) {
  if (!messagesEl) return;
  if (typingEl && typingEl.parentNode) typingEl.remove();
  
  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  
  var ts = document.createElement('div');
  ts.className = 'timestamp';
  ts.textContent = getTime();
  row.appendChild(ts);
  
  if (provider && who === 'ai') {
    var badge = document.createElement('div');
    badge.className = 'provider-badge';
    badge.textContent = provider;
    row.appendChild(badge);
  }
  
  messagesEl.appendChild(row);
  if (typingEl) messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addBubbleNoSave(text, who) {
  if (!messagesEl) return;
  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
}

function addError(msg) {
  if (!messagesEl) return;
  if (typingEl && typingEl.parentNode) typingEl.remove();
  var el = document.createElement('div');
  el.className = 'error-bubble';
  el.textContent = msg;
  messagesEl.appendChild(el);
  if (typingEl) messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ──────────────────────────────────────────────
//  SAVE / EXPORT / CLEAR
// ──────────────────────────────────────────────
function saveCurrentChat() {
  if (conversation.length === 0) return;
  savedChats[currentChatId] = {
    conversation: conversation.slice(-50),
    preview: conversation[conversation.length-1]?.content?.slice(0, 50) || '',
    timestamp: Date.now()
  };
  localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats));
  loadSavedChats();
}

function exportChat() {
  var text = conversation.map(function(m) { return m.role + ': ' + m.content; }).join('\n\n');
  var blob = new Blob([text], { type: 'text/plain' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chrxmaticc-chat.txt'; a.click();
  hideContactInfo();
}

function clearChat() {
  conversation = [];
  if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); }
  hideContactInfo();
}

// ──────────────────────────────────────────────
//  VOICE & TTS
// ──────────────────────────────────────────────
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = function(e) { if (inputEl) { inputEl.value = e.results[0][0].transcript; sendMessage(); } };
  recognition.onend = function() { stopMicUI(); };
}

function toggleMic() {
  if (!recognition) return;
  if (isListening) { recognition.stop(); stopMicUI(); }
  else { recognition.start(); startMicUI(); }
}
function startMicUI() { isListening = true; if (micBtn) micBtn.textContent = '🔴'; if (micStatus) micStatus.classList.add('visible'); }
function stopMicUI() { isListening = false; if (micBtn) micBtn.textContent = '🎤'; if (micStatus) micStatus.classList.remove('visible'); }

function toggleTTS() { ttsEnabled = !ttsEnabled; if (ttsBtn) ttsBtn.textContent = ttsEnabled ? '🔊' : '🔇'; if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }
function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text.slice(0, 300));
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

// ──────────────────────────────────────────────
//  MODALS
// ──────────────────────────────────────────────
function showContactInfo() { if (contactModal) { contactModal.classList.add('visible'); document.getElementById('contactAvatar').textContent = selectedAvatar; } }
function hideContactInfo() { if (contactModal) contactModal.classList.remove('visible'); }

// ──────────────────────────────────────────────
//  KEYBOARD
// ──────────────────────────────────────────────
if (inputEl) {
  inputEl.addEventListener('input', function() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  });
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

// ──────────────────────────────────────────────
//  STARTUP
// ──────────────────────────────────────────────
init();
