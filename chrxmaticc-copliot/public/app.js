// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Complete App       ║
// ║  SVGs • Memory • Typing Speed • Token   ║
// ║  Themes • Surprises • Chrome Edition     ║
// ║  Author: Chrxmee-Midnightt               ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn, ttsBtn;
var sidebar, miniSidebar, overlay, savedChatsList, chatSearch, profileName, profileAvatar;
var personalitySelect, confettiCanvas, fileInput, filePreview, attachBtn;
var conversation = [], savedChats = {}, currentChatId = 'main';
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var selectedAvatar = 'icon.png', customBackground = '', currentTheme = 'gold';
var sidebarFolded = false, currentPersonality = 'conversational';
var messageCount = 0, lastChatId = null, confettiActive = false;
var pendingFile = null, surpriseMode = false, userProfile = {};
var chatSearchOpen = false, typingSpeed = 10;
var sneakLevel = 0;

// ═══════════════════════════════════════════
//  MEMORY SYSTEM (PostgreSQL)
// ═══════════════════════════════════════════
var userMemory = { facts: [], history: [] };
var memoryUserId = 'anonymous';

function initUserId() {
  var user = null;
  try { user = JSON.parse(localStorage.getItem('chrxmaticc_user')); } catch(e) {}
  memoryUserId = (user && user.email) || (user && user.discordId) || (user && user.githubId) || 'guest_' + Math.random().toString(36).slice(2, 8);
}

async function loadMemory() {
  initUserId();
  try {
    var res = await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'get', userId: memoryUserId }) });
    var data = await res.json();
    userMemory.facts = data.facts || [];
    userMemory.history = data.history || [];
  } catch(e) {}
}

async function saveMemory() {
  try { await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'save', userId: memoryUserId, facts: userMemory.facts, history: userMemory.history }) }); } catch(e) {}
}

async function addFact(fact) {
  if (!fact || userMemory.facts.includes(fact)) return;
  userMemory.facts.push(fact);
  if (userMemory.facts.length > 50) userMemory.facts.shift();
  try { await fetch('/api/memory', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'addFact', userId: memoryUserId, fact: fact }) }); } catch(e) {}
}

