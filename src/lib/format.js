// Turk Lirasi bicimlendirme yardimcilari

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 265 -> "₺265,00" */
export function formatTL(value) {
  const n = Number(value) || 0
  return TL.format(n)
}

/**
 * Kullanicinin yazdigi tutar metnini sayiya cevirir.
 * Hem "200" hem "200,50" hem "200.50" bicimlerini kabul eder.
 */
export function parseAmount(text) {
  if (typeof text !== 'string') return Number(text) || 0
  let s = text.trim().replace(/[^\d.,]/g, '')
  if (s === '') return 0
  // Virgul varsa: ondalik ayirici virgul, noktalar binlik ayiricidir (1.200,50)
  // Virgul yoksa: noktayi ondalik olarak birak (200.50)
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Zaman damgasini "14:32" seklinde gosterir */
export function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
