// bot/commands/ask.js
// /ask — One-shot question, no conversation started
const { ChrxCommandBuilder } = require("chrxmaticc-framework");

module.exports = new ChrxCommandBuilder({
  name: "ask",
  description: "Ask the chrome demon a single question",
  cooldown: 2,
  options: [
    {
      name: "question",
      description: "Your question",
      type: "string",
      required: true
    },
    {
      name: "personality",
      description: "AI personality for this question",
      type: "string",
      required: false,
      choices: [
        { name: "Conversational", value: "conversational" },
        { name: "Sonnet", value: "sonnet" },
        { name: "Vision", value: "vision" },
        { name: "Intermediate", value: "intermediate" },
        { name: "Speed", value: "speed" }
      ]
    }
  ],
  async run(interaction) {
    await interaction.deferReply();
    
    var question = interaction.options.getString("question");
    var personality = interaction.options.getString("personality") || "conversational";
    
    try {
      var res = await fetch("https://chrxmaticc-copliot.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, personality: personality })
      });
      var data = await res.json();
      
      var db = interaction.client.chrx.db;
      var useEmbeds = "text";
      if (db) {
        try {
          var result = await db.query("SELECT display_mode FROM user_prefs WHERE user_id = $1", [interaction.user.id]);
          useEmbeds = (result.rows[0] && result.rows[0].display_mode) || "text";
        } catch(e) {}
      }
      
      if (useEmbeds === "embed") {
        var { EmbedBuilder } = require("discord.js");
        var embed = new EmbedBuilder()
          .setDescription(data.response)
          .setColor("#d4a574")
          .setFooter({ text: "Chrxmaticc Copilot • " + personality + " • " + (data.provider || "groq") })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(data.response);
      }
    } catch(e) {
      await interaction.editReply("Chrome demon is offline. Try again.");
    }
  }
});
