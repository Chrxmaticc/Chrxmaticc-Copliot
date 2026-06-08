// bot/index.js
// Chrxmaticc Copilot Discord Bot
// Uses chrxmaticc-framework — the chrome demon's own framework

require("dotenv").config();
const { ChrxClient } = require("chrxmaticc-framework");
const path = require("path");

const bot = new ChrxClient({
  token: process.env.BOT_TOKEN,
  commandsPath: path.join(__dirname, "commands"),
  eventsPath: path.join(__dirname, "events"),
  modules: {
    ai: {
      endpoint: "https://chrxmaticc-copliot.vercel.app/api/chat",
      defaultPersonality: "conversational"
    },
    music: false,
    xp: false,
    database: false
  }
});

bot.start();
