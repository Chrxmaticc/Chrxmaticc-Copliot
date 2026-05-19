// Live cryptocurrency prices
module.exports = {
  name: 'crypto',
  description: 'Get crypto price (bitcoin, ethereum, etc)',
  category: 'finance',
  run: async function(args) {
    var coin = (args || 'bitcoin').toLowerCase();
    var https = require('https');
    return new Promise(function(resolve) {
      https.get('https://api.coingecko.com/api/v3/simple/price?ids=' + coin + '&vs_currencies=usd', function(res) {
        var body = '';
        res.on('data', function(c) { body += c; });
        res.on('end', function() {
          try {
            var json = JSON.parse(body);
            if (json[coin]) resolve('💰 ' + coin + ': $' + json[coin].usd);
            else resolve('Coin not found. Try: bitcoin, ethereum, dogecoin');
          } catch (e) { resolve('Error fetching price'); }
        });
      }).on('error', function() { resolve('Network error'); });
    });
  }
};
