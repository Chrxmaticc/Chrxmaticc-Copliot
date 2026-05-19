// Pomodoro timer with focus mode
// Locks you in for 25 minutes. TTS alerts. Tracks sessions.
var fs = require('fs');
var path = require('path');
var activeTimer = null;
var sessionsToday = 0;
var SESSION_FILE = path.join(process.env.HOME || '/tmp', '.chrxmaticc-focus-sessions');

if (fs.existsSync(SESSION_FILE)) {
  try { sessionsToday = parseInt(fs.readFileSync(SESSION_FILE, 'utf8')) || 0; } catch (e) {}
}

module.exports = {
  name: 'focus',
  description: 'Start a 25-min focus session with TTS alerts',
  category: 'productivity',
  run: async function(args, context) {
    if (args === 'stop') {
      if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
      return '⏹️ Focus session stopped. ' + sessionsToday + ' sessions today.';
    }
    
    if (args === 'stats') {
      return '📊 ' + sessionsToday + ' focus sessions completed today. Total focus time: ' + (sessionsToday * 25) + ' minutes.';
    }
    
    if (activeTimer) return '⏳ Focus session already running. /focus stop to cancel.';
    
    var duration = parseInt(args) || 25;
    var remaining = duration * 60;
    
    activeTimer = setInterval(function() {
      remaining = remaining - 1;
      if (remaining <= 0) {
        clearInterval(activeTimer);
        activeTimer = null;
        sessionsToday = sessionsToday + 1;
        fs.writeFileSync(SESSION_FILE, String(sessionsToday));
        
        try {
          var tts = require('../tts');
          tts.speak('Focus session complete. Take a 5 minute break.', 'en');
        } catch (e) {}
        
        console.log('\n  ✅ Focus session complete! ' + sessionsToday + ' sessions today. Take a break.\n');
      }
    }, 1000);
    
    try {
      var tts = require('../tts');
      tts.speak('Starting ' + duration + ' minute focus session. No distractions.', 'en');
    } catch (e) {}
    
    return '🎯 Focus session started! ' + duration + ' minutes. No distractions. TTS will alert when done.\n   /focus stop — cancel | /focus stats — view progress';
  }
};
