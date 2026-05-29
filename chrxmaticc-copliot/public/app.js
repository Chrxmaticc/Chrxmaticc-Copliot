// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Web Dashboard     ║
// ║  Image + GIF (FFmpeg) + Files + Voice   ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

var messagesEl, inputEl, sendBtn, typingEl, statusDot, statusText, micBtn, micStatus, ttsBtn;
var sidebar, miniSidebar, overlay, savedChatsList, chatSearch, profileName, profileAvatar;
var chatActionModal, personalitySelect, confettiCanvas, fileInput, filePreview, attachBtn;
var conversation = [], savedChats = {}, currentChatId = 'main';
var isListening = false, ttsEnabled = true, lastAIResponse = '', recognition = null;
var selectedAvatar = '🧠', customBackground = '', currentTheme = 'midnight';
var sidebarFolded = false, currentPersonality = 'conversational';
var messageCount = 0, lastChatId = null, confettiActive = false;
var pendingFile = null;

function grabDOM() {
  messagesEl = document.getElementById('messages'); inputEl = document.getElementById('userInput');
  sendBtn = document.getElementById('sendBtn'); typingEl = document.getElementById('typing');
  statusDot = document.getElementById('statusDot'); statusText = document.getElementById('statusText');
  micBtn = document.getElementById('micBtn'); micStatus = document.getElementById('micStatus');
  ttsBtn = document.getElementById('ttsBtn'); sidebar = document.getElementById('sidebar');
  miniSidebar = document.getElementById('miniSidebar'); overlay = document.getElementById('overlay');
  savedChatsList = document.getElementById('savedChatsList'); chatSearch = document.getElementById('chatSearch');
  profileName = document.getElementById('profileName'); profileAvatar = document.getElementById('profileAvatar');
  chatActionModal = document.getElementById('chatActionModal'); personalitySelect = document.getElementById('personalitySelect');
  confettiCanvas = document.getElementById('confettiCanvas'); fileInput = document.getElementById('fileInput');
  filePreview = document.getElementById('filePreview'); attachBtn = document.getElementById('attachBtn');
}

function init() {
  grabDOM();
  try { savedChats = JSON.parse(localStorage.getItem('chrxmaticc_chats') || '{}'); } catch(e) { savedChats = {}; }
  selectedAvatar = localStorage.getItem('chrxmaticc_avatar') || '🧠';
  customBackground = localStorage.getItem('chrxmaticc_background') || '';
  currentTheme = localStorage.getItem('chrxmaticc_theme') || 'midnight';
  sidebarFolded = localStorage.getItem('chrxmaticc_sidebar_folded') === 'true';
  currentPersonality = localStorage.getItem('chrxmaticc_personality') || 'conversational';
  changeTheme(currentTheme); applyBackground(); updateAllAvatars(); updateSidebarProfile(); loadSavedChats();
  if (sidebarFolded) applyFoldState(); if (personalitySelect) personalitySelect.value = currentPersonality;
  if (inputEl) { inputEl.addEventListener('input', function() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; }); inputEl.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }); }
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) { var SR = window.SpeechRecognition || window.webkitSpeechRecognition; recognition = new SR(); recognition.continuous = false; recognition.interimResults = false; recognition.onresult = function(e) { if (inputEl) { inputEl.value = e.results[0][0].transcript; sendMessage(); } }; recognition.onend = function() { stopMicUI(); }; }
  document.addEventListener('click', function(e) { if (e.target.closest('.mini-chat-avatar')) { loadChat(e.target.closest('.mini-chat-avatar').dataset.chatId); } });
}

