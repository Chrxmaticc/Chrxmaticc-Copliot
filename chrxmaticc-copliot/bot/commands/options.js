// bot/commands/options.js
// /options — Set display mode (text or embed)
const { ChrxCommandBuilder } = require("chrxmaticc-framework");

module.exports = new ChrxCommandBuilder({
  name: "options",
  description: "Choose how Copilot displays responses to you",
  options: [
    {
      name: "mode",
      description: "Plain text or premium embeds",
      type: "string",
      required: true,
      choices: [
        { name: "Text", value: "text" },
        { name: "Embed", value: "embed" }
      ]
    }
  ],
  async run(interaction) {
    var mode = interaction.options.getString("mode");
    var db = interaction.client.chrx.db;
    
    if (db) {
      await db.query(
        "INSERT INTO user_prefs (user_id, display_mode) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET display_mode = $2",
        [interaction.user.id, mode]
      );
    }
    
    var label = mode === "embed" ? "Premium Embeds" : "Plain Text";
    await interaction.reply({
      content: "Display mode set to **" + label + "**.",
      ephemeral: true
    });
  }
});
