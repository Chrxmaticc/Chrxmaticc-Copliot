var crypto = require('crypto');
var USERS = {};
var TOKENS = {};

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var { action, email, password, token } = req.body || {};

  if (action === 'signup') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (USERS[email]) return res.status(409).json({ error: 'Account exists' });
    USERS[email] = { email, password: crypto.createHash('sha256').update(password).digest('hex'), createdAt: Date.now() };
    var t = crypto.randomBytes(32).toString('hex'); TOKENS[t] = email;
    return res.status(200).json({ token: t, email });
  }

  if (action === 'login') {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    var hash = crypto.createHash('sha256').update(password).digest('hex');
    if (!USERS[email] || USERS[email].password !== hash) return res.status(401).json({ error: 'Invalid credentials' });
    var t = crypto.randomBytes(32).toString('hex'); TOKENS[t] = email;
    return res.status(200).json({ token: t, email });
  }

  if (action === 'verify') {
    if (!token || !TOKENS[token]) return res.status(401).json({ valid: false });
    return res.status(200).json({ valid: true, email: TOKENS[token] });
  }

  res.status(400).json({ error: 'Use: signup, login, verify' });
};
