/* ═══════════════════════════════════════════
   chrx-emoji.js — Custom Emoji Parser v1.0
   All 8 assets render inline everywhere
   ═══════════════════════════════════════════ */

var CUSTOM_EMOJIS = {
  ':geto:':    { src: '1525658200622239756.webp', alt: 'geto blank chibi' },
  ':bee:':     { src: 'IMG_9413.gif',              alt: 'minecraft bee flying' },
  ':fire:':    { src: '267042-fire.gif',           alt: 'flowing fire' },
  ':python:':  { src: 'IMG_9412.png',              alt: 'python logo' },
  ':file:':    { src: '7925-file.png',             alt: 'file icon' },
  ':folder:':  { src: '9583-folder.png',           alt: 'folder icon' },
  ':computer:':{ src: '563897-computer.png',       alt: 'computer icon' },
  ':compass:': { src: '433238-discover-compass.png', alt: 'compass icon' }
};

var EMOJI_REGEX = /:geto:|:bee:|:fire:|:python:|:file:|:folder:|:computer:|:compass:/g;

function parseCustomEmojis(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text.replace(EMOJI_REGEX, function(match) {
    var emoji = CUSTOM_EMOJIS[match];
    if (!emoji) return match;
    var isGif = emoji.src.endsWith('.gif');
    var cls = 'custom-emoji' + (isGif ? ' emoji-gif' : '');
    return '<img src="' + emoji.src + '" alt="' + emoji.alt + '" class="' + cls + '" draggable="false" loading="lazy">';
  });
}

function getRandomEmoji() {
  var keys = Object.keys(CUSTOM_EMOJIS);
  var key = keys[Math.floor(Math.random() * keys.length)];
  return key;
}

function getEmojiHTML(key) {
  var emoji = CUSTOM_EMOJIS[key];
  if (!emoji) return '';
  var isGif = emoji.src.endsWith('.gif');
  var cls = 'custom-emoji' + (isGif ? ' emoji-gif' : '');
  return '<img src="' + emoji.src + '" alt="' + emoji.alt + '" class="' + cls + '" draggable="false" loading="lazy">';
}

console.log(':geto: chrx-emoji.js loaded — 8 custom emojis registered :bee:');
