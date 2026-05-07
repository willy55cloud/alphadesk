import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribePortfolios, savePortfolios } from './firebase.js'
import { fetchYahooPrice, searchSymbol } from './stockApi.js'

const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (n, d = 2) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (n) => n == null || isNaN(n) ? '—' : (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
const clr = (n) => n == null || isNaN(n) ? '#556' : n >= 0 ? '#00e5a0' : '#ff4d6d'

// ── Ticker ─────────────────────────────────────────────────────────────────
function Ticker({ items }) {
  const [x, setX] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setX(v => v - 1), 28)
    return () => clearInterval(id)
  }, [])
  const base = items.length
    ? items.map(s => {
        const sym = s.symbol.replace(/\.TWO?$/, '')
        const d = s.currentPrice && s.buyPrice ? (s.currentPrice - s.buyPrice) / s.buyPrice * 100 : null
        return `${sym}  ${fmt(s.currentPrice)}  ${d != null ? (d >= 0 ? '▲' : '▼') + Math.abs(d).toFixed(2) + '%' : ''}`
      }).join('    ◈    ')
    : 'ALPHADESK 股票投資組合追蹤系統  ◈  建立清單並新增股票以開始'
  const t = base + '    ◈    ' + base
  return (
    <div style={{ overflow: 'hidden', background: '#03060d', borderBottom: '1px solid #0c1828', padding: '6px 0', height: 28 }}>
      <div style={{ display: 'inline-block', whiteSpace: 'nowrap', transform: `translateX(${x % (t.length * 7.4)}px)`, color: '#00e5a0', fontFamily: 'Courier Prime, monospace', fontSize: 12, letterSpacing: 1 }}>
        {t}
      </div>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ size = 14, color = '#4a8aff' }) {
  const [i, setI] = useState(0)
  const f = ['◐', '◓', '◑', '◒']
  useEffect(() => { const id = setInterval(() => setI(v => (v + 1) % 4), 160); return () => clearInterval(id) }, [])
  return <span style={{ fontFamily: 'monospace', color, fontSize: size }}>{f[i]}</span>
}