function extractFacts(message) {
  var patterns = [
    { regex: /(?:i am|i'm|call me|my name is)\s+([^.,!?]{2,30})/i, prefix: 'Name:' },
    { regex: /(?:i like|i love|i enjoy)\s+([^.,!?]{2,40})/i, prefix: 'Likes:' },
    { regex: /(?:i hate|i despise|i can't stand|i dislike)\s+([^.,!?]{2,40})/i, prefix: 'Dislikes:' },
    { regex: /(?:i (?:am|work as) (?:a|an))\s+([^.,!?]{2,40})/i, prefix: 'Job:' },
    { regex: /(?:i live in|i'm from)\s+([^.,!?]{2,40})/i, prefix: 'Location:' },
    { regex: /(?:my favorite|i prefer)\s+([^.,!?]{2,40})/i, prefix: 'Prefers:' },
    { regex: /remember\s+(?:that\s+)?(.{5,100})/i, prefix: '' }
  ];
  for (var p of patterns) {
    var match = message.match(p.regex);
    if (match) addFact(p.prefix ? p.prefix + ' ' + match[1].trim() : match[1].trim());
  }
}

function addToHistory(role, content) {
  userMemory.history.push({ role: role, content: content });
  if (userMemory.history.length > 20) userMemory.history = userMemory.history.slice(-20);
  saveMemory();
}

function getMemoryContext() {
  var parts = [];
  if (userMemory.facts.length > 0) parts.push('Facts about the user: ' + userMemory.facts.join('; '));
  if (userMemory.history.length > 0) {
    var recent = userMemory.history.slice(-6);
    parts.push('Recent chat:\n' + recent.map(function(h) { return (h.role === 'user' ? 'User' : 'Copilot') + ': ' + (h.content || '').slice(0, 150); }).join('\n'));
  }
  return parts.join('\n\n');
}

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════
function grabDOM() {
  messagesEl = document.getElementById('messages'); inputEl = document.getElementById('userInput');
  sendBtn = document.getElementById('sendBtn'); typingEl = document.getElementById('typing');
  statusDot = document.getElementById('statusDot'); statusText = document.getElementById('statusText');
  micBtn = document.getElementById('micBtn'); ttsBtn = document.getElementById('ttsBtn');
  sidebar = document.getElementById('sidebar'); miniSidebar = document.getElementById('miniSidebar');
  overlay = document.getElementById('overlay'); savedChatsList = document.getElementById('savedChatsList');
  chatSearch = document.getElementById('chatSearch'); profileName = document.getElementById('profileName');
  profileAvatar = document.getElementById('profileAvatar'); personalitySelect = document.getElementById('personalitySelect');
  confettiCanvas = document.getElementById('confettiCanvas'); fileInput = document.getElementById('fileInput');
  filePreview = document.getElementById('filePreview'); attachBtn = document.getElementById('attachBtn');
}

function init() {
  grabDOM();

  try { savedChats = JSON.parse(localStorage.getItem('chrxmaticc_chats') || '{}'); } catch(e) { savedChats = {}; }
  try { userProfile = JSON.parse(localStorage.getItem('chrxmaticc_profile') || '{}'); } catch(e) { userProfile = {}; }
  selectedAvatar = localStorage.getItem('chrxmaticc_avatar') || 'icon.png';
  customBackground = localStorage.getItem('chrxmaticc_background') || '';
  currentTheme = localStorage.getItem('chrxmaticc_theme') || 'gold';
  sidebarFolded = localStorage.getItem('chrxmaticc_sidebar_folded') === 'true';
  currentPersonality = localStorage.getItem('chrxmaticc_personality') || 'conversational';
  surpriseMode = localStorage.getItem('chrxmaticc_surprise') === 'true';
  ttsEnabled = localStorage.getItem('chrxmaticc_tts') !== 'false';
  typingSpeed = parseInt(localStorage.getItem('chrxmaticc_typing_speed') || '10');

  var params = new URLSearchParams(window.location.search);
  var userParam = params.get('user');
  if (userParam) { try { localStorage.setItem('chrxmaticc_user', JSON.stringify(JSON.parse(decodeURIComponent(userParam)))); window.history.replaceState({}, document.title, '/app.html'); } catch(e) {} }

  loadMemory();
  applyTheme(currentTheme); applyBackground(); updateAllAvatars(); updateSidebarProfile(); loadSavedChats();
  if (sidebarFolded) applyFoldState();
  if (personalitySelect) personalitySelect.value = currentPersonality;
  var speedSelect = document.getElementById('typingSpeedSelect');
  if (speedSelect) speedSelect.value = typingSpeed;
  updateTTSIcon();

  if (inputEl) {
    inputEl.addEventListener('input', function() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });
    inputEl.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); toggleChatSearch(); } });
  }

  setupSpeech();
  document.addEventListener('click', function(e) { if (e.target.closest('.mini-chat-avatar')) loadChat(e.target.closest('.mini-chat-avatar').dataset.chatId); });

  setTimeout(function() { var loader = document.getElementById('loadingScreen'); if (loader) { loader.classList.add('hidden'); setTimeout(function() { if (loader.parentNode) loader.remove(); }, 500); } }, 2200);

  document.querySelectorAll('.app-theme-dot').forEach(function(dot) { dot.addEventListener('click', function() { applyTheme(this.getAttribute('data-theme')); toast('Theme: ' + this.getAttribute('data-theme')); }); });

  var logo = document.querySelector('.topbar-logo-sm');
  if (logo) logo.addEventListener('click', function(e) { e.stopPropagation(); sneakLevel++; if (sneakLevel === 7) { sneakLevel = 0; launchConfetti(); toast('The chrome demon awakens...'); } });

  if (surpriseMode && Math.random() > 0.5) { setTimeout(function() { var greetings = ['Yo!', 'Hey!', 'Welcome back!', 'Sup!', 'Ready to build?']; var firstBubble = document.querySelector('.bubble-row.ai .bubble'); if (firstBubble) firstBubble.innerHTML = '<strong>' + greetings[Math.floor(Math.random()*greetings.length)] + '</strong><br><br>I\'m Chrxmaticc Copilot. Offbrand. Hyper-intelligent. No subscription.'; }, 2400); }

  // Show token toast if coming from login
  var newToken = sessionStorage.getItem('chrxmaticc_new_token');
  if (newToken) {
    sessionStorage.removeItem('chrxmaticc_new_token');
    setTimeout(function() { showTokenToast(newToken); }, 1200);
  }
}

// ═══════════════════════════════════════════
//  THEME SYSTEM
// ═══════════════════════════════════════════
function applyTheme(t) { currentTheme = t; document.body.setAttribute('data-theme', t); localStorage.setItem('chrxmaticc_theme', t); document.querySelectorAll('.app-theme-dot').forEach(function(d) { d.classList.toggle('active', d.getAttribute('data-theme') === t); }); var colors = { gold: '#0b0b0a', midnight: '#0a0a0a', glass: '#0a0a0f', chrome: '#1a1a1a', white: '#f5f5f7' }; var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = colors[t] || '#0b0b0a'; }
function applyBackground() { if (!customBackground) { document.body.style.background = ''; return; } if (customBackground.indexOf('gradient:') === 0) { var parts = customBackground.replace('gradient:','').split(','); document.body.style.background = 'linear-gradient(135deg, #'+parts[0]+', #'+parts[1]+')'; } else { document.body.style.backgroundImage = 'url('+customBackground+')'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; } }
function changePersonality(p) { currentPersonality = p; localStorage.setItem('chrxmaticc_personality', p); }

// ═══════════════════════════════════════════
//  TYPING SPEED
// ═══════════════════════════════════════════
function changeTypingSpeed(speed) { typingSpeed = parseInt(speed); localStorage.setItem('chrxmaticc_typing_speed', speed); var labels = { '0': 'Instant', '10': '1x', '20': '2x', '30': '3x', '40': '4x', '50': '5x' }; toast('Typing: ' + (labels[speed] || speed)); }

// ═══════════════════════════════════════════
//  AVATARS & PROFILE
// ═══════════════════════════════════════════
function setAvatar(a) { selectedAvatar = a; localStorage.setItem('chrxmaticc_avatar', a); updateAllAvatars(); }
function updateAllAvatars() { ['sidebarAvatar','profileAvatar'].forEach(function(id) { var el = document.getElementById(id); if (!el) return; if (selectedAvatar === 'icon.png' || selectedAvatar.indexOf('.png')!==-1 || selectedAvatar.indexOf('.jpg')!==-1 || selectedAvatar.indexOf('http')===0) { el.innerHTML = '<img src="'+selectedAvatar+'" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Avatar">'; } else { el.textContent = selectedAvatar; } }); updateMiniAvatars(); }
function updateSidebarProfile() { var user = null; try { user = JSON.parse(localStorage.getItem('chrxmaticc_user')); } catch(e) {} if (profileName) profileName.textContent = (user&&user.displayName)||userProfile.displayName||'Guest'; if (profileAvatar) { if (user&&user.avatar) profileAvatar.innerHTML = '<img src="'+user.avatar+'" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Avatar">'; else profileAvatar.innerHTML = '<img src="icon.png" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Avatar">'; } }
function updateTTSIcon() { var icon = document.getElementById('ttsIcon'); if (icon) icon.src = ttsEnabled ? 'speaker.svg' : 'speaker-cross.svg'; }
function updateMicIcon() { var icon = document.getElementById('micIcon'); if (icon) icon.src = isListening ? 'speaker.svg' : 'upload.svg'; }

// ═══════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════
function foldSidebar() { sidebarFolded = true; localStorage.setItem('chrxmaticc_sidebar_folded','true'); applyFoldState(); }
function unfoldSidebar() { sidebarFolded = false; localStorage.setItem('chrxmaticc_sidebar_folded','false'); applyFoldState(); }
function applyFoldState() { if (sidebarFolded) { if (sidebar) { sidebar.classList.remove('open'); sidebar.style.display = 'none'; } if (miniSidebar) miniSidebar.classList.add('visible'); updateMiniAvatars(); } else { if (sidebar) sidebar.style.display = ''; if (miniSidebar) miniSidebar.classList.remove('visible'); } }
function updateMiniAvatars() { var c = document.getElementById('miniAvatars'); if (!c) return; c.innerHTML = ''; Object.keys(savedChats).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}).slice(0,5).forEach(function(id) { var d = document.createElement('div'); d.className='mini-chat-avatar'; d.dataset.chatId=id; d.innerHTML = '<img src="icon.png" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Chat">'; c.appendChild(d); }); }
function toggleSidebar() { if (sidebarFolded) { unfoldSidebar(); return; } if (sidebar) sidebar.classList.toggle('open'); if (overlay) overlay.classList.toggle('visible'); }
function loadSavedChats() { if (!savedChatsList) return; savedChatsList.innerHTML = ''; var m = document.createElement('div'); m.className='chat-item'+(currentChatId==='main'?' active':''); m.dataset.chatId='main'; m.onclick=function(){loadChat('main');}; m.innerHTML='<div class="chat-item-avatar"><img src="icon.png" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Chat"></div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">'+(savedChats['main']?.preview||'Yo!')+'</div></div><div class="chat-item-time">'+(savedChats['main']?new Date(savedChats['main'].timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Now')+'</div>'; savedChatsList.appendChild(m); Object.keys(savedChats).filter(function(id){return id!=='main';}).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}).forEach(function(id) { var c=savedChats[id]; var d=document.createElement('div'); d.className='chat-item'; d.dataset.chatId=id; d.onclick=function(){loadChat(id);}; d.innerHTML='<div class="chat-item-avatar"><img src="icon.png" style="width:100%;height:100%;object-fit:contain;border-radius:50%;" alt="Chat"></div><div class="chat-item-info"><div class="chat-item-name">Chat '+new Date(c.timestamp).toLocaleDateString()+'</div><div class="chat-item-preview">'+(c.preview||'Empty')+'</div></div><div class="chat-item-time">'+new Date(c.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>'; savedChatsList.appendChild(d); }); updateMiniAvatars(); }
function loadChat(id) { if(id===currentChatId&&conversation.length>0){toggleSidebar();return;} saveCurrentChat(); currentChatId=id; conversation=[]; if(messagesEl)messagesEl.innerHTML=''; if(savedChats[id]?.conversation){conversation=savedChats[id].conversation;conversation.forEach(function(m){addBubbleNoSave(m.content,m.role==='user'?'user':'ai');});} if(messagesEl&&typingEl)messagesEl.appendChild(typingEl); loadSavedChats(); if(!sidebarFolded)toggleSidebar(); }
function newChat() { saveCurrentChat(); currentChatId='chat_'+Date.now(); conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} loadSavedChats(); if(sidebarFolded)unfoldSidebar(); if(inputEl)inputEl.focus(); }
function deleteChat() { if(currentChatId==='main')return; delete savedChats[currentChatId]; localStorage.setItem('chrxmaticc_chats',JSON.stringify(savedChats)); currentChatId='main'; conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} loadChat('main'); }
function filterChats() { var q=(chatSearch?.value||'').toLowerCase(); document.querySelectorAll('#savedChatsList .chat-item').forEach(function(el){el.style.display=el.textContent.toLowerCase().indexOf(q)!==-1?'':'none';}); }
function doubleTapTopbar() { var ids=Object.keys(savedChats).filter(function(id){return id!=='main';}).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}); if(ids.length>0){lastChatId=currentChatId;loadChat(ids[0]);} else if(lastChatId){loadChat(lastChatId);} }