function changeTheme(t) { currentTheme = t; document.body.className = 'theme-' + t; localStorage.setItem('chrxmaticc_theme', t); }
function applyBackground() { if (customBackground) { document.body.style.backgroundImage = 'url(' + customBackground + ')'; document.body.style.backgroundSize = 'cover'; } else { document.body.style.backgroundImage = ''; } }
function setAvatar(e) { selectedAvatar = e; localStorage.setItem('chrxmaticc_avatar', e); updateAllAvatars(); }
function updateAllAvatars() { ['sidebarAvatar','topbarAvatar','profileAvatar'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = selectedAvatar; }); }
function changePersonality(p) { currentPersonality = p; localStorage.setItem('chrxmaticc_personality', p); }
function foldSidebar() { sidebarFolded = true; localStorage.setItem('chrxmaticc_sidebar_folded','true'); applyFoldState(); }
function unfoldSidebar() { sidebarFolded = false; localStorage.setItem('chrxmaticc_sidebar_folded','false'); applyFoldState(); }
function applyFoldState() { if (sidebarFolded) { if (sidebar) { sidebar.classList.remove('open'); sidebar.style.display = 'none'; } if (miniSidebar) miniSidebar.classList.add('visible'); updateMiniAvatars(); } else { if (sidebar) sidebar.style.display = ''; if (miniSidebar) miniSidebar.classList.remove('visible'); } }
function updateMiniAvatars() { var c = document.getElementById('miniAvatars'); if (!c) return; c.innerHTML = ''; Object.keys(savedChats).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}).slice(0,5).forEach(function(id) { var d = document.createElement('div'); d.className='mini-chat-avatar'; d.dataset.chatId=id; d.textContent=selectedAvatar; c.appendChild(d); }); }
function toggleSidebar() { if (sidebarFolded) { unfoldSidebar(); return; } if (sidebar) sidebar.classList.toggle('open'); if (overlay) overlay.classList.toggle('visible'); }
function updateSidebarProfile() { if (profileName) profileName.textContent = localStorage.getItem('chrxmaticc_email') || 'Guest'; if (profileAvatar) profileAvatar.textContent = selectedAvatar; }
function loadSavedChats() { if (!savedChatsList) return; savedChatsList.innerHTML = ''; var m = document.createElement('div'); m.className='chat-item'+(currentChatId==='main'?' active':''); m.dataset.chatId='main'; m.onclick=function(){loadChat('main');}; m.innerHTML='<div class="chat-item-avatar">'+selectedAvatar+'</div><div class="chat-item-info"><div class="chat-item-name">Chrxmaticc Copilot</div><div class="chat-item-preview">'+(savedChats['main']?.preview||'Yo!')+'</div></div><div class="chat-item-time">'+(savedChats['main']?new Date(savedChats['main'].timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Now')+'</div>'; savedChatsList.appendChild(m); Object.keys(savedChats).filter(function(id){return id!=='main';}).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}).forEach(function(id) { var c=savedChats[id]; var d=document.createElement('div'); d.className='chat-item'; d.dataset.chatId=id; d.onclick=function(){loadChat(id);}; d.innerHTML='<div class="chat-item-avatar">'+selectedAvatar+'</div><div class="chat-item-info"><div class="chat-item-name">Chat '+new Date(c.timestamp).toLocaleDateString()+'</div><div class="chat-item-preview">'+(c.preview||'Empty')+'</div></div><div class="chat-item-time">'+new Date(c.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div><button class="chat-item-actions-btn" onclick="event.stopPropagation();selectChat(\''+id+'\');showChatActions();">⋯</button>'; savedChatsList.appendChild(d); }); updateMiniAvatars(); }
function selectChat(id) { currentChatId = id; }
function loadChat(id) { if (id===currentChatId && conversation.length>0) { toggleSidebar(); return; } saveCurrentChat(); currentChatId=id; conversation=[]; if(messagesEl) messagesEl.innerHTML=''; if(savedChats[id]?.conversation){ conversation=savedChats[id].conversation; conversation.forEach(function(m){ addBubbleNoSave(m.content, m.role==='user'?'user':'ai'); }); } if(messagesEl&&typingEl) messagesEl.appendChild(typingEl); loadSavedChats(); if(!sidebarFolded) toggleSidebar(); }
function newChat() { saveCurrentChat(); currentChatId='chat_'+Date.now(); conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} loadSavedChats(); if(sidebarFolded) unfoldSidebar(); if(inputEl) inputEl.focus(); }
function deleteChat() { if(currentChatId==='main'){hideChatActions();return;} delete savedChats[currentChatId]; localStorage.setItem('chrxmaticc_chats',JSON.stringify(savedChats)); currentChatId='main'; conversation=[]; if(messagesEl){messagesEl.innerHTML='';messagesEl.appendChild(typingEl);} loadChat('main'); hideChatActions(); }
function filterChats() { var q=(chatSearch?.value||'').toLowerCase(); document.querySelectorAll('#savedChatsList .chat-item').forEach(function(el){el.style.display=el.textContent.toLowerCase().indexOf(q)!==-1?'':'none';}); }
function doubleTapTopbar() { var ids=Object.keys(savedChats).filter(function(id){return id!=='main';}).sort(function(a,b){return (savedChats[b].timestamp||0)-(savedChats[a].timestamp||0);}); if(ids.length>0){lastChatId=currentChatId;loadChat(ids[0]);} else if(lastChatId){loadChat(lastChatId);} }
function showChatActions() { if(chatActionModal) chatActionModal.classList.add('visible'); if(overlay) overlay.classList.add('visible'); }
function hideChatActions() { if(chatActionModal) chatActionModal.classList.remove('visible'); if(overlay) overlay.classList.remove('visible'); }

