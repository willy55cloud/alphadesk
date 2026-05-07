// 股票名稱查詢 + 即時股價（使用 Yahoo Finance 公開 API）

function toYahooSymbol(raw) {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (/^\d{4}$/.test(s)) return s + '.TW'
  if (/^\d{5}$/.test(s)) return s + '.TWO'
  return s
}

// Yahoo Finance via Vercel serverless proxy (避免 CORS)
export async function fetchYahooPrice(rawSymbol) {
  const ysym = toYahooSymbol(rawSymbol)
  try {
    // 使用 /api/price Vercel serverless function
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(ysym)}`, {
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data // { price, name, currency, change_pct, symbol }
  } catch (e) {
    console.error('fetchYahooPrice:', e)
    return null
  }
}

// 用 Yahoo Finance 搜尋功能查詢中文名稱 → ticker
export async function searchSymbol(query) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json() // [{ symbol, name }]
  } catch (e) {
    console.error('searchSymbol:', e)
    return []
  }
}
