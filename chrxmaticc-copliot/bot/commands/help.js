// bot/commands/help.js
// /help — Command list
const { ChrxCommandBuilder } = require("chrxmaticc-framework");

module.exports = new ChrxCommandBuilder({
  name: "help",
  description: "Chrxmaticc Copilot commands",
  async run(interaction) {
    await interaction.reply({
      content: [
        "**Chrxmaticc Copilot — Commands**",
        "",
        "**/chat [solo/group] [personality]** — Start a conversation",
        "**/model [type]** — Set default personality",
        "**/options [text/embed]** — Choose display format",
        "**/help** — This list",
        "",
        "In chat, say **bye** to end the conversation.",
        "Offbrand. Hyper-intelligent. No subscription."
      ].join("\n"),
      ephemeral: true
    });
  }
});
