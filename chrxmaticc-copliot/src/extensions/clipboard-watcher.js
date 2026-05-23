var chalk = require('chalk');
// Chrxmaticc Copilot — Clipboard Watcher
// Watches clipboard for errors, auto-suggests fixes
// Author: Chrxmee-Midnightt

var chat = require('../chat');
var chalk = require('chalk');
var lastClip = '';

function startWatcher(intervalMs) {
  intervalMs = intervalMs || 3000;
  
  console.log('');
  console.log('  ' + chalk.magenta('📋 Clipboard Watcher started'));
  console.log('  ' + chalk.gray('Copy an error message and I\'ll suggest a fix'));
  console.log('');
  
  setInterval(function() {
    var clipboardy;
    try {
      clipboardy = require('clipboardy');
    } catch (e) {
      console.log('  ' + chalk.gray('Install clipboardy: npm install clipboardy'));
      return;
    }
    
    try {
      var currentClip = clipboardy.readSync();
      
      if (currentClip && currentClip !== lastClip && currentClip.length > 10) {
        lastClip = currentClip;
        
        if (isError(currentClip)) {
          console.log('  ' + chalk.red('✗ Error detected in clipboard!'));
          console.log('  ' + chalk.gray('Analyzing...'));
          
          chat.getResponse('I copied this error. What does it mean and how do I fix it? Give me a direct answer.\n\n' + currentClip.slice(0, 1000))
            .then(function(response) {
              var text = typeof response === 'string' ? response : response.text;
              console.log('  ' + chalk.magenta('chrxmaticc > ') + text);
              console.log('');
            });
        }
      }
    } catch (e) {}
  }, intervalMs);
}

function isError(text) {
  var errorPatterns = [
    'error', 'Error', 'ERROR',
    'TypeError', 'ReferenceError', 'SyntaxError',
    'cannot find', 'is not defined', 'is not a function',
    'failed to', 'unable to', 'permission denied',
    'ENOENT', 'EACCES', 'ECONNREFUSED',
    'fatal', 'traceback', 'stack trace',
    'undefined is not', 'null is not'
  ];
  
  for (var i = 0; i < errorPatterns.length; i++) {
    if (text.indexOf(errorPatterns[i]) !== -1) return true;
  }
  return false;
}

module.exports = { startWatcher: startWatcher };
