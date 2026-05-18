// Chrxmaticc Copilot — Voice Engine
// Combines STT (input) + Chat (processing) + TTS (output)
// Author: Chrxmee-Midnightt

var stt = require('./stt');
var tts = require('./tts');
var chat = require('./chat');
var chalk = require('chalk');

function voiceChat(rl, callback) {
  console.log('');
  console.log('  ' + chalk.magenta('🎤 Listening... (5 seconds)'));
  console.log('');
  
  stt.listenFromMic(function(err, text) {
    if (err || !text) {
      console.log('  ' + chalk.red('✗ ' + (err || 'No speech detected')));
      console.log('');
      if (callback) callback('voice_failed');
      return;
    }
    
    console.log('  ' + chalk.cyan('you > ') + text);
    console.log('');
    
    chat.getResponse(text).then(function(response) {
      var responseText = typeof response === 'string' ? response : response.text;
      
      console.log('  ' + chalk.magenta('chrxmaticc > ') + responseText);
      console.log('');
      
      tts.speak(responseText, 'en', function() {
        if (callback) callback('voice_done');
      });
    });
  });
}

function processVoiceMessage(audioBuffer, userId, callback) {
  var fs = require('fs');
  var path = require('path');
  var tmpFile = path.join('/tmp', 'chrxmaticc_discord_' + userId + '_' + Date.now() + '.wav');
  
  fs.writeFileSync(tmpFile, audioBuffer);
  
  stt.transcribeFile(tmpFile, function(err, text) {
    if (err || !text) {
      fs.unlinkSync(tmpFile);
      if (callback) callback('voice_failed', null);
      return;
    }
    
    var multiChat = require('./multi-user-chat');
    multiChat.getResponse(text, userId).then(function(response) {
      var responseText = typeof response === 'string' ? response : response.text;
      if (callback) callback(null, { text: responseText, userText: text });
    });
  });
}

module.exports = {
  voiceChat: voiceChat,
  processVoiceMessage: processVoiceMessage
};
