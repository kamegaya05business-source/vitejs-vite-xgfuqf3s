const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  if (req.method === 'GET') {
    const url = `${SUPABASE_URL}/rest/v1/events?order=created_at.asc`;
    const r = await fetch(url, { headers });
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const url = `${SUPABASE_URL}/rest/v1/events`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const url = `${SUPABASE_URL}/rest/v1/events?id=eq.${id}`;
    const r = await fetch(url, { method: 'DELETE', headers });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}