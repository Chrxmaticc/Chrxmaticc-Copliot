// Chrxmaticc Copilot — Speech-to-Text Module
// Uses free Google Speech API (no key)
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');

function listenFromMic(callback) {
  var tmpFile = path.join('/tmp', 'chrxmaticc_mic_' + Date.now() + '.wav');
  
  try {
    execSync('arecord -d 5 -f cd -t wav ' + tmpFile + ' 2>/dev/null || sox -d -t wav ' + tmpFile + ' trim 0 5 2>/dev/null || ffmpeg -f avfoundation -i :0 -t 5 ' + tmpFile + ' 2>/dev/null', { timeout: 10000 });
    transcribe(tmpFile, callback);
  } catch (e) {
    if (callback) callback('No microphone found or recording failed', null);
  }
}

function transcribe(audioPath, callback) {
  var https = require('https');
  var audioData = fs.readFileSync(audioPath);
  var base64 = audioData.toString('base64');
  
  var data = JSON.stringify({
    audio: base64,
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US'
  });

  var options = {
    hostname: 'www.google.com',
    path: '/speech-api/v1/recognize?lang=en-us&client=chromium',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: 10000
  };

  var req = https.request(options, function(res) {
    var body = '';
    res.on('data', function(chunk) { body = body + chunk; });
    res.on('end', function() {
      try {
        var json = JSON.parse(body);
        var text = json.hypotheses && json.hypotheses[0] && json.hypotheses[0].utterance;
        fs.unlinkSync(audioPath);
        if (callback) callback(null, text || '');
      } catch (e) {
        fs.unlinkSync(audioPath);
        if (callback) callback('Speech recognition failed', null);
      }
    });
  });

  req.on('error', function() {
    fs.unlinkSync(audioPath);
    if (callback) callback('Network error', null);
  });
  
  req.write(data);
  req.end();
}

function transcribeFile(audioPath, callback) {
  transcribe(audioPath, callback);
}

function isAvailable() {
  try {
    execSync('which arecord 2>/dev/null || which sox 2>/dev/null || which ffmpeg 2>/dev/null');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  listenFromMic: listenFromMic,
  transcribeFile: transcribeFile,
  isAvailable: isAvailable
};
