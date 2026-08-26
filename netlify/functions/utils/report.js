// Günlük rapor oluşturma ve biçimlendirme (HTML + düz metin).
// O güne ait KAPATILMIŞ adisyonlar üzerinden özet çıkarır.

import { prettyDate, trTime } from './date.js'

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
})
const money = (n) => TL.format(Number(n) || 0)

/**
 * @param {import('mongodb').Db} db
 * @param {string} date  'YYYY-MM-DD'
 */
export async function buildDailyReport(db, date) {
  const col = db.collection('orders')
  const closed = await col
    .find({ businessDate: date, status: 'closed' })
    .sort({ closedAt: 1 })
    .toArray()
  const openCount = await col.countDocuments({ status: 'open' })

  let revenue = 0
  let collected = 0
  let paymentCount = 0
  const itemMap = new Map()

  const tables = closed.map((o) => {
    const items = o.items || []
    const payments = o.payments || []
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const paid = payments.reduce((s, p) => s + p.amount, 0)

    revenue += subtotal
    collected += paid
    paymentCount += payments.length

    for (const it of items) {
      const cur = itemMap.get(it.name) || { qty: 0, total: 0 }
      cur.qty += it.qty
      cur.total += it.price * it.qty
      itemMap.set(it.name, cur)
    }

    return {
      tableName: o.tableName,
      itemCount: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
      paid,
      paymentCount: payments.length,
      closedAt: o.closedAt,
    }
  })

  const items = [...itemMap.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, total: v.total }))
    .sort((a, b) => b.qty - a.qty)

  return {
    date,
    prettyDate: prettyDate(date),
    closedCount: closed.length,
    openCount,
    revenue,
    collected,
    paymentCount,
    tables,
    items,
  }
}

export function renderReportText(r) {
  const lines = []
  lines.push(`ITALIZZO — GÜNLÜK RAPOR`)
  lines.push(r.prettyDate)
  lines.push('')
  lines.push(`Kapatılan hesap : ${r.closedCount}`)
  lines.push(`Toplam ciro     : ${money(r.revenue)}`)
  lines.push(`Tahsil edilen   : ${money(r.collected)}`)
  lines.push(`Ödeme işlemi    : ${r.paymentCount}`)
  lines.push(`Hâlâ açık masa  : ${r.openCount}`)
  lines.push('')
  lines.push('MASALAR')
  for (const t of r.tables) {
    lines.push(
      `- ${t.tableName} · ${t.itemCount} ürün · ${money(t.subtotal)} · ${t.paymentCount} ödeme · ${trTime(t.closedAt)}`,
    )
  }
  lines.push('')
  lines.push('ÜRÜN DÖKÜMÜ')
  for (const it of r.items) {
    lines.push(`- ${it.name} × ${it.qty} = ${money(it.total)}`)
  }
  return lines.join('\n')
}

export function renderReportHtml(r) {
  const tableRows = r.tables.length
    ? r.tables
        .map(
          (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #EDE1C9;font-weight:700;color:#2B2724">${t.tableName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EDE1C9;text-align:center;color:#4A433C">${t.itemCount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EDE1C9;text-align:center;color:#4A433C">${t.paymentCount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EDE1C9;text-align:center;color:#57642F">${trTime(t.closedAt)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #EDE1C9;text-align:right;font-weight:800;color:#A23D26">${money(t.subtotal)}</td>
      </tr>`,
        )
        .join('')
    : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#4A433C">Bugün kapatılan hesap yok.</td></tr>`

  const itemRows = r.items
    .map(
      (it) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #EDE1C9;color:#2B2724">${it.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #EDE1C9;text-align:center;color:#4A433C">${it.qty}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #EDE1C9;text-align:right;font-weight:700;color:#A23D26">${money(it.total)}</td>
      </tr>`,
    )
    .join('')

  const stat = (label, value, color) => `
    <td style="padding:14px 16px;background:#ffffff;border:1px solid #EDE1C9;border-radius:14px;text-align:center">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4A433C">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${color};margin-top:4px">${value}</div>
    </td>`

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#FBF7EF;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#2B2724">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#BC4E32;color:#FBF7EF;border-radius:18px;padding:22px 24px">
      <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;opacity:.85">Italizzo · Pizzeria</div>
      <div style="font-size:26px;font-weight:800;font-family:Georgia,serif">Günlük Rapor</div>
      <div style="font-size:14px;opacity:.9;margin-top:2px;text-transform:capitalize">${r.prettyDate}</div>
    </div>

    <table role="presentation" width="100%" cellspacing="8" style="margin:14px 0;border-collapse:separate">
      <tr>
        ${stat('Kapatılan Hesap', r.closedCount, '#2B2724')}
        ${stat('Toplam Ciro', money(r.revenue), '#A23D26')}
      </tr>
      <tr>
        ${stat('Tahsil Edilen', money(r.collected), '#57642F')}
        ${stat('Ödeme İşlemi', r.paymentCount, '#2B2724')}
      </tr>
    </table>

    <div style="background:#fff;border:1px solid #EDE1C9;border-radius:16px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 16px;font-weight:800;font-family:Georgia,serif;font-size:16px;border-bottom:1px solid #EDE1C9">Masa Dökümü</div>
      <table width="100%" style="border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#F6EFE0">
          <th style="padding:8px 10px;text-align:left;font-size:12px;color:#4A433C">Masa</th>
          <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4A433C">Ürün</th>
          <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4A433C">Ödeme</th>
          <th style="padding:8px 10px;text-align:center;font-size:12px;color:#4A433C">Kapanış</th>
          <th style="padding:8px 10px;text-align:right;font-size:12px;color:#4A433C">Tutar</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    ${
      r.items.length
        ? `<div style="background:#fff;border:1px solid #EDE1C9;border-radius:16px;overflow:hidden">
      <div style="padding:12px 16px;font-weight:800;font-family:Georgia,serif;font-size:16px;border-bottom:1px solid #EDE1C9">Ürün Dökümü</div>
      <table width="100%" style="border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#F6EFE0">
          <th style="padding:6px 10px;text-align:left;font-size:12px;color:#4A433C">Ürün</th>
          <th style="padding:6px 10px;text-align:center;font-size:12px;color:#4A433C">Adet</th>
          <th style="padding:6px 10px;text-align:right;font-size:12px;color:#4A433C">Tutar</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>`
        : ''
    }

    <div style="text-align:center;color:#4A433C;font-size:12px;margin-top:18px">
      Hâlâ açık ${r.openCount} masa · Italizzo POS otomatik raporu
    </div>
  </div>
</body></html>`
}
