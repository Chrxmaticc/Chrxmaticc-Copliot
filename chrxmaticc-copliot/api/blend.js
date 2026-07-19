// api/blend.js — Blend Group Chat (single endpoint for Vercel free tier)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';
  const body = req.body || {};

  try {
    switch (action) {
      case 'create': return await createRoom(req, res, body);
      case 'join':   return await joinRoom(req, res, body);
      case 'messages':
        return req.method === 'GET' ? await getMessages(req, res, req.query) : await sendMessage(req, res, body);
      case 'ai':     return await aiRespond(req, res, body);
      default:       return res.status(400).json({ error: 'Missing action. Use ?action=create|join|messages|ai' });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ═══ HELPERS ═══ */
function generateCode() {
  return 'blend-' + Math.random().toString(36).slice(2, 8);
}

/* ═══ CREATE ROOM ═══ */
async function createRoom(req, res, body) {
  const name = body.name || 'Untitled Room';
  const code = generateCode();
  const rows = await sql`
    INSERT INTO blend_rooms (name, invite_code) VALUES (${name}, ${code}) RETURNING id, invite_code
  `;
  const room = rows[0];
  res.status(200).json({ room_id: room.id, invite_code: room.invite_code, invite_link: 'https://your-domain.vercel.app/blend?join=' + room.invite_code });
}

/* ═══ JOIN ROOM ═══ */
async function joinRoom(req, res, body) {
  const code = body.invite_code || req.query.code;
  if (!code) return res.status(400).json({ error: 'Missing invite code' });
  const rows = await sql`SELECT * FROM blend_rooms WHERE invite_code = ${code} LIMIT 1`;
  if (!rows.length) return res.status(404).json({ error: 'Room not found' });
  res.status(200).json({ room: rows[0] });
}

/* ═══ GET MESSAGES ═══ */
async function getMessages(req, res, query) {
  const roomId = query.room_id;
  const after = query.after || new Date(0).toISOString();
  if (!roomId) return res.status(400).json({ error: 'Missing room_id' });
  const messages = await sql`
    SELECT * FROM blend_messages WHERE room_id = ${roomId} AND created_at > ${after} ORDER BY created_at ASC LIMIT 50
  `;
  res.status(200).json({ messages });
}

/* ═══ SEND MESSAGE ═══ */
async function sendMessage(req, res, body) {
  const { room_id, user_id, username, avatar_url, content } = body;
  if (!room_id || !content) return res.status(400).json({ error: 'Missing room_id or content' });
  const rows = await sql`
    INSERT INTO blend_messages (room_id, user_id, username, avatar_url, content, role)
    VALUES (${room_id}, ${user_id || 'anon'}, ${username || 'Guest'}, ${avatar_url || ''}, ${content}, 'user')
    RETURNING *
  `;
  res.status(200).json({ success: true, message: rows[0] });
}

/* ═══ AI RESPOND ═══ */
async function aiRespond(req, res, body) {
  const { room_id, recent_messages } = body;
  if (!room_id) return res.status(400).json({ error: 'Missing room_id' });

  const context = (recent_messages || []).map(m => (m.username || 'User') + ': ' + m.content).join('\n');
  const systemPrompt = 'You are Chrxmaticc Copilot in a group chat called Blend. Respond helpfully and keep the chaotic energy. Use lowercase. Never say "whats poppin" or "bruh".';

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_KEY
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context + '\n\nChrxmaticc (respond in character):' }
      ],
      temperature: 0.85,
      max_tokens: 500
    })
  });

  const json = await groqRes.json();
  const reply = json.choices?.[0]?.message?.content || 'yo, i got nothin.';

  // Save AI response to DB
  const rows = await sql`
    INSERT INTO blend_messages (room_id, user_id, username, content, role)
    VALUES (${room_id}, 'ai', 'Chrxmaticc', ${reply}, 'assistant')
    RETURNING *
  `;

  res.status(200).json({ response: reply, message: rows[0] });
}
