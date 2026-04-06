const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function query(sql, params = []) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({ query: sql, params })
  });
  return res.json();
}

export default async function handler(req, res) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  if (req.method === 'GET') {
    const { key } = req.query;
    const url = `${SUPABASE_URL}/rest/v1/expenses?key=eq.${encodeURIComponent(key)}&order=created_at.asc`;
    const r = await fetch(url, { headers });
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const url = `${SUPABASE_URL}/rest/v1/expenses`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    const url = `${SUPABASE_URL}/rest/v1/expenses?id=eq.${id}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const url = `${SUPABASE_URL}/rest/v1/expenses?id=eq.${id}`;
    const r = await fetch(url, { method: 'DELETE', headers });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}