function triggerFileUpload() { if (fileInput) fileInput.click(); }
function handleFileUpload(e) { var file = e.target.files[0]; if (!file) return; pendingFile = file; if (filePreview) { if (file.type.startsWith('image/')) { filePreview.innerHTML = '<img src="'+URL.createObjectURL(file)+'" class="preview-img"><div class="preview-info">'+file.name+'</div><button onclick="clearFile()">✕</button>'; filePreview.classList.add('visible'); } else if (file.type.startsWith('video/')) { filePreview.innerHTML = '<video src="'+URL.createObjectURL(file)+'" class="preview-vid" muted></video><div class="preview-info">'+file.name+'</div><button onclick="clearFile()">✕</button>'; filePreview.classList.add('visible'); } else { filePreview.innerHTML = '<div class="preview-file">📎 '+file.name+' ('+(file.size/1024).toFixed(1)+'KB)</div><button onclick="clearFile()">✕</button>'; filePreview.classList.add('visible'); } } }
function clearFile() { pendingFile = null; if (filePreview) { filePreview.innerHTML = ''; filePreview.classList.remove('visible'); } if (fileInput) fileInput.value = ''; }
function readFileContent(file) { return new Promise(function(resolve) { if (!file) { resolve(null); return; } if (file.type.startsWith('image/') || file.type.startsWith('video/')) { resolve('[Media file: ' + file.name + ' (' + file.type + ', ' + (file.size/1024).toFixed(1) + 'KB)]'); return; } var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = function() { resolve('[Could not read file: ' + file.name + ']'); }; if (file.type.startsWith('text/') || file.name.match(/\.(js|json|html|css|md|txt|py|glsl|yml|yaml|xml|svg)$/)) { reader.readAsText(file); } else { resolve('[Binary file: ' + file.name + ' (' + file.type + ', ' + (file.size/1024).toFixed(1) + 'KB)]'); } }); }

async function sendMessage() {
  if (!inputEl) return; var text = inputEl.value.trim();
  if (!text && !pendingFile) return;
  if (text.toLowerCase() === '/easter') { triggerEasterEgg(); inputEl.value = ''; return; }
  if (text.toLowerCase().indexOf('/image') === 0) { var p = text.replace('/image','').trim(); if (!p && !pendingFile) { addError('Usage: /image <description>'); return; } if (pendingFile) addMediaBubble(URL.createObjectURL(pendingFile), pendingFile.type.startsWith('video/')?'video':'image', pendingFile.name); generateImage(p || 'a beautiful image'); inputEl.value = ''; clearFile(); return; }
  if (text.toLowerCase().indexOf('/video') === 0) { var p = text.replace('/video','').trim(); if (!p && !pendingFile) { addError('Usage: /video <description>'); return; } if (pendingFile) addMediaBubble(URL.createObjectURL(pendingFile), pendingFile.type.startsWith('video/')?'video':'image', pendingFile.name); generateVideo(p || 'a beautiful animation'); inputEl.value = ''; clearFile(); return; }

  var displayText = text || (pendingFile ? '📎 ' + pendingFile.name : '');
  addBubble(displayText, 'user');
  if (pendingFile) { if (pendingFile.type.startsWith('image/')) addMediaBubble(URL.createObjectURL(pendingFile), 'image', pendingFile.name); else if (pendingFile.type.startsWith('video/')) addMediaBubble(URL.createObjectURL(pendingFile), 'video', pendingFile.name); }
  conversation.push({ role:'user', content:displayText }); inputEl.value = ''; inputEl.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true; if (typingEl) typingEl.classList.add('visible'); setStatus('thinking'); if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight; messageCount++;

  try {
    var body = { message: text, personality: currentPersonality };
    if (pendingFile) { body.fileName = pendingFile.name; body.fileType = pendingFile.type; body.fileContent = await readFileContent(pendingFile); }
    try { var prof = JSON.parse(localStorage.getItem('chrxmaticc_profile')||'{}'); var parts = []; if (prof.displayName) parts.push('Call me '+prof.displayName); if (prof.personalInfo) parts.push('About me: '+prof.personalInfo); if (parts.length) body.personalInfo = parts.join('. '); } catch(e) {}
    var res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var data = await res.json(); if (typingEl) typingEl.classList.remove('visible');
    if (data.response) { setStatus('online'); lastAIResponse = data.response; addBubble(data.response, 'ai', data.provider); conversation.push({ role:'assistant', content:data.response }); if (ttsEnabled) speakText(data.response); saveCurrentChat(); if (messageCount%10===0) randomCompliment(); }
    else { setStatus('online'); addError(data.error || 'Brain hiccup.'); }
  } catch(e) { if (typingEl) typingEl.classList.remove('visible'); setStatus('offline'); addError('Offline.'); }
  if (sendBtn) sendBtn.disabled = false; if (inputEl) inputEl.focus(); clearFile();
}
function quickSend(text) { if (inputEl) { inputEl.value = text; sendMessage(); } }

