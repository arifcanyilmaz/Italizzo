// -----------------------------------------------------------------------------
//  /api/orders  ->  Netlify Function (MongoDB "orders" koleksiyonu)
//
//  Her masanin acik adisyonu bir dokumandir. Kapatilinca status:'closed' olur
//  ve o gunun kaydi olarak koleksiyonda kalir (gunluk rapor bunlari kullanir).
//
//  GET  /api/orders   : tum ACIK adisyonlari dondurur (kat plani + panel icin)
//  PUT  /api/orders   : bir masanin acik adisyonunu kaydeder (upsert)
//                       body: { tableId, tableName, items[], payments[] }
//  POST /api/orders   : bir masayi KAPATIR/arsivler  body: { tableId }
// -----------------------------------------------------------------------------

import { getDb } from './utils/mongo.js'
import { businessDate } from './utils/date.js'

const COLLECTION = 'orders'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  }
}

function sanitizeItem(i) {
  if (!i) return null
  const id = String(i.id || '')
  const name = String(i.name || '')
  const price = Number(i.price)
  const qty = Math.floor(Number(i.qty))
  if (!id || !name || !Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) {
    return null
  }
  // Odenen adet (0..qty) — hangi birimlerin odendigini/kilitlendigini tutar
  const paidQty = Math.max(0, Math.min(qty, Math.floor(Number(i.paidQty) || 0)))
  return { id, name, price, qty, paidQty }
}

const PAYMENT_TYPES = ['item', 'manual', 'all']

function sanitizePayment(p) {
  if (!p) return null
  const amount = Number(p.amount)
  const at = Number(p.at) || Date.now()
  if (!Number.isFinite(amount) || amount <= 0) return null
  const type = PAYMENT_TYPES.includes(p.type) ? p.type : 'manual'
  const out = { amount, at, type }
  // Hangi urun adetlerinin kilitlendigi (geri alma icin) — varsa sakla
  if (p.paidCounts && typeof p.paidCounts === 'object') {
    const pc = {}
    for (const [k, v] of Object.entries(p.paidCounts)) {
      const n = Math.floor(Number(v) || 0)
      if (n > 0) pc[String(k)] = n
    }
    if (Object.keys(pc).length) out.paidCounts = pc
  }
  return out
}

function serialize(o) {
  return {
    id: o._id.toString(),
    tableId: o.tableId,
    tableName: o.tableName,
    items: o.items || [],
    payments: o.payments || [],
    businessDate: o.businessDate,
  }
}

export const handler = async (event) => {
  try {
    const db = await getDb()
    const col = db.collection(COLLECTION)

    // ---------------- GET: acik adisyonlar ----------------
    if (event.httpMethod === 'GET') {
      const docs = await col.find({ status: 'open' }).toArray()
      return json(200, docs.map(serialize))
    }

    // ---------------- PUT: acik adisyonu kaydet (upsert) ----------------
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const tableId = String(body.tableId || '')
      if (!tableId) return json(400, { error: 'tableId zorunlu' })

      const items = Array.isArray(body.items)
        ? body.items.map(sanitizeItem).filter(Boolean)
        : []
      const payments = Array.isArray(body.payments)
        ? body.payments.map(sanitizePayment).filter(Boolean)
        : []

      // Bosalan adisyon: acik kaydi tamamen sil (masa "bos" olur)
      if (items.length === 0 && payments.length === 0) {
        await col.deleteOne({ tableId, status: 'open' })
        return json(200, { ok: true, empty: true })
      }

      const now = new Date()
      await col.updateOne(
        { tableId, status: 'open' },
        {
          $set: {
            tableName: String(body.tableName || tableId),
            items,
            payments,
            updatedAt: now,
          },
          $setOnInsert: {
            tableId,
            status: 'open',
            businessDate: businessDate(now),
            createdAt: now,
          },
        },
        { upsert: true },
      )
      return json(200, { ok: true })
    }

    // ---------------- POST: masayi kapat / arsivle ----------------
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const tableId = String(body.tableId || '')
      if (!tableId) return json(400, { error: 'tableId zorunlu' })

      const res = await col.updateOne(
        { tableId, status: 'open' },
        { $set: { status: 'closed', closedAt: new Date() } },
      )
      return json(200, { ok: true, closed: res.modifiedCount > 0 })
    }

    return json(405, { error: 'Bu metot desteklenmiyor' })
  } catch (err) {
    return json(500, { error: err.message || 'Sunucu hatası' })
  }
}
