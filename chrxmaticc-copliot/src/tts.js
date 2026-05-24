// Chrxmaticc Copilot TTS Module
// Google TTS — free, no API key
// Auto-plays on generation
// Author: Chrxmee-Midnightt

var https = require('https');
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

function speak(text, lang, callback) {
  lang = lang || 'en';
  var encoded = encodeURIComponent(text.slice(0, 200));
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + lang + '&q=' + encoded;
  
  var tmpFile = path.join('/tmp', 'chrxmaticc_tts_' + Date.now() + '.mp3');
  var file = fs.createWriteStream(tmpFile);
  
  https.get(url, function(response) {
    response.pipe(file);
    
    file.on('finish', function() {
      file.close();
      
      var played = false;
      
      // Try ffplay first
      try {
        execSync('ffplay -nodisp -autoexit -loglevel quiet ' + tmpFile + ' 2>/dev/null', { timeout: 10000 });
        played = true;
      } catch (e) {}
      
      // Try mpg123
      if (!played) {
        try {
          execSync('mpg123 -q ' + tmpFile + ' 2>/dev/null', { timeout: 10000 });
          played = true;
        } catch (e) {}
      }
      
      // Try aplay (ALSA)
      if (!played) {
        try {
          execSync('ffmpeg -i ' + tmpFile + ' -f s16le -acodec pcm_s16le - 2>/dev/null | aplay -q 2>/dev/null', { timeout: 10000 });
          played = true;
        } catch (e) {}
      }
      
      // Try PowerShell on Windows
      if (!played) {
        try {
          execSync('powershell -c "(New-Object Media.SoundPlayer \\"' + tmpFile.replace(/\//g, '\\') + '\\").PlaySync()" 2>/dev/null', { timeout: 10000 });
          played = true;
        } catch (e) {}
      }
      
      // Cleanup
      try { fs.unlinkSync(tmpFile); } catch (e) {}
      
      if (callback) {
        if (played) {
          callback(null);
        } else {
          callback(new Error('No audio player found — install ffmpeg: sudo apt install ffmpeg'));
        }
      }
    });
  }).on('error', function(e) {
    try { fs.unlinkSync(tmpFile); } catch (err) {}
    if (callback) callback(e);
  });
}

function speakToFile(text, outputPath, lang, callback) {
  lang = lang || 'en';
  var encoded = encodeURIComponent(text.slice(0, 200));
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + lang + '&q=' + encoded;
  
  var file = fs.createWriteStream(outputPath);
  
  https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      if (callback) callback(null, outputPath);
    });
  }).on('error', function(e) {
    if (callback) callback(e);
  });
}

function isAvailable() {
  try {
    execSync('which ffplay 2>/dev/null || which mpg123 2>/dev/null || which aplay 2>/dev/null || which powershell 2>/dev/null');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { speak: speak, speakToFile: speakToFile, isAvailable: isAvailable };
