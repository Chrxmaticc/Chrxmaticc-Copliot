// GitHub user stats
module.exports = {
  name: 'github',
  description: 'Get GitHub user stats',
  category: 'dev',
  run: async function(args) {
    if (!args) return 'Usage: /github <username>';
    var https = require('https');
    return new Promise(function(resolve) {
      var options = {
        hostname: 'api.github.com',
        path: '/users/' + encodeURIComponent(args.trim()),
        headers: { 'User-Agent': 'Chrxmaticc-Copilot' }
      };
      https.get(options, function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() {
          try {
            var json = JSON.parse(body);
            if (json.login) {
              resolve('🐙 ' + json.login + ' | Repos: ' + json.public_repos + ' | Followers: ' + json.followers + ' | Following: ' + json.following + '\n   ' + (json.bio || 'No bio') + '\n   ' + json.html_url);
            } else {
              resolve('User not found');
            }
          } catch (e) { resolve('Error fetching stats'); }
        });
      }).on('error', function() { resolve('Network error'); });
    });
  }
};
