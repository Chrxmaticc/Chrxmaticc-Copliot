// Chrxmaticc Copilot — Personal Profile API
// Stores username, display name, bio, avatar, personal info
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');
var PROFILES_FILE = path.join('/tmp', 'chrxmaticc-profiles.json');

function load() {
  try { if (fs.existsSync(PROFILES_FILE)) return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8')); } catch (e) {}
  return {};
}

function save(data) { fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2)); }

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var profiles = load();
  var userId = (req.body && req.body.userId) || 'anonymous';

  // GET — return profile
  if (req.method === 'GET') {
    var profile = profiles[userId] || {
      username: userId,
      displayName: userId,
      bio: '',
      avatar: '🧠',
      personalInfo: '',
      securityQuestion: '',
      securityAnswer: ''
    };
    return res.status(200).json(profile);
  }

  // POST — update profile
  if (req.method === 'POST') {
    var { username, displayName, bio, avatar, personalInfo, securityQuestion, securityAnswer } = req.body || {};
    
    if (!profiles[userId]) profiles[userId] = {};
    
    if (username !== undefined) profiles[userId].username = username;
    if (displayName !== undefined) profiles[userId].displayName = displayName;
    if (bio !== undefined) profiles[userId].bio = bio;
    if (avatar !== undefined) profiles[userId].avatar = avatar;
    if (personalInfo !== undefined) profiles[userId].personalInfo = personalInfo;
    if (securityQuestion !== undefined) profiles[userId].securityQuestion = securityQuestion;
    if (securityAnswer !== undefined) profiles[userId].securityAnswer = securityAnswer;
    
    profiles[userId].updatedAt = Date.now();
    save(profiles);
    
    return res.status(200).json(profiles[userId]);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
