// Chrxmaticc Copilot — Discord OAuth Callback
var https = require('https');
var url = require('url');

module.exports = function(req, res) {
  var clientId = process.env.DISCORD_CLIENT_ID;
  var clientSecret = process.env.DISCORD_CLIENT_SECRET;
  var redirectUri = process.env.DISCORD_REDIRECT_URI;

  var query = url.parse(req.url, true).query;
  var code = query.code;

  if (!code) {
    res.writeHead(302, { Location: '/accounts.html?error=no_code' });
    res.end();
    return;
  }

  // Exchange code for access token
  var tokenData = new URLSearchParams();
  tokenData.append('client_id', clientId);
  tokenData.append('client_secret', clientSecret);
  tokenData.append('grant_type', 'authorization_code');
  tokenData.append('code', code);
  tokenData.append('redirect_uri', redirectUri);

  var tokenBody = tokenData.toString();

  var tokenReq = https.request({
    hostname: 'discord.com',
    path: '/api/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(tokenBody)
    }
  }, function(tokenRes) {
    var body = '';
    tokenRes.on('data', function(c) { body += c; });
    tokenRes.on('end', function() {
      try {
        var tokenJson = JSON.parse(body);
        var accessToken = tokenJson.access_token;

        if (!accessToken) {
          res.writeHead(302, { Location: '/accounts.html?error=token_failed' });
          res.end();
          return;
        }

        // Fetch user info
        var userReq = https.request({
          hostname: 'discord.com',
          path: '/api/users/@me',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + accessToken
          }
        }, function(userRes) {
          var userBody = '';
          userRes.on('data', function(c) { userBody += c; });
          userRes.on('end', function() {
            try {
              var user = JSON.parse(userBody);
              var userData = {
                provider: 'discord',
                discordId: user.id,
                displayName: user.global_name || user.username,
                username: user.username,
                avatar: user.avatar ? 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png' : null,
                email: user.email || null
              };

              var redirectUrl = '/app.html?user=' + encodeURIComponent(JSON.stringify(userData));
              res.writeHead(302, { Location: redirectUrl });
              res.end();
            } catch(e) {
              res.writeHead(302, { Location: '/accounts.html?error=user_fetch_failed' });
              res.end();
            }
          });
        });

        userReq.on('error', function() {
          res.writeHead(302, { Location: '/accounts.html?error=user_fetch_failed' });
          res.end();
        });
        userReq.end();
      } catch(e) {
        res.writeHead(302, { Location: '/accounts.html?error=token_parse_failed' });
        res.end();
      }
    });
  });

  tokenReq.on('error', function() {
    res.writeHead(302, { Location: '/accounts.html?error=token_request_failed' });
    res.end();
  });
  tokenReq.write(tokenBody);
  tokenReq.end();
};
