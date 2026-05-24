// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Web Dashboard     ║
// ║  iMessage UI • Settings • Auth • Profile ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn, micStatus, ttsBtn;
var sidebar, overlay, contactModal, savedChatsList, chatSearch, profileName, profileAvatar;

var conversation = [], savedChats = {}, currentChatId = 'main';
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var selectedAvatar = '🧠', customBackground = '', customBehavior = 'default', surpriseMode = false, currentTheme = 'midnight';

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
  overlay = document.getElementById('overlay');
  contactModal = document.getElementById('contactModal');
  savedChatsList = document.getElementById('savedChatsList');
  chatSearch = document.getElementById('chatSearch');
  profileName = document.getElementById('profileName');
  profileAvatar = document.getElementById('profileAvatar');
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

  changeTheme(currentTheme);
  applyBackground();
  updateAllAvatars();
  updateSidebarProfile();
  loadSavedChats();
  loadProfile();
  updateSurpriseUI();
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
}

// ── THEME ──
function changeTheme(theme) { currentTheme = theme; document.body.className = 'theme-' + theme; localStorage.setItem('chrxmaticc_theme', theme); }

// ── BACKGROUND ──
function applyBackground() {
  if (customBackground) { document.body.style.backgroundImage = 'url(' + customBackground + ')'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
  else { document.body.style.backgroundImage = ''; }
}
function setBackgroundGradient(c1, c2) { customBackground = ''; localStorage.removeItem('chrxmaticc_background'); document.body.style.backgroundImage = 'linear-gradient(135deg, #' + c1 + ', #' + c2 + ')'; document.body.style.backgroundSize = 'cover'; }
function promptBackground() { var url = prompt('Paste image URL:'); if (url && url.trim()) { customBackground = url.trim(); localStorage.setItem('chrxmaticc_background', customBackground); applyBackground(); } }
function removeBackground() { customBackground = ''; localStorage.removeItem('chrxmaticc_background'); document.body.style.backgroundImage = ''; }

// ── AVATAR ──
function setAvatar(emoji) { selectedAvatar = emoji; localStorage.setItem('chrxmaticc_avatar', emoji); updateAllAvatars(); saveProfile(); }
function updateAllAvatars() { ['sidebarAvatar','topbarAvatar','contactAvatar','profileAvatar','settingsAvatar'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = selectedAvatar; }); }

// ── BEHAVIOR ──
function setBehavior(b) { customBehavior = b; localStorage.setItem('chrxmaticc_behavior', b); if (document.getElementById('behaviorSelect')) document.getElementById('behaviorSelect').value = b; }

// ── SURPRISE ──
function toggleSurpriseMode() { surpriseMode = !surpriseMode; localStorage.setItem('chrxmaticc_surprise', surpriseMode.toString()); updateSurpriseUI(); if (surpriseMode) document.body.classList.add('surprise-mode'); else document.body.classList.remove('surprise-mode'); }
function updateSurpriseUI() { var el = document.getElementById('surpriseStatus'); if (el) el.textContent = surpriseMode ? 'ON' : 'OFF'; }

// ── PROFILE ──
function saveProfile() {
  var u = document.getElementById('settingsUsername')?.value?.trim() || '';
  var d = document.getElementById('settingsDisplayName')?.value?.trim() || '';
  var b = document.getElementById('settingsBio')?.value?.trim() || '';
  var p = document.getElementById('settingsPersonalInfo')?.value?.trim() || '';
  localStorage.setItem('chrxmaticc_profile', JSON.stringify({ username: u, displayName: d, bio: b, avatar: selectedAvatar, personalInfo: p }));
}
function loadProfile() {
  try {
    var p = JSON.parse(localStorage.getItem('chrxmaticc_profile') || '{}');
    if (document.getElementById('settingsUsername')) document.getElementById('settingsUsername').value = p.username || '';
    if (document.getElementById('settingsDisplayName')) document.getElementById('settingsDisplayName').value = p.displayName || '';
    if (document.getElementById('settingsBio')) document.getElementById('settingsBio').value = p.bio || '';
    if (document.getElementById('settingsPersonalInfo')) document.getElementById('settingsPersonalInfo').value = p.personalInfo || '';
    if (document.getElementById('settingsAvatar')) document.getElementById('settingsAvatar').textContent = selectedAvatar;
    if (document.getElementById('behaviorSelect')) document.getElementById('behaviorSelect').value = customBehavior;
  } catch(e) {}
}
function getProfileForAI() {
  try { var p = JSON.parse(localStorage.getItem('chrxmaticc_profile') || '{}'); var parts = []; if (p.displayName) parts.push('Call me ' + p.displayName); if (p.bio) parts.push('Bio: ' + p.bio); if (p.personalInfo) parts.push('About me: ' + p.personalInfo); return parts.join('. '); } catch(e) { return ''; }
}

