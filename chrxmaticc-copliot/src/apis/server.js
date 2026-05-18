// Chrxmaticc Copilot — HTTP API Server
// Single-user + Multi-user + Voice routes
// Author: Chrxmee-Midnightt

var http = require('http');
var chat = require('../chat');
var multiChat = require('../multi-user-chat');
var voice = require('../voice');

var PORT = process.env.CHRXMATICC_PORT || 3000;

var API_KEYS = {
  'chrxmaticc_public': { tier: 'public', maxRequestsPerMinute: 10, maxTokens: 100 }
};

var MASTER_KEY = process.env.CHRXMATICC_MASTER_KEY || '';
if (MASTER_KEY) {
  API_KEYS[MASTER_KEY] = { tier: 'master', maxRequestsPerMinute: 100, maxTokens: 500 };
}

var requestLog = {};

function checkRateLimit(key) {
  var now = Date.now();
  if (!requestLog[key]) requestLog[key] = [];
  requestLog[key] = requestLog[key].filter(function(t) { return t > now - 60000; });
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

function sendJSON(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

var server = http.createServer(async function(req, res) {
  if (req.method === 'OPTIONS') { sendJSON(res, 200, {}); return; }

  if (req.url === '/health' && req.method === 'GET') {
    sendJSON(res, 200, { status: 'online', name: 'Chrxmaticc Copilot', version: '1.0.0' });
    return;
  }

  // Single-user chat
  if (req.url === '/chat' && req.method === 'POST') {
    var auth = req.headers['authorization'] || '';
    var key = auth.replace('Bearer ', '');
    if (!API_KEYS[key]) { sendJSON(res, 401, { error: 'Invalid API key' }); return; }
    if (!checkRateLimit(key)) { sendJSON(res, 429, { error: 'Rate limited' }); return; }

    var body = await parseBody(req);
    var message = body.message || '';
    if (!message) { sendJSON(res, 400, { error: 'Missing message' }); return; }

    var response = await chat.getResponse(message);
    sendJSON(res, 200, { response: typeof response === 'string' ? response : response.text, provider: response.provider });
    return;
  }

  // Multi-user chat
  if (req.url === '/multi-chat' && req.method === 'POST') {
    var auth = req.headers['authorization'] || '';
    var key = auth.replace('Bearer ', '');
    if (!API_KEYS[key]) { sendJSON(res, 401, { error: 'Invalid API key' }); return; }

    var body = await parseBody(req);
    var message = body.message || '';
    var userId = body.userId || 'anonymous';
    if (!message) { sendJSON(res, 400, { error: 'Missing message' }); return; }

    var response = await multiChat.getResponse(message, userId);
    sendJSON(res, 200, { response: response.text, userId: userId, memorySize: multiChat.getUserMemory(userId).history.length, provider: response.provider });
    return;
  }

  // Voice processing
  if (req.url === '/voice' && req.method === 'POST') {
    var auth = req.headers['authorization'] || '';
    var key = auth.replace('Bearer ', '');
    if (!API_KEYS[key]) { sendJSON(res, 401, { error: 'Invalid API key' }); return; }

    var body = await parseBody(req);
    var userId = body.userId || 'anonymous';
    var audioBase64 = body.audio || '';
    if (!audioBase64) { sendJSON(res, 400, { error: 'Missing audio' }); return; }

    var audioBuffer = Buffer.from(audioBase64, 'base64');
    voice.processVoiceMessage(audioBuffer, userId, function(err, result) {
      if (err) { sendJSON(res, 400, { error: 'Voice failed' }); return; }
      sendJSON(res, 200, { response: result.text, userText: result.userText, userId: userId });
    });
    return;
  }

  sendJSON(res, 404, { error: 'Not found' });
});

function startServer() {
  server.listen(PORT, function() {
    console.log('  🧠 Chrxmaticc Copilot API');
    console.log('  Port: ' + PORT);
    console.log('  /chat — single-user');
    console.log('  /multi-chat — multi-user');
    console.log('  /voice — voice processing');
    console.log('');
  });
}

module.exports = { startServer: startServer };
