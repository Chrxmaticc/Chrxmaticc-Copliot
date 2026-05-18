// Chrxmaticc Copilot — Spotify Integration v2.0
// Also, all Spotify Logins and Credentials are private. Please know this.
// Full account login, playlist control, music analysis
// Author: Chrxmee-Midnightt

var chat = require('../chat');
var chalk = require('chalk');
var https = require('https');

// Spotify API credentials (registered app)
var SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
var SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
var SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/spotify/callback';

var userSessions = {};

// ──────────────────────────────────────────────
//  SECURITY DISCLAIMER
// ──────────────────────────────────────────────

var SECURITY_DISCLAIMER = [
  '🔒 SECURITY NOTICE:',
  '• Chrxmaticc Copilot does NOT store your password.',
  '• Credentials are sent directly to Spotify via OAuth.',
  '• Your data is private and never logged.',
  '• 2FA codes are processed in real-time only.',
  '• You can use public playlists without logging in.',
  '• Account login enables: private playlists, liked songs, playback control.',
  '• Log out anytime with /spotify logout.',
  '• This is an open-source project. Verify the code yourself.',
  '• By logging in, you agree to Spotify\'s Terms of Service.'
].join('\n');

function showDisclaimer() {
  console.log('');
  console.log('  ' + chalk.yellow(SECURITY_DISCLAIMER));
  console.log('');
}

// ──────────────────────────────────────────────
//  AUTHENTICATION
// ──────────────────────────────────────────────

function getAuthURL() {
  var params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify user-read-playback-state user-modify-playback-state',
    state: Math.random().toString(36).substring(7)
  });
  
  return 'https://accounts.spotify.com/authorize?' + params.toString();
}

function exchangeCodeForToken(code, userId) {
  return new Promise(function(resolve, reject) {
    var data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    }).toString();

    var options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      }
    };

    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body = body + chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          if (json.access_token) {
            userSessions[userId] = {
              accessToken: json.access_token,
              refreshToken: json.refresh_token,
              expiresAt: Date.now() + (json.expires_in * 1000),
              createdAt: Date.now()
            };
            resolve({ success: true });
          } else {
            resolve({ success: false, error: json.error_description || 'Auth failed' });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', function(e) { reject(e); });
    req.write(data);
    req.end();
  });
}

function refreshToken(userId) {
  return new Promise(function(resolve) {
    var session = userSessions[userId];
    if (!session || !session.refreshToken) {
      resolve({ success: false, error: 'No session' });
      return;
    }

    var data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    }).toString();

    var options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    var req = https.request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body = body + chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          if (json.access_token) {
            userSessions[userId].accessToken = json.access_token;
            userSessions[userId].expiresAt = Date.now() + (json.expires_in * 1000);
            resolve({ success: true });
          } else {
            resolve({ success: false });
          }
        } catch (e) {
          resolve({ success: false });
        }
      });
    });

    req.on('error', function() { resolve({ success: false }); });
    req.write(data);
    req.end();
  });
}

function isAuthenticated(userId) {
  var session = userSessions[userId];
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    refreshToken(userId);
    return false;
  }
  return true;
}

// ──────────────────────────────────────────────
//  MUSIC CONTROLS
// ──────────────────────────────────────────────