// ═══════════════════════════════════════════
//  CHAT SEARCH
// ═══════════════════════════════════════════
function toggleChatSearch() { var container = document.getElementById('chatSearchContainer'); var bar = document.getElementById('chatSearchBar'); if (!container || !bar) return; chatSearchOpen = !chatSearchOpen; container.classList.toggle('visible', chatSearchOpen); if (chatSearchOpen) { bar.focus(); } else { bar.value = ''; clearHighlights(); } }
function searchChat() { var query = (document.getElementById('chatSearchBar')?.value||'').toLowerCase(); clearHighlights(); if (!query || query.length < 2) return; var count = 0; document.querySelectorAll('.bubble-row .bubble').forEach(function(b) { var text = b.textContent.toLowerCase(); if (text.indexOf(query) !== -1) { b.innerHTML = highlightText(b.textContent, query); b.closest('.bubble-row').scrollIntoView({ behavior: 'smooth', block: 'center' }); count++; } }); if (count === 0) toast('No matches'); }
function highlightText(text, query) { var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); return text.replace(regex, '<mark style="background:rgba(255,200,50,0.3);border-radius:2px;padding:0 2px;">$1</mark>'); }
function clearHighlights() { document.querySelectorAll('.bubble-row .bubble').forEach(function(b) { b.innerHTML = b.textContent; }); }

