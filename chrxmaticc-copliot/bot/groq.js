// bot/groq.js — shared Groq caller for Discord bot
async function getCopilotResponse(message, personality) {
  var res = await fetch('https://chrxmaticc-copliot.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message, personality: personality || 'conversational' })
  });
  var data = await res.json();
  return data.response || 'Chrome demon is thinking...';
}
