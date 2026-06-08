// bot/commands/chat.js
// /chat — Solo or Group conversation with the chrome demon
const { ChrxCommandBuilder } = require("chrxmaticc-framework");
const { SlashCommandBuilder, ChannelType } = require("discord.js");

// Active conversations — channelId -> { personality, mode }
var activeConversations = new Map();

module.exports = new ChrxCommandBuilder({
  name: "chat",
  description: "Start a conversation with the chrome demon",
  options: [
    {
      name: "mode",
      description: "Solo (private thread) or Group (channel-wide)",
      type: "string",
      required: true,
      choices: [
        { name: "Solo", value: "solo" },
        { name: "Group", value: "group" }
      ]
    },
    {
      name: "personality",
      description: "AI personality for this conversation",
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
    var mode = interaction.options.getString("mode");
    var personality = interaction.options.getString("personality") || "conversational";
    var userId = interaction.user.id;
    
    // Get user preferences from DB
    var prefs = await getUserPrefs(interaction.client.chrx.db, userId);
    
    if (mode === "solo") {
      // Create a private thread
      var thread = await interaction.channel.threads.create({
        name: "copilot-" + interaction.user.username,
        type: ChannelType.PrivateThread,
        reason: "Chrxmaticc Copilot solo chat"
      });
      
      await thread.members.add(userId);
      activeConversations.set(thread.id, { personality: personality, mode: "solo", userId: userId });
      
      await interaction.reply({
        content: "Solo chat started in " + thread.toString() + "\nPersonality: **" + personality + "**\nSay **bye** to end the conversation.",
        ephemeral: true
      });
      
      // Send first message in thread
      await thread.send("Chrome demon online. What's on your mind?");
      
    } else if (mode === "group") {
      // Activate channel-wide conversation
      activeConversations.set(interaction.channel.id, { personality: personality, mode: "group", userId: null });
      
      await interaction.reply({
        content: "**Group chat activated**\nPersonality: **" + personality + "**\nThe chrome demon will respond to messages in this channel.\nSay **bye** to stop.",
      });
    }
  }
});

// ── Database helpers ──
async function getUserPrefs(db, userId) {
  if (!db) return {};
  try {
    var result = await db.query("SELECT * FROM user_prefs WHERE user_id = $1", [userId]);
    return result.rows[0] || {};
  } catch(e) {
    return {};
  }
}

// ── Export for event handler ──
module.exports.activeConversations = activeConversations;
