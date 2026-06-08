// bot/commands/model.js
// /model — Switch personality (stored in DB)
const { ChrxCommandBuilder } = require("chrxmaticc-framework");

var PERSONALITIES = [
  { name: "Conversational", value: "conversational", description: "Balanced, casual, helpful" },
  { name: "Sonnet", value: "sonnet", description: "Expert programmer, detailed code answers" },
  { name: "Vision", value: "vision", description: "Creative, imaginative, visual thinking" },
  { name: "Intermediate", value: "intermediate", description: "Fast, solid mid-tier responses" },
  { name: "Speed", value: "speed", description: "Quick, punchy, no fluff" }
];

module.exports = new ChrxCommandBuilder({
  name: "model",
  description: "Switch your default AI personality",
  options: [
    {
      name: "type",
      description: "Choose a personality",
      type: "string",
      required: true,
      choices: PERSONALITIES.map(function(p) { return { name: p.name, value: p.value }; })
    }
  ],
  async run(interaction) {
    var type = interaction.options.getString("type");
    var selected = PERSONALITIES.find(function(p) { return p.value === type; });
    if (!selected) return interaction.reply({ content: "Unknown personality.", ephemeral: true });
    
    var db = interaction.client.chrx.db;
    if (db) {
      await db.query(
        "INSERT INTO user_prefs (user_id, personality) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET personality = $2",
        [interaction.user.id, type]
      );
    }
    
    await interaction.reply({
      content: "Personality set to **" + selected.name + "**\n> " + selected.description,
      ephemeral: true
    });
  }
});