// ═══════════════════════════════════════════
//  SPEECH
// ═══════════════════════════════════════════
function setupSpeech() { var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { if (micBtn) micBtn.style.display = 'none'; return; } recognition = new SR(); recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US'; recognition.onresult = function(e) { if (inputEl) { inputEl.value = e.results[0][0].transcript; sendMessage(); } }; recognition.onerror = function(e) { stopMicUI(); if (e.error === 'not-allowed') toast('Mic denied'); }; recognition.onend = function() { stopMicUI(); }; }
function toggleMic() { if (!recognition) { toast('Not supported'); return; } if (isListening) { recognition.stop(); stopMicUI(); } else { try { recognition.start(); startMicUI(); } catch(e) { toast('Mic error'); } } }
function startMicUI() { isListening = true; updateMicIcon(); }
function stopMicUI() { isListening = false; updateMicIcon(); }

// ═══════════════════════════════════════════
//  TTS
// ═══════════════════════════════════════════
function toggleTTS() { ttsEnabled = !ttsEnabled; localStorage.setItem('chrxmaticc_tts', ttsEnabled); updateTTSIcon(); if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, '').slice(0, 300)); u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0; window.speechSynthesis.speak(u); }

// ═══════════════════════════════════════════
//  FILE HANDLING
// ═══════════════════════════════════════════
function triggerFileUpload() { if (fileInput) fileInput.click(); }
function handleFileUpload(e) { var file = e.target.files[0]; if (!file) return; pendingFile = file; if (filePreview) { if (file.type.startsWith('image/')) { document.getElementById('filePreviewImg').src = URL.createObjectURL(file); document.getElementById('filePreviewImg').style.display = 'block'; document.getElementById('filePreviewInfo').textContent = file.name + ' (' + (file.size/1024).toFixed(1) + 'KB)'; } else { document.getElementById('filePreviewImg').style.display = 'none'; document.getElementById('filePreviewInfo').textContent = file.name + ' (' + (file.size/1024).toFixed(1) + 'KB)'; } filePreview.classList.add('visible'); } }
function clearFile() { pendingFile = null; if (filePreview) filePreview.classList.remove('visible'); if (fileInput) fileInput.value = ''; var img = document.getElementById('filePreviewImg'); if (img) { img.src = ''; img.style.display = 'none'; } }
function readFileContent(file) { return new Promise(function(resolve) { if (!file) { resolve(null); return; } if (file.type.startsWith('image/')) { resolve('[Image: '+file.name+']'); return; } var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = function() { resolve('[Error: '+file.name+']'); }; if (file.type.startsWith('text/') || file.name.match(/\.(js|json|html|css|md|txt|py|glsl|yml|yaml|xml|svg)$/)) { reader.readAsText(file); } else { resolve('[Binary: '+file.name+']'); } }); }

