// -----------------------------------------------------------------------------
//  /api/dashboard  ->  Satis panosu verisi (KAPATILMIS adisyonlardan).
//
//  GET /api/dashboard            : son 30 gunun ozeti
//  GET /api/dashboard?days=7     : son 7 gun (1..365 arasi)
//
//  Doner:
//    range       : { from, to, days }
//    totals      : { revenue, collected, closedCount, itemCount }
//    daily[]     : gun gun ciro  { date, prettyDate, revenue, collected, closedCount }
//    topProducts : en cok satan urunler (yemek)   { name, qty, total }
//    topDrinks   : en cok satan icecekler         { name, qty, total }
// -----------------------------------------------------------------------------

import { getDb } from './utils/mongo.js'
import { businessDate, prettyDate } from './utils/date.js'

// Icecek kategorileri (menu.js VALID_CATEGORIES ile uyumlu)
const DRINK_CATEGORIES = new Set(['soguk', 'sicak'])
const DAY_MS = 24 * 60 * 60 * 1000

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  }
}

export const handler = async (event) => {
  try {
    const db = await getDb()
    const orders = db.collection('orders')
    const menu = db.collection('menu')

    const q = event.queryStringParameters || {}
    const days = Math.min(Math.max(parseInt(q.days, 10) || 30, 1), 365)

    const to = businessDate()
    const from = businessDate(new Date(Date.now() - (days - 1) * DAY_MS))

    const closed = await orders
      .find({ status: 'closed', businessDate: { $gte: from, $lte: to } })
      .toArray()

    // Urun id -> kategori (siparis kaleminde kategori yoksa buradan tamamlanir)
    const menuDocs = await menu.find({}).project({ category: 1 }).toArray()
    const catById = new Map(menuDocs.map((d) => [d._id.toString(), d.category]))

    const dailyMap = new Map()
    const productMap = new Map()
    const drinkMap = new Map()
    let totalRevenue = 0
    let totalCollected = 0
    let totalItemCount = 0

    for (const o of closed) {
      const items = o.items || []
      const payments = o.payments || []
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
      const paid = payments.reduce((s, p) => s + p.amount, 0)

      totalRevenue += subtotal
      totalCollected += paid

      const d = dailyMap.get(o.businessDate) || { revenue: 0, collected: 0, closedCount: 0 }
      d.revenue += subtotal
      d.collected += paid
      d.closedCount += 1
      dailyMap.set(o.businessDate, d)

      for (const it of items) {
        totalItemCount += it.qty
        const cat = it.category || catById.get(it.id) || 'other'
        const target = DRINK_CATEGORIES.has(cat) ? drinkMap : productMap
        const cur = target.get(it.name) || { qty: 0, total: 0 }
        cur.qty += it.qty
        cur.total += it.price * it.qty
        target.set(it.name, cur)
      }
    }

    const daily = [...dailyMap.entries()]
      .map(([date, v]) => ({ date, prettyDate: prettyDate(date), ...v }))
      .sort((a, b) => b.date.localeCompare(a.date))

    const rank = (m) =>
      [...m.entries()]
        .map(([name, v]) => ({ name, qty: v.qty, total: v.total }))
        .sort((a, b) => b.qty - a.qty || b.total - a.total)

    return json(200, {
      range: { from, to, days },
      totals: {
        revenue: totalRevenue,
        collected: totalCollected,
        closedCount: closed.length,
        itemCount: totalItemCount,
      },
      daily,
      topProducts: rank(productMap).slice(0, 20),
      topDrinks: rank(drinkMap).slice(0, 20),
    })
  } catch (err) {
    return json(500, { error: err.message || 'Sunucu hatası' })
  }
}
