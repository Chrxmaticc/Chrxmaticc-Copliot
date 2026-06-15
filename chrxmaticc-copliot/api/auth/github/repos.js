// api/github/repos.js — List user's GitHub repositories
module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var accessToken = (req.body || {}).token || '';
  if (!accessToken) return res.status(400).json({ error: 'Missing token' });

  try {
    var reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'User-Agent': 'Chrxmaticc-Copilot',
        'Accept': 'application/json'
      }
    });
    var repos = await reposRes.json();

    if (!Array.isArray(repos)) {
      return res.status(400).json({ error: 'Failed to fetch repos: ' + (repos.message || 'unknown') });
    }

    var list = repos.map(function(r) {
      return { name: r.full_name, description: r.description, private: r.private, url: r.html_url };
    });

    res.status(200).json({ success: true, repos: list });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
