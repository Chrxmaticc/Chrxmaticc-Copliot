// Chrxmaticc Copilot TTS Module
// Uses Google TTS — free, no API key
// Author: Chrxmee-Midnightt

var https = require('https');
var fs = require('fs');
var path = require('path');
var { execSync } = require('child_process');

var GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';

function speak(text, lang, callback) {
  lang = lang || 'en';
  var encoded = encodeURIComponent(text.slice(0, 200));
  var url = GOOGLE_TTS_URL + '?ie=UTF-8&client=tw-ob&tl=' + lang + '&q=' + encoded;
  
  var tmpFile = path.join('/tmp', 'chrxmaticc_tts_' + Date.now() + '.mp3');
  var file = fs.createWriteStream(tmpFile);
  
  https.get(url, function(response) {
    response.pipe(file);
    
    file.on('finish', function() {
      file.close();
      
      try {
        execSync('ffplay -nodisp -autoexit -loglevel quiet ' + tmpFile);
      } catch (e) {
        try {
          execSync('mpg123 -q ' + tmpFile);
        } catch (e2) {
          try {
            execSync('ffplay -nodisp -autoexit -loglevel quiet ' + tmpFile);
          } catch (e3) {
            if (callback) callback(new Error('No audio player found'));
            return;
          }
        }
      }
      
      fs.unlinkSync(tmpFile);
      if (callback) callback(null);
    });
  }).on('error', function(e) {
    if (callback) callback(e);
  });
}

function speakToFile(text, outputPath, lang, callback) {
  lang = lang || 'en';
  var encoded = encodeURIComponent(text.slice(0, 200));
  var url = GOOGLE_TTS_URL + '?ie=UTF-8&client=tw-ob&tl=' + lang + '&q=' + encoded;
  
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
  return true;
}

module.exports = { speak: speak, speakToFile: speakToFile, isAvailable: isAvailable };
