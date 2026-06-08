// bot/embeds.js
// Themed embed builder for Discord bot
// Matches website themes: Gold, Midnight, Glass, Chrome, Light

var THEMES = {
  gold: { color: 0xd4a574, name: 'Gold' },
  midnight: { color: 0x1a1a2e, name: 'Midnight' },
  glass: { color: 0x8899cc, name: 'Glass' },
  chrome: { color: 0xaaaaaa, name: 'Chrome' },
  light: { color: 0x0a84ff, name: 'Light' }
};

var DEFAULT_THEME = 'gold';

function buildResponseEmbed(response, options) {
  options = options || {};
  var theme = THEMES[options.theme || DEFAULT_THEME] || THEMES.gold;
  var personality = options.personality || 'conversational';
  var provider = options.provider || 'groq';
  
  // Truncate for Discord embed limits (4096 chars for description)
  var truncated = response.length > 4000 ? response.slice(0, 3997) + '...' : response;
  
  var embed = {
    color: theme.color,
    description: truncated,
    footer: {
      text: 'Chrxmaticc Copilot • ' + personality + ' • ' + provider,
      icon_url: 'https://chrxmaticc-copliot.vercel.app/icon.png'
    },
    timestamp: new Date().toISOString()
  };
  
  return embed;
}

function buildPersonalityEmbed(currentPersonality) {
  var { getPersonalities } = require('./groq.js');
  var personalities = getPersonalities();
  var theme = THEMES.gold;
  
  var fields = personalities.map(function(p) {
    var isActive = p.id === currentPersonality;
    return {
      name: (isActive ? '▶ ' : '') + p.emoji + ' ' + p.name,
      value: p.description + (isActive ? ' *(active)*' : ''),
      inline: true
    };
  });
  
  return {
    color: theme.color,
    title: 'Chrxmaticc Copilot — Personalities',
    description: 'Switch with `/model <name>`',
    fields: fields,
    footer: {
      text: 'Currently: ' + currentPersonality,
      icon_url: 'https://chrxmaticc-copliot.vercel.app/icon.png'
    }
  };
}

function buildHelpEmbed() {
  var theme = THEMES.gold;
  
  return {
    color: theme.color,
    title: 'Chrxmaticc Copilot — Commands',
    description: 'The chrome demon on Discord. Offbrand. Hyper-intelligent.',
    fields: [
      { name: '/chat [message]', value: 'Talk to the AI. Attach files for analysis.', inline: false },
      { name: '/model [name]', value: 'Switch personality. Options: conversational, sonnet, vision, intermediate, speed', inline: false },
      { name: '/image [prompt]', value: 'Generate AI art from your description.', inline: false },
      { name: '/help', value: 'Show this command list.', inline: false }
    ],
    footer: {
      text: 'v1.2.0 • Chrome Demon Copilot',
      icon_url: 'https://chrxmaticc-copliot.vercel.app/icon.png'
    }
  };
}

module.exports = { buildResponseEmbed, buildPersonalityEmbed, buildHelpEmbed, THEMES };
