// bot/events/ready.js
module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log("Chrxmaticc Copilot online — " + client.user.tag);
    client.user.setActivity("the chrome demon", { type: "WATCHING" });
    
    // Create user_prefs table if it doesn't exist
    if (client.chrx.db) {
      client.chrx.db.query(`
        CREATE TABLE IF NOT EXISTS user_prefs (
          user_id TEXT PRIMARY KEY,
          personality TEXT DEFAULT 'conversational',
          display_mode TEXT DEFAULT 'text',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `).then(() => console.log("[DB] user_prefs table ready")).catch(() => {});
    }
  }
};
