const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  if (req.method === 'GET') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.default`, { headers });
    const data = await r.json();
    const names = data[0]?.names || [];
    return res.status(200).json(names);
  }

  if (req.method === 'POST') {
    const { names } = req.body;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.default`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ names })
    });
    const data = await r.json();
    return res.status(200).json(data);
  }

  res.status(405).end();
}