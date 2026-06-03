// Chrxmaticc Copilot — Discord OAuth Initiate
var https = require('https');
var url = require('url');

module.exports = function(req, res) {
  var clientId = process.env.DISCORD_CLIENT_ID;
  var redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).json({ error: 'Discord auth not configured.' });
    return;
  }

  var authUrl = 'https://discord.com/api/oauth2/authorize?' +
    'client_id=' + encodeURIComponent(clientId) +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent('identify email');

  res.writeHead(302, { Location: authUrl });
  res.end();
};
