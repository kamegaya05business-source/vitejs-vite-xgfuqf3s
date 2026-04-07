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
          { type: 'text', text: 'この領収書から情報を読み取り、JSONのみ返してください。\n{"date":"YYYY-MM-DD","amount":数値,"store":"店名","category":"food/daily/rent/fun/util/trans/med/comm/other","note":"補足"}\nカテゴリ: food=飲食, daily=日用品, trans=交通, util=光熱費, comm=通信, med=医療, fun=娯楽, rent=家賃, other=その他' }
        ]}]
      })
    });
    const data = await response.json();
    console.log('Anthropic response status:', response.status);
    console.log('Anthropic response:', JSON.stringify(data));
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }
    const text = (data.content || []).map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch(e) {
    console.error('OCR error:', e.message);
    res.status(500).json({ error: e.message });
  }
}