// ═══════════════════════════════════════════
//  MESSAGING
// ═══════════════════════════════════════════
async function sendMessage() {
  if (!inputEl) return;
  var text = inputEl.value.trim();
  if (!text && !pendingFile) return;
  if (text === '/easter') { triggerEasterEgg(); inputEl.value = ''; return; }
  if (text.toLowerCase().indexOf('/image') === 0) { var p = text.replace('/image','').trim(); if (!p && !pendingFile) { addError('Usage: /image <description>'); return; } if (pendingFile && pendingFile.type.startsWith('image/')) addMediaBubble(URL.createObjectURL(pendingFile), 'image', pendingFile.name); generateImage(p || 'a beautiful image'); inputEl.value = ''; clearFile(); return; }

  var displayText = text || (pendingFile ? pendingFile.name : '');
  addBubble(displayText, 'user');
  if (pendingFile && pendingFile.type.startsWith('image/')) addMediaBubble(URL.createObjectURL(pendingFile), 'image', pendingFile.name);
  conversation.push({ role:'user', content:displayText });
  extractFacts(text); addToHistory('user', displayText);
  inputEl.value = ''; inputEl.style.height = 'auto';
  if (sendBtn) { sendBtn.disabled = true; sendBtn.classList.add('send-flash'); setTimeout(function(){sendBtn.classList.remove('send-flash');},500); }
  if (typingEl) typingEl.classList.add('visible');
  setStatus('thinking'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; messageCount++;

  try {
    var body = { message: text, personality: currentPersonality };
    if (pendingFile) { body.fileName = pendingFile.name; body.fileType = pendingFile.type; if (pendingFile.type.startsWith('image/')) { body.imageUrl = URL.createObjectURL(pendingFile); } else { body.fileContent = await readFileContent(pendingFile); } }
    try { var prof = JSON.parse(localStorage.getItem('chrxmaticc_profile')||'{}'); var parts = []; if (prof.displayName) parts.push('Call me '+prof.displayName); if (prof.personalInfo) parts.push('About me: '+prof.personalInfo); if (parts.length) body.personalInfo = parts.join('. '); } catch(e) {}
    var memCtx = getMemoryContext(); if (memCtx) body.personalInfo = (body.personalInfo || '') + '\n\n' + memCtx;

    var res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var data = await res.json();
    if (typingEl) typingEl.classList.remove('visible');
    if (data.response) { setStatus('online'); lastAIResponse = data.response; typeBubble(data.response, 'ai', data.provider); conversation.push({ role:'assistant', content:data.response }); addToHistory('assistant', data.response); if (ttsEnabled) speakText(data.response); saveCurrentChat(); if (messageCount%10===0 && surpriseMode) randomCompliment(); }
    else { setStatus('online'); addError(data.error || 'Brain hiccup.'); }
  } catch(e) { if (typingEl) typingEl.classList.remove('visible'); setStatus('offline'); addError('Offline.'); }
  if (sendBtn) sendBtn.disabled = false; if (inputEl) inputEl.focus(); clearFile();
}

function quickSend(text) { if (inputEl) { inputEl.value = text; sendMessage(); } }
async function generateImage(prompt) { addHint('Generating: ' + prompt); try { var res = await fetch('/api/image', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: prompt || 'image', width: 512, height: 512 }) }); var data = await res.json(); if (data.success) addMediaBubble(data.url, 'image', prompt); else addError(data.error || 'Failed.'); } catch(e) { addError('Image service offline.'); } }

