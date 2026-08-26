// -----------------------------------------------------------------------------
//  Zamanlanmis fonksiyon — her gun 21:00 (Turkiye) gunluk raporu e-posta atar.
//
//  Zamanlama netlify.toml icinde tanimli:  schedule = "0 18 * * *"  (UTC)
//  18:00 UTC == 21:00 Turkiye (UTC+3, DST yok).
// -----------------------------------------------------------------------------

import { getDb } from './utils/mongo.js'
import { businessDate } from './utils/date.js'
import { buildDailyReport, renderReportHtml, renderReportText } from './utils/report.js'
import { sendEmail } from './utils/email.js'

export const handler = async () => {
  try {
    const db = await getDb()
    const date = businessDate()
    const report = await buildDailyReport(db, date)

    const result = await sendEmail({
      subject: `Italizzo Günlük Rapor — ${date}`,
      html: renderReportHtml(report),
      text: renderReportText(report),
    })

    console.log('Günlük rapor:', date, JSON.stringify(result))
    return { statusCode: 200, body: JSON.stringify({ ok: true, date, email: result }) }
  } catch (err) {
    console.error('Günlük rapor hatası:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
