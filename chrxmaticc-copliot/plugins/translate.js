// Translate text between languages
module.exports = {
  name: 'translate',
  description: 'Translate text (e.g. /translate hello to spanish)',
  category: 'utility',
  run: async function(args) {
    if (!args) return 'Usage: /translate <text> to <language>';
    var parts = args.split(' to ');
    if (parts.length < 2) return 'Usage: /translate <text> to <language>';
    
    var text = parts[0].trim();
    var lang = parts[1].trim().toLowerCase();
    
    var langCodes = {
      'spanish': 'es', 'french': 'fr', 'german': 'de', 'italian': 'it',
      'portuguese': 'pt', 'russian': 'ru', 'japanese': 'ja', 'korean': 'ko',
      'chinese': 'zh', 'arabic': 'ar', 'hindi': 'hi', 'dutch': 'nl',
      'polish': 'pl', 'turkish': 'tr', 'vietnamese': 'vi', 'thai': 'th'
    };
    
    var code = langCodes[lang] || lang;
    var https = require('https');
    
    return new Promise(function(resolve) {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + code + '&dt=t&q=' + encodeURIComponent(text);
      https.get(url, function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() {
          try {
            var json = JSON.parse(body);
            var translated = json[0][0][0];
            resolve('🌐 ' + translated);
          } catch (e) { resolve('Translation failed'); }
        });
      }).on('error', function() { resolve('Network error'); });
    });
  }
};
