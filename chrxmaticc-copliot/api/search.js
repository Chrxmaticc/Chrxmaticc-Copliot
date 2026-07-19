// api/search.js
export default async function handler(req, res) {
  const q = req.query.q || req.body.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  // DuckDuckGo Instant Answer
  const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`).then(r => r.json());
  
  // Fallback: scrape DuckDuckGo Lite for more results
  const html = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`).then(r => r.text());
  // parse result links (simple regex)
  const links = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].slice(0, 5).map(m => ({ title: m[2], url: m[1] }));

  res.json({
    answer: ddg.AbstractText || ddg.Answer || '',
    results: links
  });
}
