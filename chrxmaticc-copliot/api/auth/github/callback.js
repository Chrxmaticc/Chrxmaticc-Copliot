// api/auth/github/callback.js — Handle GitHub OAuth callback with token pass
var https = require('https');

module.exports = function(req, res) {
  var clientId = process.env.GITHUB_CLIENT_ID;
  var clientSecret = process.env.GITHUB_CLIENT_SECRET;
  var redirectUri = process.env.GITHUB_REDIRECT_URI || 'https://chrxmaticc-copliot.vercel.app/api/auth/github/callback';
  
  var url = require('url');
  var query = url.parse(req.url, true).query;
  var code = query.code;
  
  if (!code) {
    res.writeHead(302, { Location: '/accounts.html?error=no_code' });
    res.end();
    return;
  }

  var postData = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri
  });

  var tokenReq = https.request({
    hostname: 'github.com',
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, function(tokenRes) {
    var body = '';
    tokenRes.on('data', function(c) { body += c; });
    tokenRes.on('end', function() {
      try {
        var json = JSON.parse(body);
        var accessToken = json.access_token;
        if (!accessToken) {
          res.writeHead(302, { Location: '/accounts.html?error=token_failed' });
          res.end();
          return;
        }

        fetchGitHubUser(accessToken, res);
      } catch(e) {
        res.writeHead(302, { Location: '/accounts.html?error=token_parse' });
        res.end();
      }
    });
  });

  tokenReq.on('error', function() {
    res.writeHead(302, { Location: '/accounts.html?error=request_failed' });
    res.end();
  });
  tokenReq.write(postData);
  tokenReq.end();
};

function fetchGitHubUser(accessToken, res) {
  var userReq = https.request({
    hostname: 'api.github.com',
    path: '/user',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'User-Agent': 'Chrxmaticc-Copilot',
      'Accept': 'application/json'
    }
  }, function(userRes) {
    var body = '';
    userRes.on('data', function(c) { body += c; });
    userRes.on('end', function() {
      try {
        var user = JSON.parse(body);
        var userData = {
          provider: 'github',
          githubId: user.id,
          displayName: user.name || user.login,
          username: user.login,
          avatar: user.avatar_url,
          email: user.email || null,
          githubToken: accessToken
        };

        if (!userData.email) {
          fetchGitHubEmails(accessToken, userData, res);
        } else {
          redirectWithUser(res, userData);
        }
      } catch(e) {
        res.writeHead(302, { Location: '/accounts.html?error=user_fetch' });
        res.end();
      }
    });
  });

  userReq.on('error', function() {
    res.writeHead(302, { Location: '/accounts.html?error=user_request' });
    res.end();
  });
  userReq.end();
}

function fetchGitHubEmails(accessToken, userData, res) {
  var emailReq = https.request({
    hostname: 'api.github.com',
    path: '/user/emails',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'User-Agent': 'Chrxmaticc-Copilot',
      'Accept': 'application/json'
    }
  }, function(emailRes) {
    var body = '';
    emailRes.on('data', function(c) { body += c; });
    emailRes.on('end', function() {
      try {
        var emails = JSON.parse(body);
        var primary = emails.find(function(e) { return e.primary; });
        if (primary) userData.email = primary.email;
      } catch(e) {}
      redirectWithUser(res, userData);
    });
  });

  emailReq.on('error', function() {
    redirectWithUser(res, userData);
  });
  emailReq.end();
}

function redirectWithUser(res, userData) {
  var url = '/app.html?user=' + encodeURIComponent(JSON.stringify(userData));
  res.writeHead(302, { Location: url });
  res.end();
}
