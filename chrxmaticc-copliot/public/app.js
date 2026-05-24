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
var authModal = document.getElementById('authModal');
var authError = document.getElementById('authError');

var conversation = [];
var isListening = false;
var ttsEnabled = true;
var lastAIResponse = '';
var recognition = null;

// Init
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = function(e) { inputEl.value = e.results[0][0].transcript; sendMessage(); };
  recognition.onend = function() { stopMicUI(); };
}

inputEl.addEventListener('input', function() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
});

inputEl.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setStatus(state) {
  statusDot.className = 'status-dot';
  if (state === 'thinking') { statusDot.classList.add('thinking'); statusText.textContent = 'Thinking...'; }
  else if (state === 'offline') { statusDot.classList.add('offline'); statusText.textContent = 'Offline'; }
  else { statusText.textContent = 'Online'; }
}

function addBubble(text, who, provider) {
  typingEl.remove();
  var row = document.createElement('div');
  row.className = 'bubble-row ' + who;
  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  var ts = document.createElement('div');
  ts.className = 'timestamp';
  ts.textContent = getTime();
  row.appendChild(bubble);
  row.appendChild(ts);
  if (provider && who === 'ai') {
    var badge = document.createElement('div');
    badge.className = 'provider-badge';
    badge.textContent = provider;
    row.appendChild(badge);
  }
  messagesEl.appendChild(row);
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addError(msg) {
  typingEl.remove();
  var el = document.createElement('div');
  el.className = 'error-bubble';
  el.textContent = msg;
  messagesEl.appendChild(el);
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addHint(msg) {
  typingEl.remove();
  var el = document.createElement('div');
  el.className = 'command-hint';
  el.textContent = msg;
  messagesEl.appendChild(el);
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  var text = inputEl.value.trim();
  if (!text) return;

  addBubble(text, 'user');
  conversation.push({ role: 'user', content: text });
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  typingEl.classList.add('visible');
  setStatus('thinking');
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    var data = await res.json();
    typingEl.classList.remove('visible');

    if (data.response) {
      setStatus('online');
      lastAIResponse = data.response;
      addBubble(data.response, 'ai', data.provider);
      conversation.push({ role: 'assistant', content: data.response });
      if (ttsEnabled) speakText(data.response);
    } else {
      setStatus('online');
      addError(data.error || 'Brain hiccup. Try again.');
    }
  } catch (err) {
    typingEl.classList.remove('visible');
    setStatus('offline');
    addError('Copilot is offline. Check your connection.');
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

function toggleMic() {
  if (!recognition) { addHint('Voice input not supported on this browser. Try Chrome.'); return; }
  if (isListening) { recognition.stop(); stopMicUI(); }
  else { recognition.start(); startMicUI(); }
}

function startMicUI() { isListening = true; micBtn.textContent = '🔴'; micStatus.classList.add('visible'); }
function stopMicUI() { isListening = false; micBtn.textContent = '🎤'; micStatus.classList.remove('visible'); }

function toggleTTS() { ttsEnabled = !ttsEnabled; ttsBtn.textContent = ttsEnabled ? '🔊' : '🔇'; if (ttsEnabled && lastAIResponse) speakText(lastAIResponse); }

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text.slice(0, 300));
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

function toggleSidebar() { sidebar.classList.toggle('open'); overlay.classList.toggle('visible'); }

function showAuth() { authModal.classList.add('visible'); overlay.classList.add('visible'); }
function hideAuth() { authModal.classList.remove('visible'); overlay.classList.remove('visible'); }

async function handleAuth(action) {
  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value.trim();
  if (!email || !password) { authError.textContent = 'Fill in both fields.'; return; }
  try {
    var res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, email, password })
    });
    var data = await res.json();
    if (data.token) { localStorage.setItem('chrxmaticc_token', data.token); localStorage.setItem('chrxmaticc_email', data.email); updateAccountUI(data.email); hideAuth(); addHint('Signed in as ' + data.email); }
    else { authError.textContent = data.error || 'Something went wrong.'); }
  } catch (e) { authError.textContent = 'Connection error.'; }
}

function updateAccountUI(email) {
  document.getElementById('accountInfo').innerHTML = '<span>👤 ' + (email || 'Guest Mode') + '</span>';
}

function changeTheme(theme) {
  document.body.className = 'theme-' + theme;
  localStorage.setItem('chrxmaticc_theme', theme);
}

function clearChat() {
  conversation = [];
  messagesEl.innerHTML = '';
  messagesEl.appendChild(typingEl);
  addHint('Chat cleared.');
}

function exportChat() {
  var text = conversation.map(function(m) { return m.role + ': ' + m.content; }).join('\n\n');
  var blob = new Blob([text], { type: 'text/plain' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chrxmaticc-chat.txt'; a.click();
}

// Load saved theme and account
(function() {
  var theme = localStorage.getItem('chrxmaticc_theme') || 'midnight';
  changeTheme(theme);
  document.getElementById('themeSelect').value = theme;
  var email = localStorage.getItem('chrxmaticc_email');
  updateAccountUI(email);
})();
