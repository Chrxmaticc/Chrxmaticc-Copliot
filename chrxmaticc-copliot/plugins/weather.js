// Get weather for any city
module.exports = {
  name: 'weather',
  description: 'Get weather for a city',
  category: 'utility',
  run: async function(args) {
    if (!args) return 'Usage: /weather <city>';
    var https = require('https');
    return new Promise(function(resolve) {
      https.get('https://wttr.in/' + encodeURIComponent(args) + '?format=3', function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() { resolve('🌤️ ' + body.trim()); });
      }).on('error', function() { resolve('Could not fetch weather'); });
    });
  }
};
