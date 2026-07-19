// api/blend.js — Blend Group Chat (using DATABASE_URL)
var { Client } = require('pg');
var DB_URL = process.env.DATABASE_URL || '';

async function getDB() {
  var db = new Client({ connectionString: DB_URL });
  await db.connect();
  return db;
}

function generateCode() {
  return 'blend-' + Math.random().toString(36).slice(2, 8);
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var action = req.query.action || '';
  var body = req.body || {};

  try {
    if (action === 'create') {
      var db = await getDB();
      try {
        var name = body.name || 'Untitled Room';
        var code = generateCode();
        var result = await db.query('INSERT INTO blend_rooms (name, invite_code) VALUES ($1, $2) RETURNING id, invite_code', [name, code]);
        var room = result.rows[0];
        res.status(200).json({ room_id: room.id, invite_code: room.invite_code, invite_link: 'https://YOUR_DOMAIN.vercel.app/blend?join=' + room.invite_code });
      } finally { await db.end(); }
    }

    else if (action === 'join') {
      var db = await getDB();
      try {
        var code = body.invite_code || req.query.code;
        if (!code) return res.status(400).json({ error: 'Missing invite code' });
        var result = await db.query('SELECT * FROM blend_rooms WHERE invite_code = $1 LIMIT 1', [code]);
        if (!result.rows.length) return res.status(404).json({ error: 'Room not found' });
        res.status(200).json({ room: result.rows[0] });
      } finally { await db.end(); }
    }

    else if (action === 'messages') {
      if (req.method === 'GET') {
        var db = await getDB();
        try {
          var roomId = req.query.room_id;
          var after = req.query.after || new Date(0).toISOString();
          if (!roomId) return res.status(400).json({ error: 'Missing room_id' });
          var result = await db.query('SELECT * FROM blend_messages WHERE room_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 50', [roomId, after]);
          res.status(200).json({ messages: result.rows });
        } finally { await db.end(); }
      } else {
        var db = await getDB();
        try {
          var { room_id, user_id, username, avatar_url, content } = body;
          if (!room_id || !content) return res.status(400).json({ error: 'Missing room_id or content' });
          var result = await db.query('INSERT INTO blend_messages (room_id, user_id, username, avatar_url, content, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [room_id, user_id || 'anon', username || 'Guest', avatar_url || '', content, 'user']);
          res.status(200).json({ success: true, message: result.rows[0] });
        } finally { await db.end(); }
      }
    }

    else if (action === 'ai') {
      var db = await getDB();
      try {
        var { room_id, recent_messages } = body;
        if (!room_id) return res.status(400).json({ error: 'Missing room_id' });
        var context = (recent_messages || []).map(function(m) { return (m.username || 'User') + ': ' + m.content; }).join('\n');
        var systemPrompt = 'You are Chrxmaticc Copilot in a group chat called Blend. Respond helpfully and keep the chaotic energy. Use lowercase. Never say "whats poppin" or "bruh".';
        var groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.GROQ_KEY },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: context + '\n\nChrxmaticc (respond in character):' }], temperature: 0.85, max_tokens: 500 })
        });
        var json = await groqRes.json();
        var reply = json.choices?.[0]?.message?.content || 'yo, i got nothin.';
        var result = await db.query('INSERT INTO blend_messages (room_id, user_id, username, content, role) VALUES ($1, $2, $3, $4, $5) RETURNING *', [room_id, 'ai', 'Chrxmaticc', reply, 'assistant']);
        res.status(200).json({ response: reply, message: result.rows[0] });
      } finally { await db.end(); }
    }

    else {
      res.status(400).json({ error: 'Missing action. Use ?action=create|join|messages|ai' });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
