// api/auth/github/files.js — Fetch repo file tree
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var token = body.token || '';
  var repo = body.repo || '';

  if (!token || !repo) return res.status(400).json({ error: 'Missing token or repo' });

  try {
    // Get the default branch
    var repoRes = await fetch('https://api.github.com/repos/' + repo, {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Chrxmaticc-Copilot', 'Accept': 'application/json' }
    });
    var repoData = await repoRes.json();
    var defaultBranch = repoData.default_branch || 'main';

    // Get the file tree (top-level only, limit depth)
    var treeRes = await fetch('https://api.github.com/repos/' + repo + '/git/trees/' + defaultBranch + '?recursive=1', {
      headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Chrxmaticc-Copilot', 'Accept': 'application/json' }
    });
    var treeData = await treeRes.json();

    if (!treeData.tree) return res.status(400).json({ error: 'Failed to fetch tree: ' + (treeData.message || 'unknown') });

    var files = treeData.tree.map(function(item) {
      return { name: item.path, type: item.type, size: item.size };
    });

    res.status(200).json({ success: true, branch: defaultBranch, files: files });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