// ═══════════════════════════════════════════
//  TYPING ANIMATION
// ═══════════════════════════════════════════
function typeBubble(text, who, provider) {
  if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove();
  var row = document.createElement('div'); row.className = 'bubble-row ' + who;
  var b = document.createElement('div'); b.className = 'bubble'; row.appendChild(b);
  var ts = document.createElement('div'); ts.className = 'timestamp'; ts.textContent = getTime(); row.appendChild(ts);
  if (provider && who === 'ai') { var badge = document.createElement('div'); badge.className = 'provider-badge'; badge.textContent = provider; row.appendChild(badge); }
  messagesEl.appendChild(row); if (typingEl) messagesEl.appendChild(typingEl);
  var formatted = formatCodeBlocks(text);
  var tempDiv = document.createElement('div'); tempDiv.innerHTML = formatted;
  var plainText = tempDiv.textContent;
  if (typingSpeed === 0) { b.innerHTML = formatted; messagesEl.scrollTop = messagesEl.scrollHeight; return; }
  var i = 0; b.innerHTML = '';
  function typeChar() { if (i < plainText.length) { b.textContent = plainText.slice(0, i + 1); b.innerHTML += '<span class="typing-cursor">|</span>'; i++; messagesEl.scrollTop = messagesEl.scrollHeight; var delay = (8 + Math.random() * 12) / (typingSpeed / 10); setTimeout(typeChar, delay); } else { b.innerHTML = formatted; } }
  typeChar();
}

function getTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function setStatus(s) { if (!statusDot||!statusText) return; statusDot.className='status-dot'; if (s==='thinking'){statusDot.classList.add('thinking');statusText.textContent='Thinking...';} else if(s==='offline'){statusDot.classList.add('offline');statusText.textContent='Offline';} else {statusText.textContent='Online';} }
function addBubble(text, who) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var row = document.createElement('div'); row.className='bubble-row '+who; var b = document.createElement('div'); b.className='bubble'; b.innerHTML = formatCodeBlocks(text); row.appendChild(b); var ts = document.createElement('div'); ts.className='timestamp'; ts.textContent=getTime(); row.appendChild(ts); messagesEl.appendChild(row); if (typingEl) messagesEl.appendChild(typingEl); messagesEl.scrollTop = messagesEl.scrollHeight; }
function addBubbleNoSave(text, who) { if (!messagesEl) return; var row = document.createElement('div'); row.className='bubble-row '+who; var b = document.createElement('div'); b.className='bubble'; b.innerHTML = formatCodeBlocks(text); row.appendChild(b); messagesEl.appendChild(row); }
function addError(msg) { if(!messagesEl)return; if(typingEl?.parentNode)typingEl.remove(); var el=document.createElement('div');el.style.cssText='align-self:center;background:rgba(255,69,58,0.1);color:#ff453a;border-radius:12px;padding:8px 14px;font-size:12px;';el.textContent=msg;messagesEl.appendChild(el);if(typingEl)messagesEl.appendChild(typingEl); }
function addHint(msg) { if(!messagesEl)return; if(typingEl?.parentNode)typingEl.remove(); var el=document.createElement('div');el.style.cssText='align-self:center;color:var(--muted);font-size:11px;padding:4px 12px;';el.textContent=msg;messagesEl.appendChild(el);if(typingEl)messagesEl.appendChild(typingEl); }
function addMediaBubble(url, type, caption) { if(!messagesEl)return; if(typingEl?.parentNode)typingEl.remove(); var row=document.createElement('div');row.className='bubble-row ai'; var b=document.createElement('div');b.className='bubble';b.style.cssText='padding:6px!important;background:transparent!important;max-width:260px;'; var img=document.createElement('img');img.src=url;img.alt=caption;img.loading='lazy';img.style.cssText='width:100%;border-radius:10px;cursor:pointer;';img.onclick=function(){window.open(url,'_blank');}; b.appendChild(img); var actions=document.createElement('div');actions.style.cssText='display:flex;gap:4px;margin-top:4px;'; actions.innerHTML='<button onclick="navigator.clipboard.writeText(\''+url+'\');toast(\'Copied\')" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:10px;cursor:pointer;font-family:inherit;">Copy</button><button onclick="window.open(\''+url+'\',\'_blank\')" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);font-size:10px;cursor:pointer;font-family:inherit;">Open</button>'; b.appendChild(actions); row.appendChild(b); var ts=document.createElement('div');ts.className='timestamp';ts.textContent=getTime();row.appendChild(ts); messagesEl.appendChild(row);if(typingEl)messagesEl.appendChild(typingEl);messagesEl.scrollTop=messagesEl.scrollHeight; }

// ═══════════════════════════════════════════
//  CODE FORMATTING
// ═══════════════════════════════════════════
function formatCodeBlocks(text) { return text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,lang,code) { return '<div class="code-block"><div class="code-header"><span>'+(lang||'code')+'</span><button class="code-copy" onclick="copyCode(this)">Copy</button></div><pre><code>'+escapeHtml(code.trim())+'</code></pre></div>'; }).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>'); }
function escapeHtml(text) { return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function copyCode(btn) { var code = btn.closest('.code-block').querySelector('code').textContent; navigator.clipboard.writeText(code).then(function() { btn.textContent='Copied!'; setTimeout(function(){btn.textContent='Copy';},2000); }); }

// ═══════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════
function saveCurrentChat() { if(!conversation.length)return; savedChats[currentChatId]={conversation:conversation.slice(-50),preview:conversation[conversation.length-1]?.content?.slice(0,50)||'',timestamp:Date.now()}; localStorage.setItem('chrxmaticc_chats',JSON.stringify(savedChats)); loadSavedChats(); }
function exportChat() { var t=conversation.map(function(m){return m.role+': '+m.content;}).join('\n\n'); var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));a.download='chrxmaticc-chat.txt';a.click(); }
function clearChat() { conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} }

