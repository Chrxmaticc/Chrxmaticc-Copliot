// bot/events/messageCreate.js
// Auto-respond to messages in active Copilot conversations
module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;
    
    var chatCommand = require("../commands/chat");
    var activeConversations = chatCommand.activeConversations;
    var conversation = activeConversations.get(message.channel.id);
    
    if (!conversation) return;
    
    var content = message.content.trim();
    
    // Stop phrases
    var stopPhrases = ["bye", "goodbye", "cya", "see ya", "later", "end", "stop", "exit", "quit"];
    if (stopPhrases.includes(content.toLowerCase())) {
      activeConversations.delete(message.channel.id);
      
      if (conversation.mode === "solo") {
        await message.reply("Conversation ended. This thread will be archived.");
        await message.channel.setArchived(true).catch(() => {});
      } else {
        await message.reply("Group chat ended. Chrome demon out.");
      }
      return;
    }
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    try {
      var res = await fetch("https://chrxmaticc-copliot.vercel.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          personality: conversation.personality
        })
      });
      var data = await res.json();
      
      var useEmbeds = await getUserDisplayMode(message.client.chrx.db, message.author.id);
      
      if (useEmbeds === "embed") {
        var { EmbedBuilder } = require("discord.js");
        var embed = new EmbedBuilder()
          .setDescription(data.response)
          .setColor("#d4a574")
          .setFooter({ text: "Chrxmaticc Copilot • " + conversation.personality })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      } else {
        await message.reply(data.response);
      }
    } catch(e) {
      await message.reply("Chrome demon glitched. Try again.");
    }
  }
};

async function getUserDisplayMode(db, userId) {
  if (!db) return "text";
  try {
    var result = await db.query("SELECT display_mode FROM user_prefs WHERE user_id = $1", [userId]);
    return (result.rows[0] && result.rows[0].display_mode) || "text";
  } catch(e) {
    return "text";
  }
}
