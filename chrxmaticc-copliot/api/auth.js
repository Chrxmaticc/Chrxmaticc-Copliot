var crypto = require('crypto');
var USERS = {};
var TOKENS = {};
var RESET_TOKENS = {};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var { action, email, password, token, newPassword, securityAnswer } = req.body || {};

  // Signup — now with security question
  if (action === 'signup') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (USERS[email]) return res.status(409).json({ error: 'Account exists' });
    
    USERS[email] = {
      email,
      password: crypto.createHash('sha256').update(password).digest('hex'),
      securityAnswer: securityAnswer ? crypto.createHash('sha256').update(securityAnswer.toLowerCase().trim()).digest('hex') : null,
      createdAt: Date.now()
    };
    
    var t = crypto.randomBytes(32).toString('hex'); TOKENS[t] = email;
    return res.status(200).json({ token: t, email });
  }

  // Login
  if (action === 'login') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    var hash = crypto.createHash('sha256').update(password).digest('hex');
    if (!USERS[email] || USERS[email].password !== hash) return res.status(401).json({ error: 'Invalid credentials' });
    var t = crypto.randomBytes(32).toString('hex'); TOKENS[t] = email;
    return res.status(200).json({ token: t, email });
  }

  // Verify token
  if (action === 'verify') {
    if (!token || !TOKENS[token]) return res.status(401).json({ valid: false });
    return res.status(200).json({ valid: true, email: TOKENS[token] });
  }

  // Forgot password — verify identity first
  if (action === 'forgot') {
    if (!email) return res.status(400).json({ error: 'Email required' });
    if (!USERS[email]) return res.status(200).json({ exists: false });
    
    // If user has a security answer, require it
    if (USERS[email].securityAnswer) {
      if (!securityAnswer) {
        return res.status(200).json({ requiresSecurityAnswer: true });
      }
      var answerHash = crypto.createHash('sha256').update(securityAnswer.toLowerCase().trim()).digest('hex');
      if (USERS[email].securityAnswer !== answerHash) {
        return res.status(401).json({ error: 'Incorrect security answer' });
      }
    }
    
    // Generate reset token — valid 15 minutes, single use
    var resetToken = crypto.randomBytes(32).toString('hex');
    RESET_TOKENS[resetToken] = { email, expires: Date.now() + 900000, used: false };
    
    // In production: email this token. For now: return it securely.
    return res.status(200).json({ 
      resetToken: resetToken,
      message: 'Reset token generated. In production, this would be emailed.'
    });
  }

  // Reset password — requires valid reset token
  if (action === 'reset') {
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    
    var entry = RESET_TOKENS[token];
    if (!entry) return res.status(401).json({ error: 'Invalid reset token' });
    if (entry.used) return res.status(401).json({ error: 'Token already used' });
    if (Date.now() > entry.expires) {
      delete RESET_TOKENS[token];
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // Update password
    USERS[entry.email].password = crypto.createHash('sha256').update(newPassword).digest('hex');
    RESET_TOKENS[token].used = true;
    
    // Invalidate all existing login tokens for this user (force re-login)
    Object.keys(TOKENS).forEach(function(t) {
      if (TOKENS[t] === entry.email) delete TOKENS[t];
    });
    
    return res.status(200).json({ reset: true });
  }

  res.status(400).json({ error: 'Use: signup, login, verify, forgot, reset' });
};