// ═══════════════════════════════════════════
//  SURPRISES & CONFETTI
// ═══════════════════════════════════════════
function triggerEasterEgg() { document.body.style.transform='rotate(0.3deg)';setTimeout(function(){document.body.style.transform='';},500);launchConfetti();toast('Easter egg!'); }
function randomCompliment() { var c=['On fire today','Next level','Big brain energy','Legendary','Chrome demon approves']; addHint(c[Math.floor(Math.random()*c.length)]); }
function launchConfetti() { if(confettiActive)return;confettiActive=true; var ctx=confettiCanvas?.getContext('2d');if(!ctx){confettiActive=false;return;} confettiCanvas.width=window.innerWidth;confettiCanvas.height=window.innerHeight;confettiCanvas.style.display='block'; var particles=[]; for(var i=0;i<50;i++){particles.push({x:Math.random()*confettiCanvas.width,y:-20,vx:(Math.random()-.5)*6,vy:Math.random()*4+2,size:Math.random()*5+2,color:'hsl('+Math.random()*360+',70%,60%)',rot:Math.random()*360});} function anim(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);var alive=false;particles.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.rot+=2;if(p.y<confettiCanvas.height+20){alive=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}});if(alive)requestAnimationFrame(anim);else{confettiCanvas.style.display='none';confettiActive=false;}} anim(); }

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════
function toast(msg) { var t = document.createElement('div'); t.className = 'app-toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function() { if(t.parentNode) t.remove(); }, 2500); }

// ═══════════════════════════════════════════
//  TOKEN TOAST
// ═══════════════════════════════════════════
function showTokenToast(token) {
  var toastEl = document.createElement('div');
  toastEl.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:9999;background:var(--card-bg);border:1px solid var(--accent);border-radius:16px;padding:16px 20px;max-width:380px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:slideUp 0.3s ease;';
  toastEl.innerHTML = '<div style="color:var(--accent);font-weight:700;margin-bottom:6px;">Your New Token</div>' +
    '<div style="background:rgba(212,165,116,0.08);border:1px solid rgba(212,165,116,0.2);border-radius:8px;padding:8px;font-family:monospace;font-size:11px;word-break:break-all;color:var(--text);margin-bottom:10px;">' + token + '</div>' +
    '<div style="color:#ff9f0a;font-size:10px;margin-bottom:8px;">Save this. It rotates every login.</div>' +
    '<button onclick="this.parentElement.remove()" style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:6px 16px;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">Close</button>';
  document.body.appendChild(toastEl);
  setTimeout(function() { if (toastEl.parentElement) toastEl.remove(); }, 30000);
}

// Add slideUp animation
var animStyle = document.createElement('style');
animStyle.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
document.head.appendChild(animStyle);

// ═══════════════════════════════════════════
//  SETTINGS SHARED
// ═══════════════════════════════════════════
function saveProfile() { userProfile.username = document.getElementById('settingsUsername')?.value || ''; userProfile.displayName = document.getElementById('settingsDisplayName')?.value || ''; userProfile.bio = document.getElementById('settingsBio')?.value || ''; userProfile.personalInfo = document.getElementById('settingsPersonalInfo')?.value || ''; localStorage.setItem('chrxmaticc_profile', JSON.stringify(userProfile)); updateSidebarProfile(); }
function promptBackground() { var url=prompt('Paste image URL:'); if(url){customBackground=url;localStorage.setItem('chrxmaticc_background',url);applyBackground();} }
function setBackgroundGradient(c1,c2) { customBackground='gradient:'+c1+','+c2; localStorage.setItem('chrxmaticc_background',customBackground); applyBackground(); }
function removeBackground() { customBackground=''; localStorage.removeItem('chrxmaticc_background'); document.body.style.background=''; }
function toggleSurpriseMode() { surpriseMode=!surpriseMode; localStorage.setItem('chrxmaticc_surprise',surpriseMode); var el=document.getElementById('surpriseStatus'); if(el)el.textContent=surpriseMode?'ON':'OFF'; }
function clearAllData() { if(confirm('Clear all local data?')){localStorage.clear();location.reload();} }

init();
