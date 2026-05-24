function showEmailAuth() {
  var form = document.getElementById('emailAuthForm');
  if (form) form.style.display = 'block';
}

async function handleEmailAuth(action) {
  var email = document.getElementById('authEmail')?.value?.trim();
  var password = document.getElementById('authPassword')?.value?.trim();
  var errorEl = document.getElementById('authError');
  if (!email || !password) { if (errorEl) errorEl.textContent = 'Fill in both fields.'; return; }
  try {
    var res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action, email: email, password: password }) });
    var data = await res.json();
    if (data.token) { localStorage.setItem('chrxmaticc_token', data.token); localStorage.setItem('chrxmaticc_email', data.email); location.href = 'app.html'; }
    else { if (errorEl) errorEl.textContent = data.error || 'Something went wrong.'; }
  } catch (e) { if (errorEl) errorEl.textContent = 'Connection error.'; }
}

function handleGoogleLogin() {
  alert('Google login coming soon. Use email or guest for now.');
}
