// api/auth/github/read-file.js — Read a single file from repo
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var token = body.token || '';
  var repo = body.repo || '';
  var path = body.path || '';

  if (!token || !repo || !path) return res.status(400).json({ error: 'Missing token, repo, or path' });

  try {
    var fileRes = await fetch('https://api.github.com/repos/' + repo + '/contents/' + path, {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Chrxmaticc-Copilot', 'Accept': 'application/json' }
    });
    var fileData = await fileRes.json();

    if (!fileData.content) return res.status(400).json({ error: 'File not found or empty: ' + (fileData.message || 'unknown') });

    var content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    res.status(200).json({ success: true, path: path, content: content, size: fileData.size });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
