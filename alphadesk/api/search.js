// api/search.js — Vercel Serverless Function
// Yahoo Finance 股票搜尋 (支援中文名稱)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'q required' })

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0&listsCount=0`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) throw new Error('Yahoo search error: ' + response.status)

    const data = await response.json()
    const quotes = data?.quotes || []

    const results = quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .slice(0, 5)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || '',
      }))

    return res.json(results)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
