// -----------------------------------------------------------------------------
//  /api/report  ->  Gunluk raporu isteka bagli olusturur (goruntule / test et).
//
//  GET /api/report                 : bugunun raporu (JSON)
//  GET /api/report?date=2026-08-23 : belirli gunun raporu
//  GET /api/report?format=html     : tarayicida gorulebilir HTML rapor
//  GET /api/report?send=1          : raporu e-posta olarak da gonderir (test)
// -----------------------------------------------------------------------------

import { getDb } from './utils/mongo.js'
import { businessDate } from './utils/date.js'
import { buildDailyReport, renderReportHtml, renderReportText } from './utils/report.js'
import { sendEmail } from './utils/email.js'

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
    const q = event.queryStringParameters || {}
    const date = /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : businessDate()

    const report = await buildDailyReport(db, date)

    let email
    if (q.send === '1') {
      email = await sendEmail({
        subject: `Italizzo Günlük Rapor — ${date}`,
        html: renderReportHtml(report),
        text: renderReportText(report),
      })
    }

    if (q.format === 'html') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        body: renderReportHtml(report),
      }
    }

    return json(200, { ...report, email })
  } catch (err) {
    return json(500, { error: err.message || 'Sunucu hatası' })
  }
}