async function generateImage(prompt) {
  addHint('🎨 Copilot Artist 1.0: "' + (prompt || 'image') + '"');
  try {
    var res = await fetch('/api/image', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: prompt || 'a beautiful image', width: 512, height: 512 }) });
    var data = await res.json();
    if (data.success) { addMediaBubble(data.url, 'image', prompt); }
    else { addError(data.error || 'Generation failed.'); }
  } catch(e) { addError('Image service offline.'); }
}

async function generateVideo(prompt) {
  addHint('🎬 Copilot Generator 1.0: "' + (prompt || 'GIF') + '" (FFmpeg)');
  if (sendBtn) sendBtn.disabled = true;
  try {
    var res = await fetch('/api/video', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: prompt || 'a beautiful animation', frames: 4 }) });
    var data = await res.json();
    if (data.success && data.gif) {
      addMediaBubble(data.gif, 'image', prompt + ' (GIF)');
      addHint('✅ GIF generated with FFmpeg! ' + (data.frames || 4) + ' frames.');
    } else {
      addError(data.error || 'GIF generation failed.');
    }
  } catch(e) { addError('GIF service offline.'); }
  if (sendBtn) sendBtn.disabled = false;
}

function addMediaBubble(url, type, caption) {
  if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove();
  var row = document.createElement('div'); row.className = 'bubble-row ai';
  var bubble = document.createElement('div'); bubble.className = 'bubble media-bubble';
  if (type === 'image') { var img = document.createElement('img'); img.src = url; img.alt = caption; img.loading = 'lazy'; img.onclick = function() { window.open(url, '_blank'); }; bubble.appendChild(img); }
  else if (type === 'video') { var vid = document.createElement('video'); vid.src = url; vid.controls = true; vid.autoplay = true; vid.loop = true; vid.muted = true; bubble.appendChild(vid); }
  var actions = document.createElement('div'); actions.className = 'media-actions';
  actions.innerHTML = '<button onclick="copyToClipboard(\''+url+'\')">📋 Copy</button><button onclick="window.open(\''+url+'\',\'_blank\')">🔗 Open</button>';
  bubble.appendChild(actions); var ts = document.createElement('div'); ts.className = 'timestamp'; ts.textContent = getTime();
  row.appendChild(bubble); row.appendChild(ts); messagesEl.appendChild(row);
  if (typingEl) messagesEl.appendChild(typingEl); messagesEl.scrollTop = messagesEl.scrollHeight;
}
function copyToClipboard(text) { navigator.clipboard.writeText(text).then(function() { addHint('📋 Link copied!'); }); }

function getTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function setStatus(s) { if (!statusDot||!statusText) return; statusDot.className='status-dot'; if (s==='thinking'){statusDot.classList.add('thinking');statusText.textContent='Thinking...';} else if(s==='offline'){statusDot.classList.add('offline');statusText.textContent='Offline';} else {statusText.textContent='Online';} }
function addBubble(text, who, provider) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var row = document.createElement('div'); row.className='bubble-row '+who; var b = document.createElement('div'); b.className='bubble'; b.innerHTML = formatCodeBlocks(text); row.appendChild(b); var ts = document.createElement('div'); ts.className='timestamp'; ts.textContent=getTime(); row.appendChild(ts); if (provider&&who==='ai') { var badge = document.createElement('div'); badge.className='provider-badge'; badge.textContent=provider; row.appendChild(badge); } messagesEl.appendChild(row); if (typingEl) messagesEl.appendChild(typingEl); messagesEl.scrollTop = messagesEl.scrollHeight; }
function addBubbleNoSave(text, who) { if (!messagesEl) return; var row = document.createElement('div'); row.className='bubble-row '+who; var b = document.createElement('div'); b.className='bubble'; b.innerHTML = formatCodeBlocks(text); row.appendChild(b); messagesEl.appendChild(row); }
function addError(msg) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var el = document.createElement('div'); el.className='error-bubble'; el.textContent = msg; messagesEl.appendChild(el); if (typingEl) messagesEl.appendChild(typingEl); }
function addHint(msg) { if (!messagesEl) return; if (typingEl?.parentNode) typingEl.remove(); var el = document.createElement('div'); el.className='command-hint'; el.textContent = msg; messagesEl.appendChild(el); if (typingEl) messagesEl.appendChild(typingEl); }

function formatCodeBlocks(text) { return text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,lang,code) { return '<div class="code-block"><div class="code-header"><span>'+(lang||'code')+'</span><button class="code-copy" onclick="copyCode(this)">📋 Copy</button></div><pre><code>'+escapeHtml(code.trim())+'</code></pre></div>'; }).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>'); }
function escapeHtml(text) { return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function copyCode(btn) { var code = btn.closest('.code-block').querySelector('code').textContent; navigator.clipboard.writeText(code).then(function() { btn.textContent='✅ Copied'; setTimeout(function(){ btn.textContent='📋 Copy'; },2000); }); }

function saveCurrentChat() { if (!conversation.length) return; savedChats[currentChatId] = { conversation: conversation.slice(-50), preview: conversation[conversation.length-1]?.content?.slice(0,50)||'', timestamp: Date.now() }; localStorage.setItem('chrxmaticc_chats', JSON.stringify(savedChats)); loadSavedChats(); }
function exportChat() { var t = conversation.map(function(m){return m.role+': '+m.content;}).join('\n\n'); var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t],{type:'text/plain'})); a.download = 'chrxmaticc-chat.txt'; a.click(); hideChatActions(); }
function clearChat() { conversation = []; if (messagesEl) { messagesEl.innerHTML = ''; messagesEl.appendChild(typingEl); } hideChatActions(); }

function toggleMic() { if (!recognition) return; if (isListening) { recognition.stop(); stopMicUI(); } else { recognition.start(); startMicUI(); } }
function startMicUI() { isListening=true; if(micBtn) micBtn.textContent='🔴'; if(micStatus) micStatus.classList.add('visible'); }
function stopMicUI() { isListening=false; if(micBtn) micBtn.textContent='🎤'; if(micStatus) micStatus.classList.remove('visible'); }
function toggleTTS() { ttsEnabled=!ttsEnabled; if(ttsBtn) ttsBtn.textContent=ttsEnabled?'🔊':'🔇'; if(ttsEnabled&&lastAIResponse) speakText(lastAIResponse); }
function speakText(text) { if(!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g,'').slice(0,300)); u.rate=1.0;u.pitch=1.0;u.volume=1.0; window.speechSynthesis.speak(u); }

function triggerEasterEgg() { document.body.style.transform='rotate(0.5deg)'; setTimeout(function(){document.body.style.transform='';},600); launchConfetti(); addHint('🥚 Easter egg found!'); }
function randomCompliment() { var c=['💡 On fire.','🚀 Next level.','🧠 Big brain.','⚡ Legendary.']; addHint(c[Math.floor(Math.random()*c.length)]); }
function launchConfetti() { if(confettiActive) return; confettiActive=true; var ctx=confettiCanvas?.getContext('2d'); if(!ctx){confettiActive=false;return;} confettiCanvas.width=window.innerWidth;confettiCanvas.height=window.innerHeight;confettiCanvas.style.display='block'; var particles=[]; for(var i=0;i<60;i++){ particles.push({x:Math.random()*confettiCanvas.width,y:-20,vx:(Math.random()-.5)*6,vy:Math.random()*4+2,size:Math.random()*6+3,color:'hsl('+Math.random()*360+',80%,60%)',rotation:Math.random()*360}); } function animate(){ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);var alive=false;particles.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.rotation+=2;if(p.y<confettiCanvas.height+20){alive=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}});if(alive) requestAnimationFrame(animate);else{confettiCanvas.style.display='none';confettiActive=false;}} animate(); }

init();
