# Chrxmaticc Copilot v1.0.0
<table>
  <tr>
    <td>
      <img src="./chrxmaticc-copliot/public/icon.png" alt="Chrxmaticc Copilot Icon">
    </td>
  </tr>
</table>


**Offbrand Terminal AI — Hyper-Intelligent. No Subscription.**

> "i'm like GitHub Copilot but i actually understand GLSL and i don't try to sell you subscriptions"

---
## Star History

<a href="https://www.star-history.com/?repos=Chrxmaticc%2FChrxmaticc-Copliot&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Chrxmee-Bits/Chrxmaticc-Copliot&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Chrxmee-Bits/Chrxmaticc-Copliot&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Chrxmee-Bits/Chrxmaticc-Copliot&type=date&legend=top-left" />
 </picture>
</a>

## What is Chrxmaticc Copilot?

A free, open-source terminal AI assistant. Talks about code, shaders, audio, video, and whatever you want. Dual AI providers with automatic failover. Voice input/output. Spotify integration. Plugin system. Persistent memory. All local. All free.

---

## Install
```bash
npm install -g chrxmaticc-copilot
```
Or run without installing:
```bash
npx chrxmaticc-copilot
```
---

## Quick Start
```md
chrxmaticc-copilot              Start interactive chat
chrxmaticc-copilot --ask "what is ray marching?"   Single question
chrxmaticc-copilot --idea       Get a creative shader idea
chrxmaticc-copilot --credits    Show credits
```
---

## AI Providers

| Provider | Role | Key Required |
|----------|------|-------------|
| Pollinations AI | Primary | No |
| Groq (Llama 3 8B) | Fallback | Yes (free tier) |
| personality.js | Offline | Never |

Automatic failover: Pollinations → Groq → Offline. Never down.

---

## Commands
```bash
/voice              Talk with microphone
/speak <text>       TTS speaks out loud
/mute / /unmute     Toggle TTS
/run <command>      Execute terminal commands safely
/roll 2d20          Roll dice
/8ball <question>   Magic 8-ball
/save               Save chat to file
/clear              Clear conversation history
/provider           Show current AI provider and stats
/clipboard on       Watch clipboard for errors, auto-suggest fixes
/complete <cmd>     Auto-complete terminal commands
/review <code>      AI code review
/sys                System monitor (CPU, RAM, uptime)
/passwd <length>    Generate secure password
/qr <text>          Generate QR code in terminal
/color #ff0000      Preview a color
/help               Show all commands
/exit               Quit
```
---

## Spotify Commands
```bash
/spotify login          Log in with Spotify (OAuth, no password stored)
/spotify callback <url> Complete authentication
/spotify playing        Show currently playing track
/spotify playlists      List your playlists
/spotify create <name>  Create a new playlist
/spotify search <query> Search for music
/spotify logout         Log out (session cleared)
/song <track> - <artist> AI analyzes a song
/similar <track>        Get similar song suggestions
/playlist <mood>        AI generates a playlist
```
🔒 Your data is never stored. Credentials go directly to Spotify via OAuth.

---

## Plugin System

Drop .js files in ~/.chrxmaticc/plugins/ and they auto-load.

### Built-in Plugins
```bash
/weather <city>         Instant weather (wttr.in)
/crypto <coin>          Live crypto prices (CoinGecko)
/translate <text> to <lang>  Google Translate
/github <username>      GitHub profile stats
/focus <minutes>        Pomodoro timer with TTS alerts
```
### Create Your Own

// plugins/mycommand.js
```js
module.exports = {
  name: 'mycommand',
  description: 'What it does',
  category: 'custom',
  run: async function(args, context) {
    return 'Hello from my plugin! You said: ' + args;
  }
};
```
Drop it in the folder. Restart copilot. It auto-loads.

---

## Persistent Memory

All conversations saved to ~/.chrxmaticc/conversations.json. Survives reboots. No database needed.
```bash
/memory               Show memory stats
/memory recall <query> Search past conversations
```
---

## Secret Commands
```bash
/easter         Easter eggs
/midnight       Midnight mode
/vault          The vault
/ping           Latency check
/credits        Author credits
/matrix         The Matrix
```
---

## API Server

Start the HTTP API:
```bash
node bin/server.js
```
Endpoints:

POST /chat           Single-user chat
POST /multi-chat     Multi-user with isolated memory
POST /voice          Process voice messages
GET  /health         Server status
GET  /dashboard      Web chat interface

### API Keys

| Key | Tier | Rate Limit |
|-----|------|-----------|
| chrxmaticc_public | Public | 10 req/min |
| (your custom key) | Master | 100 req/min |

Set master key: export CHRXMATICC_MASTER_KEY="your-secret-key"

---

## Desktop Executables

Standalone binaries. No Node.js required.

executables/
├── chrxmaticc-copilot.exe       (Windows)
├── chrxmaticc-copilot-macos     (macOS)
└── chrxmaticc-copilot-linux     (Linux)

Build: npm run build

---

## Tech Stack

- AI: Pollinations AI + Groq (Llama 3 8B)
- Voice: Google TTS + STT
- Spotify: OAuth + Web API
- Memory: JSON (zero dependencies)
- Plugins: Dynamic require()
- Executables: pkg (Node.js bundler)

---

## File Structure

chrxmaticc-copilot/
├── bin/
│   ├── copilot.js              CLI entry
│   └── server.js               API server entry
├── src/
│   ├── chat.js                 Single-user chat engine
│   ├── multi-user-chat.js      Multi-user chat engine
│   ├── personality.js          Personality module
│   ├── tts.js                  Text-to-speech
│   ├── stt.js                  Speech-to-text
│   ├── voice.js                Voice engine
│   ├── memory.js               Persistent memory
│   ├── plugin-engine.js        Plugin system
│   ├── discord.js              Discord integration
│   ├── apis/
│   │   ├── pollinations.js     Primary AI provider
│   │   ├── groq.js             Fallback AI provider
│   │   └── server.js           HTTP API server
│   └── extensions/
│       ├── clipboard-watcher.js
│       ├── terminal-hook.js
│       ├── code-review.js
│       └── spotify.js
├── executables/                 Desktop binaries
├── package.json
└── README.md

---

## Author

**Chrxmee-Midnightt**

---

## License

MIT — Offbrand. Unlicensed vibes. Do whatever you want.

---

<table>
  <tr>
    <td>
      <img src="./chrxmaticc-copliot/public/chrome.gif" alt="Framed GIF">
    </td>
  </tr>
</table>
