// Türkiye saatine (UTC+3, DST yok) göre "iş günü" tarihi yardımcıları.

const TR_OFFSET_MS = 3 * 60 * 60 * 1000

/** Verilen tarihi 'YYYY-MM-DD' (Türkiye günü) olarak döndürür. */
export function businessDate(d = new Date()) {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' -> '23 Ağustos 2026 Cumartesi' gibi okunur biçim. */
export function prettyDate(dateStr) {
  try {
    const d = new Date(`${dateStr}T12:00:00+03:00`)
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    })
  } catch {
    return dateStr
  }
}

/** Zaman damgasının Türkiye saatine göre saatini (0-23) döndürür. */
export function trHour(ts) {
  const t = new Date(ts).getTime()
  if (!Number.isFinite(t)) return null
  return new Date(t + TR_OFFSET_MS).getUTCHours()
}

/** Zaman damgasını Türkiye saatiyle 'HH:MM' gösterir. */
export function trTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    })
  } catch {
    return ''
  }
}
