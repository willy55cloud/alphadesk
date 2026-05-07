// api/price.js — Vercel Serverless Function
// 後端 proxy 查詢 Yahoo Finance，解決前端 CORS 問題

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  const { symbol } = req.query
  if (!symbol) return res.status(400).json({ error: 'symbol required' })

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yahoo Finance error: ' + response.status })
    }

    const data = await response.json()
    const result = data?.chart?.result?.[0]
    if (!result) return res.status(404).json({ error: 'Stock not found: ' + symbol })

    const meta = result.meta
    const price = meta.regularMarketPrice ?? meta.previousClose
    if (!price) return res.status(404).json({ error: 'No price data' })

    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price
    const changePct = prev ? ((price - prev) / prev) * 100 : 0

    return res.json({
      symbol,
      price: parseFloat(price.toFixed(2)),
      name: meta.shortName || meta.longName || symbol,
      currency: meta.currency || (symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'TWD' : 'USD'),
      change_pct: parseFloat(changePct.toFixed(2)),
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
