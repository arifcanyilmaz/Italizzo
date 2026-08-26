// -----------------------------------------------------------------------------
//  /api/menu  ->  Netlify Function (MongoDB "menu" koleksiyonu)
//
//  GET    /api/menu        : tum menuyu dondurur (DB'de ne varsa)
//  POST   /api/menu        : yeni urun ekler  { name, category, price }
//  DELETE /api/menu?id=... : urunu siler
// -----------------------------------------------------------------------------

import { ObjectId } from 'mongodb'
import { getDb } from './utils/mongo.js'

const COLLECTION = 'menu'
const VALID_CATEGORIES = ['soguk', 'sicak', 'makarna', 'pizza']

const CATEGORY_ORDER = VALID_CATEGORIES.reduce((acc, c, i) => {
  acc[c] = i
  return acc
}, {})

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

// MongoDB dokumanini istemcinin bekledigi bicime cevirir (_id -> id).
function serialize(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    category: doc.category,
    price: doc.price,
  }
}

function sortMenu(items) {
  return items.sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] ?? 99
    const cb = CATEGORY_ORDER[b.category] ?? 99
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name, 'tr')
  })
}

export const handler = async (event) => {
  try {
    const db = await getDb()
    const col = db.collection(COLLECTION)

    // ---------------- GET: menuyu listele (DB'de ne varsa) ----------------
    if (event.httpMethod === 'GET') {
      const docs = await col.find({}).toArray()
      return json(200, sortMenu(docs.map(serialize)))
    }

    // ---------------- POST: yeni urun ekle ----------------
    if (event.httpMethod === 'POST') {
      let payload
      try {
        payload = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'Geçersiz JSON gövdesi' })
      }

      const name = String(payload.name || '').trim()
      const category = String(payload.category || '').trim()
      const price = Number(payload.price)

      if (!name) return json(400, { error: 'Ürün adı zorunludur' })
      if (!VALID_CATEGORIES.includes(category)) {
        return json(400, { error: 'Geçersiz kategori' })
      }
      if (!Number.isFinite(price) || price < 0) {
        return json(400, { error: 'Geçerli bir fiyat girin' })
      }

      const doc = { name, category, price, createdAt: new Date() }
      const res = await col.insertOne(doc)
      return json(201, serialize({ ...doc, _id: res.insertedId }))
    }

    // ---------------- PUT: urun guncelle ----------------
    if (event.httpMethod === 'PUT') {
      const id = event.queryStringParameters?.id
      if (!id || !ObjectId.isValid(id)) {
        return json(400, { error: 'Geçersiz ürün kimliği' })
      }
      let payload
      try {
        payload = JSON.parse(event.body || '{}')
      } catch {
        return json(400, { error: 'Geçersiz JSON gövdesi' })
      }

      const updates = {}
      if (payload.name !== undefined) {
        const name = String(payload.name).trim()
        if (!name) return json(400, { error: 'Ürün adı boş olamaz' })
        updates.name = name
      }
      if (payload.category !== undefined) {
        if (!VALID_CATEGORIES.includes(payload.category)) return json(400, { error: 'Geçersiz kategori' })
        updates.category = payload.category
      }
      if (payload.price !== undefined) {
        const price = Number(payload.price)
        if (!Number.isFinite(price) || price < 0) return json(400, { error: 'Geçerli bir fiyat girin' })
        updates.price = price
      }
      if (!Object.keys(updates).length) return json(400, { error: 'Güncellenecek alan yok' })

      const res = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: 'after' },
      )
      if (!res) return json(404, { error: 'Ürün bulunamadı' })
      return json(200, serialize(res))
    }

    // ---------------- DELETE: urun sil ----------------
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id
      if (!id || !ObjectId.isValid(id)) {
        return json(400, { error: 'Geçersiz ürün kimliği' })
      }
      const res = await col.deleteOne({ _id: new ObjectId(id) })
      if (res.deletedCount === 0) return json(404, { error: 'Ürün bulunamadı' })
      return json(200, { ok: true, id })
    }

    return json(405, { error: 'Bu metot desteklenmiyor' })
  } catch (err) {
    return json(500, { error: err.message || 'Sunucu hatası' })
  }
}
