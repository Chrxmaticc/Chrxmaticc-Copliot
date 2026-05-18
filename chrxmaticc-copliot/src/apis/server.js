// Chrxmaticc Copilot — HTTP API Server (Secure)
// Author: Chrxmee-Midnightt

var http = require('http');
var chat = require('../chat');

var PORT = process.env.CHRXMATICC_PORT || 3000;

// Public key — safe to be in source code
var API_KEYS = {
  'chrxmaticc_public': {
    tier: 'public',
    maxRequestsPerMinute: 10,
    allowedCommands: ['chat'],
    maxTokens: 100
  }
};

// Master key — NEVER in source code. Set via environment variable.
var MASTER_KEY = process.env.CHRXMATICC_MASTER_KEY || '';
if (MASTER_KEY) {
  API_KEYS[MASTER_KEY] = {
    tier: 'master',
    maxRequestsPerMinute: 100,
    allowedCommands: ['chat', 'run', 'speak', 'save', 'clear'],
    maxTokens: 500
  };
}

var MODELS = {
  default: 'You are Chrxmaticc Copilot, a hyper-intelligent and offbrand terminal AI...',
  creative: 'You are Chrxmaticc Copilot in creative mode...',
  technical: 'You are Chrxmaticc Copilot in technical mode...',
  midnight: 'You are Chrxmaticc Copilot in midnight mode...'
};

var requestLog = {};

function checkRateLimit(key) {
  var now = Date.now();
  var windowStart = now - 60000;
  
  if (!requestLog[key]) requestLog[key] = [];
  requestLog[key] = requestLog[key].filter(function(t) { return t > windowStart; });
  
  var tier = API_KEYS[key] || API_KEYS['chrxmaticc_public'];
  if (requestLog[key].length >= tier.maxRequestsPerMinute) return false;
  
  requestLog[key].push(now);
  return true;
}

function parseBody(req) {
  return new Promise(function(resolve) {
    var body = '';
    req.on('data', function(chunk) { body = body + chunk; });
    req.on('end', function() {
      try { resolve(JSON.parse(body)); } catch (e) { resolve({}); }
    });
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

var server = http.createServer(async function(req, res) {
  if (req.method === 'OPTIONS') { sendJSON(res, 200, { status: 'ok' }); return; }

  if (req.url === '/health' && req.method === 'GET') {
    sendJSON(res, 200, {
      status: 'online',
      name: 'Chrxmaticc Copilot',
      version: '1.0.0',
      models: Object.keys(MODELS),
      publicKey: 'chrxmaticc_public',
      masterKeySet: !!MASTER_KEY
    });
    return;
  }

  if (req.url === '/chat' && req.method === 'POST') {
    var auth = req.headers['authorization'] || '';
    var key = auth.replace('Bearer ', '');
    
    if (!API_KEYS[key]) {
      sendJSON(res, 401, { error: 'Invalid API key.' });
      return;
    }

    if (!checkRateLimit(key)) {
      sendJSON(res, 429, { error: 'Rate limit exceeded.' });
      return;
    }

    var tier = API_KEYS[key].tier;
    var body = await parseBody(req);
    var message = body.message || '';

    if (!message) { sendJSON(res, 400, { error: 'Missing "message" field' }); return; }

    var response = await chat.getResponse(message);
    var text = typeof response === 'string' ? response : response.text;

    sendJSON(res, 200, { response: text, tier: tier, provider: response.provider || 'offline' });
    return;
  }

  sendJSON(res, 404, { error: 'Not found. Try POST /chat' });
});

function startServer() {
  server.listen(PORT, function() {
    console.log('  🧠 Chrxmaticc Copilot API Server');
    console.log('  Port: ' + PORT);
    console.log('  Public key: chrxmaticc_public');
    if (MASTER_KEY) {
      console.log('  Master key: [set]');
    } else {
      console.log('  Master key: [not set — run: export CHRXMATICC_MASTER_KEY=your-key]');
    }
    console.log('');
  });
}

module.exports = { startServer: startServer };
