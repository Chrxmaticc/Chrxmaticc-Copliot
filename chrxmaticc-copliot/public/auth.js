// ╔══════════════════════════════════════════╗
// ║  Chrxmaticc Copilot — Auth Logic        ║
// ║  Discord • GitHub • Email • Token       ║
// ║  Author: Chrxmee-Midnightt              ║
// ╚══════════════════════════════════════════╝

(function() {

  // ── Theme ──
  var currentTheme = localStorage.getItem('chrxmaticc_theme') || 'gold';
  document.body.setAttribute('data-theme', currentTheme);

  function updateDots() {
    document.querySelectorAll('.accounts-theme-dot').forEach(function(d) {
      d.classList.toggle('active', d.getAttribute('data-theme') === currentTheme);
    });
  }
  updateDots();

  document.querySelectorAll('.accounts-theme-dot').forEach(function(dot) {
    dot.addEventListener('click', function() {
      currentTheme = this.getAttribute('data-theme');
      document.body.setAttribute('data-theme', currentTheme);
      localStorage.setItem('chrxmaticc_theme', currentTheme);
      updateDots();
    });
  });

  // ── Parallax ──
  var parallaxBg = document.getElementById('parallaxBg');
  if (parallaxBg) {
    document.addEventListener('mousemove', function(e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 8;
      var y = (e.clientY / window.innerHeight - 0.5) * 8;
      parallaxBg.style.transform = 'scale(1.1) translate(' + x + 'px, ' + y + 'px)';
    });
  }

  // ── Signup mode ──
  var params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'signup') {
    document.getElementById('accountsSubtitle').textContent = 'Create your account';
    document.getElementById('emailSection').classList.add('visible');
  }

  // ═══════════════════════════════════════
  //  DISCORD
  // ═══════════════════════════════════════
  document.getElementById('btnDiscord').addEventListener('click', function() {
    location.href = '/api/auth/discord';
  });

  // ═══════════════════════════════════════
  //  GITHUB
  // ═══════════════════════════════════════
  document.getElementById('btnGitHub').addEventListener('click', function() {
    location.href = '/api/auth/github';
  });

  // ═══════════════════════════════════════
  //  EMAIL & PASSWORD
  // ═══════════════════════════════════════
  document.getElementById('btnEmail').addEventListener('click', function() {
    var section = document.getElementById('emailSection');
    section.classList.toggle('visible');
    if (section.classList.contains('visible')) {
      document.getElementById('tokenSection').classList.remove('visible');
    }
  });

  document.getElementById('btnEmailSignIn').addEventListener('click', function() {
    var email = document.getElementById('authEmail').value.trim();
    var password = document.getElementById('authPassword').value.trim();
    var errEl = document.getElementById('emailError');
    if (!email || !password) { errEl.textContent = 'Fill in all fields.'; return; }

    var users = {};
    try { users = JSON.parse(localStorage.getItem('chrxmaticc_users') || '{}'); } catch(e) {}
    if (!users[email] || users[email].password !== password) {
      errEl.textContent = 'Invalid email or password.';
      return;
    }

    localStorage.setItem('chrxmaticc_user', JSON.stringify({
      email: email,
      displayName: email.split('@')[0],
      provider: 'email'
    }));
    location.href = 'app.html';
  });

  document.getElementById('btnEmailSignUp').addEventListener('click', async function() {
    var email = document.getElementById('authEmail').value.trim();
    var password = document.getElementById('authPassword').value.trim();
    var errEl = document.getElementById('emailError');
    if (!email || !password) { errEl.textContent = 'Fill in all fields.'; return; }
    if (password.length < 4) { errEl.textContent = 'Password must be 4+ characters.'; return; }

    var users = {};
    try { users = JSON.parse(localStorage.getItem('chrxmaticc_users') || '{}'); } catch(e) {}
    if (users[email]) { errEl.textContent = 'Account already exists.'; return; }

    // Generate token
    var token = 'CH_' + Array.from(crypto.getRandomValues(new Uint8Array(40)))
      .map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

    users[email] = { password: password, token: token };
    localStorage.setItem('chrxmaticc_users', JSON.stringify(users));
    localStorage.setItem('chrxmaticc_user', JSON.stringify({
      email: email,
      displayName: email.split('@')[0],
      provider: 'email',
      token: token
    }));

    // Also save token to DB if available
    try {
      await fetch('/api/auth/token-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          username: email.split('@')[0],
          token: token,
          displayName: email.split('@')[0]
        })
      });
    } catch(e) {}

    errEl.style.color = '#30d158';
    errEl.textContent = 'Account created! Your token: ' + token.slice(0, 20) + '... (saved to your account)';
    setTimeout(function() { location.href = 'app.html'; }, 2000);
  });

  // ═══════════════════════════════════════
  //  TOKEN LOGIN
  // ═══════════════════════════════════════
  document.getElementById('btnToken').addEventListener('click', function() {
    var section = document.getElementById('tokenSection');
    section.classList.toggle('visible');
    if (section.classList.contains('visible')) {
      document.getElementById('emailSection').classList.remove('visible');
    }
  });

  document.getElementById('btnTokenLogin').addEventListener('click', async function() {
    var token = document.getElementById('tokenInput').value.trim();
    var errEl = document.getElementById('tokenError');
    if (!token) { errEl.textContent = 'Enter your token.'; return; }

    // Check localStorage first
    var users = {};
    try { users = JSON.parse(localStorage.getItem('chrxmaticc_users') || '{}'); } catch(e) {}
    var found = null;
    for (var email in users) {
      if (users[email].token === token) {
        found = { email: email, displayName: email.split('@')[0], provider: 'token', token: token };
        break;
      }
    }

    // Try DB if not found locally
    if (!found) {
      try {
        var res = await fetch('/api/auth/token-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', token: token })
        });
        var data = await res.json();
        if (data.success && data.user) {
          found = data.user;
        }
      } catch(e) {}
    }

    if (found) {
      localStorage.setItem('chrxmaticc_user', JSON.stringify(found));
      location.href = 'app.html';
    } else {
      errEl.textContent = 'Invalid token.';
    }
  });

  // ═══════════════════════════════════════
  //  GUEST
  // ═══════════════════════════════════════
  document.getElementById('btnGuest').addEventListener('click', function() {
    localStorage.removeItem('chrxmaticc_user');
    location.href = 'app.html';
  });

})();
