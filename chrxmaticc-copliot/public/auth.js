// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Auth Logic        ║
// ║  Login • Signup • Forgot • Security QA  ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

function showEmailAuth() {
  var form = document.getElementById('emailAuthForm');
  if (form) form.style.display = 'block';
}

function handleGoogleLogin() {
  alert('Google login coming soon. Use email or guest for now.');
}

async function handleEmailAuth(action) {
  var email = document.getElementById('authEmail')?.value?.trim();
  var password = document.getElementById('authPassword')?.value?.trim();
  var securityQuestion = document.getElementById('signupSecurityQuestion')?.value?.trim();
  var securityAnswer = document.getElementById('signupSecurityAnswer')?.value?.trim();
  var errorEl = document.getElementById('authError');

  if (!email || !password) { if (errorEl) errorEl.textContent = 'Fill in email and password.'; return; }

  if (action === 'signup') {
    if (!securityQuestion || !securityAnswer) {
      document.getElementById('signupSecurityQuestion').style.display = 'block';
      document.getElementById('signupSecurityAnswer').style.display = 'block';
      if (errorEl) errorEl.textContent = 'Set a security question and answer for account recovery.';
      return;
    }
  }

  try {
    var body = { action: action, email: email, password: password };
    if (action === 'signup') { body.securityQuestion = securityQuestion; body.securityAnswer = securityAnswer; }

    var res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var data = await res.json();

    if (data.token) {
      localStorage.setItem('chrxmaticc_token', data.token);
      localStorage.setItem('chrxmaticc_email', data.email);
      location.href = 'app.html';
    } else if (data.requiresSecurityAnswer) {
      document.getElementById('signupSecurityQuestion').style.display = 'block';
      document.getElementById('signupSecurityAnswer').style.display = 'block';
      if (errorEl) errorEl.textContent = 'Answer your security question to reset.';
    } else {
      if (errorEl) errorEl.textContent = data.error || 'Something went wrong.';
    }
  } catch (e) {
    if (errorEl) errorEl.textContent = 'Connection error.';
  }
}