// ── Add Stock Modal ────────────────────────────────────────────────────────
function AddStockModal({ onAdd, onClose }) {
  const [sym, setSym]         = useState('')
  const [name, setName]       = useState('')
  const [buyP, setBuyP]       = useState('')
  const [currP, setCurrP]     = useState('')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [shares, setShares]   = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [err, setErr]         = useState('')
  const searchTimer = useRef(null)

  // Auto-search when typing symbol
  const handleSymInput = (val) => {
    setSym(val); setErr(''); setSearchResults([])
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (val.trim().length >= 2) {
      searchTimer.current = setTimeout(async () => {
        setSearching(true)
        const results = await searchSymbol(val.trim())
        setSearching(false)
        setSearchResults(results.slice(0, 4))
      }, 500)
    }
  }

  const pickResult = async (result) => {
    setSym(result.symbol)
    setName(result.name)
    setSearchResults([])
    setFetchingPrice(true)
    const info = await fetchYahooPrice(result.symbol)
    setFetchingPrice(false)
    if (info?.price) setCurrP(String(info.price))
  }

  const fetchPrice = async () => {
    if (!sym.trim()) return
    setFetchingPrice(true)
    const info = await fetchYahooPrice(sym.trim())
    setFetchingPrice(false)
    if (info?.price) {
      setCurrP(String(info.price))
      if (!name && info.name) setName(info.name)
    } else {
      setErr('無法取得即時股價，請手動填入目前股價')
    }
  }

  const go = () => {
    if (!sym.trim())               { setErr('請輸入股票代號'); return }
    if (!buyP || isNaN(+buyP))     { setErr('請輸入有效購買價格'); return }
    if (!shares || isNaN(+shares)) { setErr('請輸入持有股數'); return }
    const cp = currP && !isNaN(+currP) ? parseFloat(currP) : parseFloat(buyP)
    const isTW = /\.(TW|TWO)$/.test(sym.trim().toUpperCase()) || /^\d{4,5}$/.test(sym.trim())
    onAdd({
      id: uid(),
      symbol: sym.trim().toUpperCase(),
      name: name.trim() || sym.trim().toUpperCase(),
      buyPrice: parseFloat(buyP),
      buyDate: date,
      shares: parseFloat(shares),
      currentPrice: cp,
      changePct: null,
      currency: isTW ? 'TWD' : 'USD',
      lastUpdated: new Date().toISOString(),
    })
    onClose()
  }

  const inp = { background: '#06101e', border: '1px solid #152540', borderRadius: 7, color: '#c0d4f0', padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none', fontFamily: 'Noto Sans TC, sans-serif', boxSizing: 'border-box', transition: 'border .2s' }
  const lbl = { color: '#2a4a6a', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,5,15,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(6px)', padding: 16 }}>
      <div style={{ background: '#07111f', border: '1px solid #152540', borderRadius: 16, padding: 28, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn .2s ease', boxShadow: '0 0 80px #00e5a008' }}>
        <div style={{ color: '#00e5a0', fontFamily: 'monospace', fontSize: 10, letterSpacing: 4, marginBottom: 22, opacity: .7 }}>◈ 新增股票至清單</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* Symbol input with search */}
          <div style={{ position: 'relative' }}>
            <label style={lbl}>股票代號 / 公司名稱搜尋</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input style={inp} placeholder="輸入代號 (2330) 或名稱 (台積電)" value={sym}
                  onChange={e => handleSymInput(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#2a5a8a'}
                  onBlur={e => { e.target.style.borderColor = '#152540'; setTimeout(() => setSearchResults([]), 200) }} />
                {searching && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={13} /></span>}
              </div>
              <button onClick={fetchPrice} disabled={fetchingPrice}
                style={{ background: '#001828', border: '1px solid #1a4a6a', borderRadius: 7, color: fetchingPrice ? '#1a3a5a' : '#4a9acc', padding: '0 14px', fontSize: 12, fontFamily: 'monospace', cursor: fetchingPrice ? 'default' : 'pointer', whiteSpace: 'nowrap', minWidth: 80 }}>
                {fetchingPrice ? <Spinner size={12} /> : '查現價'}
              </button>
            </div>
            {/* Search dropdown */}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 88, background: '#0a1828', border: '1px solid #1a3050', borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 8px 32px #00000080' }}>
                {searchResults.map(r => (
                  <div key={r.symbol} onClick={() => pickResult(r)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #0c1e34', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f2040'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ color: '#4a9acc', fontFamily: 'monospace', fontSize: 13, marginRight: 10 }}>{r.symbol}</span>
                    <span style={{ color: '#6a8aaa', fontSize: 13 }}>{r.name}</span>
                    <span style={{ color: '#1a3050', fontSize: 11, marginLeft: 8 }}>{r.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={lbl}>公司名稱（可手動填寫）</label>
            <input style={inp} placeholder="例：台積電 / Apple Inc." value={name} onChange={e => setName(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#2a5a8a'}
              onBlur={e => e.target.style.borderColor = '#152540'} />
          </div>

          {/* Date */}
          <div>
            <label style={lbl}>購買日期</label>
            <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Buy price + shares */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>購買價格</label>
              <input type="number" step="0.01" style={inp} placeholder="0.00" value={buyP} onChange={e => setBuyP(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#2a5a8a'}
                onBlur={e => e.target.style.borderColor = '#152540'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>持有股數</label>
              <input type="number" step="1" style={inp} placeholder="1000" value={shares} onChange={e => setShares(e.target.value)}
                onFocus={e => e.target.style.borderColor = '#2a5a8a'}
                onBlur={e => e.target.style.borderColor = '#152540'} />
            </div>
          </div>

          {/* Current price */}
          <div>
            <label style={lbl}>目前股價 {fetchingPrice ? <Spinner size={11} /> : <span style={{ color: '#1a3050' }}>(按「查現價」自動填入)</span>}</label>
            <input type="number" step="0.01" style={inp} placeholder="若有最新價格可填入，否則留空" value={currP} onChange={e => setCurrP(e.target.value)}
              onFocus={e => e.target.style.borderColor = '#2a5a8a'}
              onBlur={e => e.target.style.borderColor = '#152540'} />
          </div>

          {err && <div style={{ color: '#ff5060', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>⚠ {err}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={go}
              style={{ flex: 1, background: '#001808', border: '1px solid #005030', borderRadius: 8, color: '#00c080', padding: '13px', fontSize: 14, fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer', letterSpacing: 1, transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#002810'; e.currentTarget.style.borderColor = '#00c080' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#001808'; e.currentTarget.style.borderColor = '#005030' }}>
              ✓　確認新增
            </button>
            <button onClick={onClose}
              style={{ background: 'none', border: '1px solid #0c1e34', borderRadius: 8, color: '#2a4a6a', padding: '13px 18px', fontSize: 14, fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer' }}>
              取消
            </button>
          </div>
          <p style={{ color: '#1a3050', fontSize: 11, fontFamily: 'monospace', textAlign: 'center' }}>
            新增後可按 ⟳ 按鈕更新即時股價
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Stock Row ──────────────────────────────────────────────────────────────
function StockRow({ stock, onDelete, onRefresh, refreshing }) {
  const cost   = stock.buyPrice * stock.shares
  const curr   = (stock.currentPrice ?? stock.buyPrice) * stock.shares
  const pnlAmt = curr - cost
  const pnlPct = stock.buyPrice ? (stock.currentPrice - stock.buyPrice) / stock.buyPrice * 100 : 0
  const c = clr(pnlAmt)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 86px 86px 92px 108px 88px 54px', gap: 6, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #07101c', transition: 'background .15s', animation: 'fadeIn .3s ease' }}
      onMouseEnter={e => e.currentTarget.style.background = '#07101c'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontFamily: 'Courier Prime, monospace', color: '#9ab8d8', fontWeight: 'bold', fontSize: 13 }}>
        {stock.symbol.replace(/\.TWO?$/, '')}
      </div>
      <div>
        <div style={{ color: '#4a6888', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
        <div style={{ color: '#1a2e44', fontSize: 11, fontFamily: 'monospace', marginTop: 1 }}>{stock.buyDate}</div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'Courier Prime, monospace', color: '#2a4a68', fontSize: 13 }}>{fmt(stock.buyPrice)}</div>
      <div style={{ textAlign: 'right', fontFamily: 'Courier Prime, monospace', color: refreshing ? '#4a8aff' : '#b0c8e8', fontSize: 13 }}>
        {refreshing ? <Spinner /> : fmt(stock.currentPrice)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'Courier Prime, monospace', fontSize: 12, color: stock.changePct != null ? (stock.changePct >= 0 ? '#00c878' : '#f03060') : '#1e2e40' }}>
        {stock.changePct != null ? (stock.changePct >= 0 ? '▲ ' : '▼ ') + Math.abs(stock.changePct).toFixed(2) + '%' : '—'}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'Courier Prime, monospace', color: c, fontSize: 13 }}>
        {isNaN(pnlAmt) ? '—' : (pnlAmt >= 0 ? '+' : '') + fmt(pnlAmt)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'Courier Prime, monospace', color: c, fontSize: 13 }}>
        {isNaN(pnlPct) ? '—' : pct(pnlPct)}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={() => onRefresh(stock.id)} disabled={refreshing} title="更新現價"
          style={{ background: 'none', border: 'none', color: refreshing ? '#0e1e30' : '#1a4a78', cursor: refreshing ? 'default' : 'pointer', fontSize: 16, padding: '2px 3px', transition: 'color .15s' }}
          onMouseEnter={e => !refreshing && (e.currentTarget.style.color = '#3ab0ff')}
          onMouseLeave={e => e.currentTarget.style.color = refreshing ? '#0e1e30' : '#1a4a78'}>⟳</button>
        <button onClick={() => onDelete(stock.id)} title="刪除"
          style={{ background: 'none', border: 'none', color: '#1a0810', cursor: 'pointer', fontSize: 14, padding: '2px 3px', transition: 'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff3a5a'}
          onMouseLeave={e => e.currentTarget.style.color = '#1a0810'}>✕</button>
      </div>
    </div>
  )
}

// ── Portfolio Panel ────────────────────────────────────────────────────────
function PortfolioPanel({ portfolio, onUpdate, onDelete }) {
  const [showAdd, setShowAdd]     = useState(false)
  const [refreshId, setRefreshId] = useState(null)
  const [refreshAll, setRefreshAll] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState('')

  const tc = portfolio.stocks.reduce((s, st) => s + st.buyPrice * st.shares, 0)
  const tv = portfolio.stocks.reduce((s, st) => s + (st.currentPrice ?? st.buyPrice) * st.shares, 0)
  const tp = tv - tc
  const tpPct = tc > 0 ? tp / tc * 100 : 0

  const addStock = s => onUpdate({ ...portfolio, stocks: [...portfolio.stocks, s] })
  const delStock = id => onUpdate({ ...portfolio, stocks: portfolio.stocks.filter(s => s.id !== id) })

  const refreshOne = async (id) => {
    setRefreshId(id)
    const st = portfolio.stocks.find(s => s.id === id)
    const info = await fetchYahooPrice(st.symbol)
    if (info?.price) {
      onUpdate({ ...portfolio, stocks: portfolio.stocks.map(s => s.id === id
        ? { ...s, currentPrice: info.price, changePct: info.change_pct ?? null, lastUpdated: new Date().toISOString() }
        : s) })
    }
    setRefreshId(null)
  }

  const refreshAllFn = async () => {
    setRefreshAll(true)
    let updated = [...portfolio.stocks]
    for (let i = 0; i < updated.length; i++) {
      const st = updated[i]
      setRefreshProgress(`${i + 1}/${updated.length}`)
      const info = await fetchYahooPrice(st.symbol)
      if (info?.price) {
        updated[i] = { ...st, currentPrice: info.price, changePct: info.change_pct ?? null, lastUpdated: new Date().toISOString() }
      }
    }
    onUpdate({ ...portfolio, stocks: updated })
    setRefreshAll(false)
    setRefreshProgress('')
  }

  const colH = { color: '#1a2e44', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }

  return (
    <div style={{ background: '#060c18', border: '1px solid #0c1828', borderRadius: 12, overflow: 'hidden', marginBottom: 20, animation: 'fadeIn .3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '14px 18px', background: '#07101e', borderBottom: '1px solid #0a1828' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c878', boxShadow: '0 0 8px #00c87880' }} />
          <span style={{ color: '#b0c8e8', fontFamily: 'Noto Sans TC, sans-serif', fontSize: 16, fontWeight: 600 }}>{portfolio.name}</span>
          <span style={{ background: '#07101e', border: '1px solid #0f1e30', color: '#1a3050', fontSize: 10, fontFamily: 'monospace', padding: '2px 8px', borderRadius: 4 }}>{portfolio.stocks.length} 支</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {portfolio.stocks.length > 0 && !refreshAll && (
            <div style={{ textAlign: 'right', marginRight: 8, paddingRight: 8, borderRight: '1px solid #0f1e30' }}>
              <div style={{ color: '#1a3050', fontSize: 10, fontFamily: 'monospace' }}>總損益</div>
              <div style={{ color: clr(tp), fontFamily: 'Courier Prime, monospace', fontSize: 14, fontWeight: 'bold' }}>
                {(tp >= 0 ? '+' : '') + fmt(tp)}
                <span style={{ opacity: .6, fontSize: 11, marginLeft: 4 }}>({pct(tpPct)})</span>
              </div>
            </div>
          )}
          {refreshAll
            ? <span style={{ color: '#4a8aff', fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Spinner /> 更新中 {refreshProgress}
              </span>
            : <GhostBtn onClick={refreshAllFn}>⟳ 全部更新</GhostBtn>
          }
          <GhostBtn onClick={() => setShowAdd(true)} green>+ 新增股票</GhostBtn>
          <GhostBtn onClick={() => onDelete(portfolio.id)} red>刪除清單</GhostBtn>
        </div>
      </div>

      {/* Column headers */}
      {portfolio.stocks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 86px 86px 92px 108px 88px 54px', gap: 6, padding: '7px 16px', borderBottom: '1px solid #070f1a' }}>
          {['代號', '名稱', '成本價', '現價', '今日漲跌', '損益金額', '損益%', ''].map((h, i) => (
            <div key={i} style={{ ...colH, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
      )}

      {portfolio.stocks.length === 0
        ? <div style={{ padding: '40px', textAlign: 'center', color: '#0d1c28', fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 }}>
            尚無持股 ── 點擊「+ 新增股票」開始追蹤
          </div>
        : portfolio.stocks.map(s =>
            <StockRow key={s.id} stock={s} onDelete={delStock} onRefresh={refreshOne} refreshing={refreshId === s.id} />
          )
      }

      {/* Footer summary */}
      {portfolio.stocks.length > 0 && (
        <div style={{ display: 'flex', gap: 28, padding: '11px 18px', borderTop: '1px solid #070f1a', justifyContent: 'flex-end', flexWrap: 'wrap', background: '#05090f' }}>
          {[['投入成本', fmt(tc), '#2a4a68'], ['目前市值', fmt(tv), '#6a8aaa'], ['損益', (tp >= 0 ? '+' : '') + fmt(tp), clr(tp)], ['報酬率', pct(tpPct), clr(tp)]].map(([l, v, c]) => (
            <div key={l} style={{ textAlign: 'right' }}>
              <div style={{ color: '#0d1c28', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>{l}</div>
              <div style={{ color: c, fontFamily: 'Courier Prime, monospace', fontSize: 15, fontWeight: 'bold' }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddStockModal onAdd={addStock} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function GhostBtn({ children, onClick, disabled, green, red }) {
  const [h, setH] = useState(false)
  const ac = green ? '#00b870' : red ? '#ff3a5a' : '#4a9acc'
  const bd = green ? '#004828' : red ? '#3a0818' : '#1a3a5a'
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: h && !disabled ? bd : 'transparent', border: `1px solid ${h && !disabled ? ac : bd}`, borderRadius: 6, color: disabled ? '#0e1e2e' : h ? ac : bd, padding: '7px 12px', fontSize: 12, fontFamily: 'Noto Sans TC, sans-serif', cursor: disabled ? 'default' : 'pointer', transition: 'all .15s' }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </button>
  )
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [portfolios, setPortfolios] = useState([])
  const [loaded, setLoaded]   = useState(false)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving]   = useState(false)
  const saveTimer = useRef(null)

  // Subscribe to Firebase realtime updates
  useEffect(() => {
    const unsub = subscribePortfolios(data => {
      setPortfolios(Array.isArray(data) ? data : Object.values(data || {}))
      setLoaded(true)
    })
    return () => unsub?.()
  }, [])

  const persist = useCallback(async (upd) => {
    setPortfolios(upd)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await savePortfolios(upd)
      setSaving(false)
    }, 600)
  }, [])

  const createPortfolio = () => {
    if (!newName.trim()) return
    persist([...portfolios, { id: uid(), name: newName.trim(), stocks: [], createdAt: new Date().toISOString() }])
    setNewName(''); setShowNew(false)
  }

  const allStocks = portfolios.flatMap(p => p.stocks)

  if (!loaded) return (
    <div style={{ background: '#040810', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <Spinner size={24} color="#00e5a0" />
      <div style={{ color: '#1a3050', fontFamily: 'monospace', fontSize: 13, letterSpacing: 4 }}>ALPHADESK LOADING...</div>
    </div>
  )

  const tc = allStocks.reduce((s, st) => s + st.buyPrice * st.shares, 0)
  const tv = allStocks.reduce((s, st) => s + (st.currentPrice ?? st.buyPrice) * st.shares, 0)
  const tp = tv - tc

  return (
    <div style={{ background: '#040810', minHeight: '100vh' }}>
      <Ticker items={allStocks} />

      {/* Navbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid #0a1828', background: '#03060f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5a0', boxShadow: '0 0 12px #00e5a0', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#00e5a0', fontFamily: 'Courier Prime, monospace', fontSize: 22, fontWeight: 'bold', letterSpacing: 4 }}>ALPHADESK</span>
          <span style={{ color: '#0c1a28', fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, marginTop: 4 }}>PORTFOLIO TRACKER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {saving && <span style={{ color: '#2a4a6a', fontFamily: 'monospace', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={11} color="#2a6aaa" /> 儲存中</span>}
          <span style={{ color: '#0c1a28', fontFamily: 'monospace', fontSize: 11 }}>
            {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })} · 即時共享
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        {/* Summary cards */}
        {allStocks.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              ['持股數量', allStocks.length + ' 支', '#6a8aaa'],
              ['投入資金', fmt(tc), '#4a6a88'],
              ['目前總值', fmt(tv), '#8aaac8'],
              ['總損益', (tp >= 0 ? '+' : '') + fmt(tp), clr(tp)],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: '#060c18', border: '1px solid #0a1828', borderRadius: 10, padding: '16px 18px', transition: 'border .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#1a3050'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#0a1828'}>
                <div style={{ color: '#0d1c28', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{l}</div>
                <div style={{ color: c, fontFamily: 'Courier Prime, monospace', fontSize: 20, fontWeight: 'bold' }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio panels */}
        {portfolios.map(p => (
          <PortfolioPanel key={p.id} portfolio={p}
            onUpdate={u => persist(portfolios.map(x => x.id === u.id ? u : x))}
            onDelete={id => persist(portfolios.filter(x => x.id !== id))} />
        ))}

        {/* Create new portfolio */}
        {showNew ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '16px', background: '#060c18', border: '1px solid #0c1e34', borderRadius: 12, animation: 'fadeIn .2s ease' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPortfolio()}
              placeholder="輸入投資組合名稱..." autoFocus
              style={{ flex: 1, background: '#03060d', border: '1px solid #0a1828', borderRadius: 7, color: '#b0c8e8', padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'Noto Sans TC, sans-serif' }} />
            <GhostBtn onClick={createPortfolio} green>建立</GhostBtn>
            <GhostBtn onClick={() => setShowNew(false)}>取消</GhostBtn>
          </div>
        ) : (
          <button onClick={() => setShowNew(true)}
            style={{ width: '100%', background: 'none', border: '2px dashed #08121e', borderRadius: 12, color: '#0d1c28', padding: '18px', fontSize: 13, fontFamily: 'Noto Sans TC, sans-serif', cursor: 'pointer', letterSpacing: 2, transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00e5a030'; e.currentTarget.style.color = '#00e5a060' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#08121e'; e.currentTarget.style.color = '#0d1c28' }}>
            ＋　建立新的投資組合清單
          </button>
        )}

        <div style={{ textAlign: 'center', marginTop: 40, color: '#07101a', fontFamily: 'monospace', fontSize: 10, letterSpacing: 2 }}>
          ALPHADESK · 股價來源：Yahoo Finance · Firebase 即時同步 · 開啟網址即可觀看
        </div>
      </div>
    </div>
  )
}