// ── SIDEBAR ──
function toggleSidebar() { if (sidebar) sidebar.classList.toggle('open'); if (overlay) overlay.classList.toggle('visible'); }
function updateSidebarProfile() { if (profileName) profileName.textContent = localStorage.getItem('chrxmaticc_email') || 'Guest'; if (profileAvatar) profileAvatar.textContent = selectedAvatar; }
function loadSavedChats() {
  if (!savedChatsList) return;
  savedChatsList.innerHTML = '<div class="chat-item active" onclick="loadChat(\'main\')"><div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">Yo! I\'m Chrxmaticc Copilot...</div></div><div class="chat-item-time">Now</div></div>';
  Object.keys(savedChats).sort(function(a,b){ return (savedChats[b].timestamp||0) - (savedChats[a].timestamp||0); }).forEach(function(id) {
    var c = savedChats[id]; var d = document.createElement('div'); d.className = 'chat-item'; d.onclick = function() { loadChat(id); };
    d.innerHTML = '<div class="chat-item-avatar">' + selectedAvatar + '</div><div class="chat-item-info"><div class="chat-item-name">Chat ' + new Date(c.timestamp).toLocaleDateString() + '</div><div class="chat-item-preview">' + (c.preview||'Empty') + '</div></div><div class="chat-item-time">' + new Date(c.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) + '</div>';
    savedChatsList.appendChild(d);
  });
}
function loadChat(id) { saveCurrentChat(); currentChatId = id; conversation = []; if (messagesEl) messagesEl.innerHTML = ''; if (savedChats[id]?.conversation) { conversation = savedChats[id].conversation; conversation.forEach(function(m) { addBubbleNoSave(m.content, m.role==='user'?'user':'ai'); }); } if (messagesEl && typingEl) messagesEl.appendChild(typingEl); toggleSidebar(); }
function newChat() { saveCurrentChat(); currentChatId = 'chat_'+Date.now(); conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } }
function filterChats() { var q = (chatSearch?.value||'').toLowerCase(); document.querySelectorAll('#savedChatsList .chat-item').forEach(function(el) { el.style.display = el.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none'; }); }

// ── SEND ──
async function sendMessage() {
  if (!inputEl) return; var text = inputEl.value.trim(); if (!text) return;
  addBubble(text, 'user'); conversation.push({ role:'user', content:text }); inputEl.value = ''; inputEl.style.height = 'auto'; if (sendBtn) sendBtn.disabled = true;
  if (typingEl) typingEl.classList.add('visible'); setStatus('thinking'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  try {
    var body = { message: text }; var profileInfo = getProfileForAI(); if (profileInfo) body.personalInfo = profileInfo;
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
function exportChat() { var t = conversation.map(function(m){return m.role+': '+m.content;}).join('\n\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t],{type:'text/plain'})); a.download = 'chrxmaticc-chat.txt'; a.click(); hideContactInfo(); }
function clearChat() { conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } hideContactInfo(); }
function clearAllData() { if (confirm('Clear all local data?')) { localStorage.clear(); location.reload(); } }

// ── VOICE / TTS ──
function toggleMic() { if (!recognition) return; if (isListening) { recognition.stop(); stopMicUI(); } else { recognition.start(); startMicUI(); } }
function startMicUI() { isListening = true; if (micBtn) micBtn.textContent = '🔴'; if (micStatus) micStatus.classList.add('visible'); }
function stopMicUI() { isListening = false; if (micBtn) micBtn.textContent = '🎤'; if (micStatus) micStatus.classList.remove('visible'); }
function toggleTTS() { ttsEnabled = !ttsEnabled; if (ttsBtn) ttsBtn.textContent = ttsEnabled ? '🔊' : '🔇'; if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.slice(0,300)); u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; window.speechSynthesis.speak(u); }

// ── MODALS ──
function showContactInfo() { if (contactModal) { contactModal.classList.add('visible'); var el = document.getElementById('contactAvatar'); if (el) el.textContent = selectedAvatar; } }
function hideContactInfo() { if (contactModal) contactModal.classList.remove('visible'); }

// ── START ──
init();
