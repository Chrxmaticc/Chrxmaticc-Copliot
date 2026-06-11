// api/memory.js
// Chrxmaticc Copilot — Memory API (PostgreSQL)
// Stores user facts + conversation history per user

var { Client } = require('pg');
var DB_URL = process.env.DATABASE_URL || '';

async function getDB() {
  var db = new Client({ connectionString: DB_URL });
  await db.connect();
  return db;
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.body || {};
  var action = body.action || 'get';
  var userId = body.userId || 'anonymous';
  var db;

  try {
    db = await getDB();

    // Auto-create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_memory (
        user_id TEXT PRIMARY KEY,
        facts TEXT[] DEFAULT '{}',
        history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (action === 'get') {
      var result = await db.query('SELECT * FROM user_memory WHERE user_id = $1', [userId]);
      if (result.rows.length === 0) {
        await db.query('INSERT INTO user_memory (user_id) VALUES ($1)', [userId]);
        res.status(200).json({ facts: [], history: [] });
      } else {
        res.status(200).json({
          facts: result.rows[0].facts || [],
          history: result.rows[0].history || []
        });
      }
    }

    else if (action === 'save') {
      var facts = body.facts || [];
      var history = body.history || [];
      await db.query(
        'INSERT INTO user_memory (user_id, facts, history, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id) DO UPDATE SET facts = $2, history = $3, updated_at = NOW()',
        [userId, facts, JSON.stringify(history)]
      );
      res.status(200).json({ success: true });
    }

    else if (action === 'addFact') {
      var fact = body.fact || '';
      if (!fact) { res.status(400).json({ error: 'Missing fact' }); return; }
      await db.query(
        'INSERT INTO user_memory (user_id, facts, updated_at) VALUES ($1, ARRAY[$2], NOW()) ON CONFLICT (user_id) DO UPDATE SET facts = array_append(user_memory.facts, $2), updated_at = NOW()',
        [userId, fact]
      );
      res.status(200).json({ success: true });
    }

    else if (action === 'clear') {
      await db.query('DELETE FROM user_memory WHERE user_id = $1', [userId]);
      res.status(200).json({ success: true });
    }

    else {
      res.status(400).json({ error: 'Unknown action' });
    }

  } catch(e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (db) await db.end();
  }
};
