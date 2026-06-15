// api/auth/github.js — Initiate GitHub OAuth with repo scope
module.exports = function(req, res) {
  var clientId = process.env.GITHUB_CLIENT_ID;
  var redirectUri = process.env.GITHUB_REDIRECT_URI || 'https://chrxmaticc-copliot.vercel.app/api/auth/github/callback';
  
  if (!clientId) {
    res.writeHead(302, { Location: '/accounts.html?error=github_not_configured' });
    res.end();
    return;
  }
  
  var url = 'https://github.com/login/oauth/authorize?' +
    'client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent('user:email repo');
  
  res.writeHead(302, { Location: url });
  res.end();
};
