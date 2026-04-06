export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { image, mime } = req.body;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
            { type: 'text', text: 'この領収書から情報を読み取り、JSONのみ返してください。{"date":"YYYY-MM-DD","amount":数値,"store":"店名","category":"food/daily/rent/fun/util/trans/med/comm/other","note":"補足"}' }
          ]}]
        })
      });
      const data = await response.json();
      const text = (data.content||[]).map(b=>b.text||'').join('');
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      res.status(200).json(parsed);
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  }