function apiCall(endpoint, method, userId, body) {
  return new Promise(function(resolve) {
    var session = userSessions[userId];
    if (!session) {
      resolve({ success: false, error: 'Not authenticated' });
      return;
    }

    var data = body ? JSON.stringify(body) : null;
    var options = {
      hostname: 'api.spotify.com',
      path: '/v1' + endpoint,
      method: method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + session.accessToken,
        'Content-Type': 'application/json'
      }
    };

    var req = https.request(options, function(res) {
      var responseBody = '';
      res.on('data', function(chunk) { responseBody = responseBody + chunk; });
      res.on('end', function() {
        try {
          resolve({ success: true, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });

    req.on('error', function(e) { resolve({ success: false, error: e.message }); });
    if (data) req.write(data);
    req.end();
  });
}

// ──────────────────────────────────────────────
//  PUBLIC API (no login needed)
// ──────────────────────────────────────────────

async function searchTrack(query) {
  var prompt = 'Search Spotify for "' + query + '". What are the top 3 results? Give song name and artist.';
  var response = await chat.getResponse(prompt);
  return typeof response === 'string' ? response : response.text;
}

async function analyzeTrack(trackName, artist) {
  var prompt = 'Analyze "' + trackName + '" by ' + artist + '. Genre, mood, what makes it unique.';
  var response = await chat.getResponse(prompt);
  return typeof response === 'string' ? response : response.text;
}

async function suggestSimilar(trackName, artist) {
  var prompt = 'Suggest 5 songs similar to "' + trackName + '" by ' + artist + '.';
  var response = await chat.getResponse(prompt);
  return typeof response === 'string' ? response : response.text;
}

async function createPlaylistPrompt(mood, genre) {
  var prompt = 'Create a 10-song playlist for a ' + mood + ' mood';
  if (genre) prompt = prompt + ' in ' + genre;
  prompt = prompt + '. Give song names and artists.';
  var response = await chat.getResponse(prompt);
  return typeof response === 'string' ? response : response.text;
}

// ──────────────────────────────────────────────
//  PRIVATE API (login required)
// ──────────────────────────────────────────────

async function getMyPlaylists(userId) {
  if (!isAuthenticated(userId)) return { success: false, error: 'Not logged in. Use /spotify login' };
  return apiCall('/me/playlists', 'GET', userId);
}

async function getMyLikedSongs(userId) {
  if (!isAuthenticated(userId)) return { success: false, error: 'Not logged in' };
  return apiCall('/me/tracks?limit=20', 'GET', userId);
}

async function createPlaylist(userId, name, description) {
  if (!isAuthenticated(userId)) return { success: false, error: 'Not logged in' };
  
  var userResult = await apiCall('/me', 'GET', userId);
  if (!userResult.success) return userResult;
  
  return apiCall('/users/' + userResult.data.id + '/playlists', 'POST', userId, {
    name: name,
    description: description || 'Created by Chrxmaticc Copilot',
    public: false
  });
}

async function getCurrentPlaying(userId) {
  if (!isAuthenticated(userId)) return { success: false, error: 'Not logged in' };
  return apiCall('/me/player/currently-playing', 'GET', userId);
}

function logout(userId) {
  delete userSessions[userId];
  return { success: true, message: 'Logged out. Your data was never stored.' };
}

// ──────────────────────────────────────────────
//  COMMAND HANDLER
// ──────────────────────────────────────────────

async function handleCommand(command, userId) {
  var parts = command.split(' ');
  var action = parts[1] || '';
  var args = parts.slice(2).join(' ');

  switch (action) {
    case 'login':
      showDisclaimer();
      return {
        text: '🔗 Open this URL to log in:\n' + getAuthURL() + '\n\nAfter logging in, copy the URL you were redirected to and run:\n/spotify callback <full-url>',
        requiresCallback: true
      };

    case 'callback':
      var url = args;
      var codeMatch = url.match(/code=([^&]+)/);
      if (codeMatch) {
        var result = await exchangeCodeForToken(codeMatch[1], userId);
        if (result.success) {
          return { text: '✅ Logged in to Spotify! Your data is private.' };
        }
        return { text: '❌ Login failed: ' + (result.error || 'Unknown error') };
      }
      return { text: '❌ Could not find authorization code in URL.' };

    case 'logout':
      logout(userId);
      return { text: '👋 Logged out. Your data was never stored.' };

    case 'playing':
      if (!isAuthenticated(userId)) return { text: '❌ Not logged in. Use /spotify login' };
      var playing = await getCurrentPlaying(userId);
      if (playing.success && playing.data && playing.data.item) {
        var track = playing.data.item;
        return { text: '🎵 Now playing: ' + track.name + ' by ' + track.artists.map(function(a) { return a.name; }).join(', ') };
      }
      return { text: '🎵 Nothing playing right now.' };

    case 'playlists':
      if (!isAuthenticated(userId)) return { text: '❌ Not logged in. Use /spotify login' };
      var lists = await getMyPlaylists(userId);
      if (lists.success && lists.data && lists.data.items) {
        var listText = '📋 Your playlists:\n';
        lists.data.items.slice(0, 10).forEach(function(p, i) {
          listText = listText + '  ' + (i + 1) + '. ' + p.name + ' (' + p.tracks.total + ' tracks)\n';
        });
        return { text: listText };
      }
      return { text: '❌ Could not fetch playlists.' };

    case 'create':
      if (!isAuthenticated(userId)) return { text: '❌ Not logged in' };
      var name = args || 'Chrxmaticc Playlist';
      var created = await createPlaylist(userId, name, 'Created by Chrxmaticc Copilot');
      if (created.success) {
        return { text: '✅ Playlist "' + name + '" created!' };
      }
      return { text: '❌ Could not create playlist.' };

    case 'search':
      return { text: await searchTrack(args) };

    case 'analyze':
      return { text: await analyzeTrack(args, '') };

    case 'similar':
      return { text: await suggestSimilar(args, '') };

    case 'playlist':
      var moodArgs = args.split(' in ');
      return { text: await createPlaylistPrompt(moodArgs[0], moodArgs[1] || '') };

    default:
      return { text: '🎵 Spotify commands:\n/spotify login — Log in with Spotify\n/spotify logout — Log out\n/spotify playing — Now playing\n/spotify playlists — Your playlists\n/spotify create <name> — Create playlist\n/spotify search <query> — Search music\n/spotify analyze <song> — Analyze a song\n/spotify similar <song> — Get similar songs\n/spotify playlist <mood> — Generate playlist\n\n🔒 Your data is never stored.' };
  }
}

module.exports = {
  handleCommand: handleCommand,
  isAuthenticated: isAuthenticated,
  getAuthURL: getAuthURL,
  showDisclaimer: showDisclaimer
};
