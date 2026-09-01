// -----------------------------------------------------------------------------
//  /api/finance  ->  Aylik Gelir/Gider defteri (MongoDB "finance" koleksiyonu)
//
//  Her gun bir dokumandir: { date:'YYYY-MM-DD', gelir, gider, gelirNote, giderNote }
//
//  GET /api/finance?year=2026&month=9 : o ayin tum gun kayitlarini dondurur
//  PUT /api/finance                   : bir gunu kaydeder (upsert)
//        body: { date, gelir, gider, gelirNote, giderNote }
//        (hepsi bos/0 ise kayit silinir -> DB temiz kalir)
// -----------------------------------------------------------------------------

import { getDb } from './utils/mongo.js'

const COLLECTION = 'finance'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  }
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}
const str = (v) => String(v || '').slice(0, 300)

function serialize(d) {
  return {
    date: d.date,
    gelir: d.gelir || 0,
    gider: d.gider || 0,
    gelirNote: d.gelirNote || '',
    giderNote: d.giderNote || '',
  }
}

export const handler = async (event) => {
  try {
    const db = await getDb()
    const col = db.collection(COLLECTION)

    // ---------------- GET: bir ayin kayitlari ----------------
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {}
      const year = parseInt(q.year, 10)
      const month = parseInt(q.month, 10)
      if (!year || !month || month < 1 || month > 12) {
        return json(400, { error: 'Geçerli year ve month gerekli' })
      }
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const docs = await col
        .find({ date: { $gte: `${prefix}-01`, $lte: `${prefix}-31` } })
        .toArray()
      return json(200, docs.map(serialize))
    }

    // ---------------- PUT: bir gunu kaydet (upsert) ----------------
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const date = String(body.date || '')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: 'Geçersiz tarih' })

      const gelir = num(body.gelir)
      const gider = num(body.gider)
      const gelirNote = str(body.gelirNote)
      const giderNote = str(body.giderNote)

      // Tumu bosalmis: kaydi sil
      if (gelir === 0 && gider === 0 && !gelirNote && !giderNote) {
        await col.deleteOne({ date })
        return json(200, { ok: true, empty: true })
      }

      await col.updateOne(
        { date },
        { $set: { date, gelir, gider, gelirNote, giderNote, updatedAt: new Date() } },
        { upsert: true },
      )
      return json(200, { ok: true })
    }

    return json(405, { error: 'Bu metot desteklenmiyor' })
  } catch (err) {
    return json(500, { error: err.message || 'Sunucu hatası' })
  }
}
