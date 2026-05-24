var fs = require('fs');
var path = require('path');
var MEMORY_FILE = path.join('/tmp', 'chrxmaticc-memory.json');

function load() {
  try { if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch (e) {}
  return {};
}
function save(data) { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2)); }

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var memory = load();
  var userId = (req.body && req.body.userId) || 'anonymous';

  if (req.method === 'GET') return res.status(200).json({ conversations: (memory[userId] || []).slice(-50) });
  if (req.method === 'DELETE') { delete memory[userId]; save(memory); return res.status(200).json({ cleared: true }); }

  if (req.method === 'POST') {
    if (!memory[userId]) memory[userId] = [];
    memory[userId].push({ role: req.body.role, content: req.body.content, timestamp: Date.now() });
    if (memory[userId].length > 200) memory[userId] = memory[userId].slice(-200);
    save(memory);
    return res.status(200).json({ saved: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
