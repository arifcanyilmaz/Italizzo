import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchFinance, saveFinanceDay } from '../api'
import { formatTL, parseAmount } from '../lib/format'

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const emptyDay = () => ({ gelir: '', gider: '', gelirNote: '', giderNote: '' })
const daysInMonth = (year, month) => new Date(year, month, 0).getDate()
const pad = (n) => String(n).padStart(2, '0')

/**
 * Aylik Gelir/Gider tablosu (Excel benzeri).
 *  - Ay/yil secilir; o ayin her gunu icin bir satir olusur.
 *  - Gelir/Gider ve aciklamalar girilir; "Toplam" kolonu kumulatif (yuruyen) bakiye.
 *  - Her degisiklik otomatik DB'ye kaydedilir (/api/finance).
 */
export default function GelirGider({ onBack }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [entries, setEntries] = useState({}) // 'YYYY-MM-DD' -> {gelir,gider,gelirNote,giderNote}
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved | error

  const saveTimers = useRef({})

  // Ay/yil degisince kayitlari cek
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchFinance(year, month).then((res) => {
      if (!alive) return
      if (!res.ok) {
        setError(res.error)
        setEntries({})
      } else {
        const map = {}
        for (const e of res.entries) {
          map[e.date] = {
            gelir: e.gelir ? String(e.gelir) : '',
            gider: e.gider ? String(e.gider) : '',
            gelirNote: e.gelirNote || '',
            giderNote: e.giderNote || '',
          }
        }
        setEntries(map)
      }
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [year, month])

  const days = daysInMonth(year, month)
  const dateList = useMemo(
    () => Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
    [year, month, days],
  )

  // Otomatik kaydet (gun bazli debounce)
  const persist = (date, day) => {
    clearTimeout(saveTimers.current[date])
    setSaveStatus('saving')
    saveTimers.current[date] = setTimeout(() => {
      saveFinanceDay({
        date,
        gelir: parseAmount(day.gelir),
        gider: parseAmount(day.gider),
        gelirNote: day.gelirNote.trim(),
        giderNote: day.giderNote.trim(),
      })
        .then(() => {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 1500)
        })
        .catch(() => setSaveStatus('error'))
    }, 600)
  }

  const updateCell = (date, field, value) => {
    setEntries((prev) => {
      const day = { ...(prev[date] || emptyDay()), [field]: value }
      const next = { ...prev, [date]: day }
      persist(date, day)
      return next
    })
  }

  // Toplamlar + yuruyen bakiye
  const { totalGelir, totalGider, running } = useMemo(() => {
    let tg = 0
    let td = 0
    let run = 0
    const running = {}
    for (const date of dateList) {
      const d = entries[date] || emptyDay()
      const g = parseAmount(d.gelir)
      const e = parseAmount(d.gider)
      tg += g
      td += e
      run += g - e
      running[date] = run
    }
    return { totalGelir: tg, totalGider: td, running }
  }, [entries, dateList])

  const net = totalGelir - totalGider

  // Excel/CSV disa aktar (Turkce Excel icin ; ayirici + UTF-8 BOM)
  const exportCsv = () => {
    const sep = ';'
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`
    const nf = (n) => String(n).replace('.', ',')
    const lines = [['Tarih', 'Gider Açıklama', 'Gelir Açıklama', 'Gelir', 'Gider', 'Toplam'].join(sep)]
    for (const date of dateList) {
      const d = entries[date] || emptyDay()
      const tarih = `${date.slice(8, 10)}.${pad(month)}.${year}`
      lines.push(
        [
          tarih,
          q(d.giderNote),
          q(d.gelirNote),
          nf(parseAmount(d.gelir)),
          nf(parseAmount(d.gider)),
          nf(running[date] || 0),
        ].join(sep),
      )
    }
    lines.push('')
    lines.push(['Gelir Toplamı', '', '', nf(totalGelir)].join(sep))
    lines.push(['Gider Toplamı', '', '', '', nf(totalGider)].join(sep))
    lines.push(['Net Genel Toplam', '', '', '', '', nf(net)].join(sep))

    const csv = '﻿' + lines.join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gelir-gider-${year}-${pad(month)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream-50">
      {/* Ust bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-full border border-cream-200 bg-white/70 text-charcoal-600 shadow-soft transition-colors hover:bg-terracotta-50 hover:text-terracotta-600"
            title="Geri dön"
            aria-label="Geri dön"
          >
            ←
          </button>
          <div className="leading-tight">
            <h1 className="font-serif text-2xl font-bold text-charcoal-800">💰 Gelir Gider Tablosu</h1>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-600">
              Italizzo · Defter
            </p>
          </div>
        </div>

        {/* Ay / Yil secimi + kayit durumu */}
        <div className="flex items-center gap-2">
          <SaveBadge status={saveStatus} />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm font-bold text-charcoal-800 shadow-soft outline-none focus:border-terracotta-400"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm font-bold text-charcoal-800 shadow-soft outline-none focus:border-terracotta-400"
          >
            {Array.from({ length: 2040 - 2023 + 1 }, (_, i) => 2023 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-olive-300/60 bg-white px-3 py-2 text-sm font-bold text-olive-700 shadow-soft transition-colors hover:bg-olive-50"
            title="Bu ayı Excel (CSV) olarak indir"
          >
            <span className="text-base">⤓</span>
            <span className="hidden sm:inline">Excel'e Aktar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Ozet kutulari */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryBox label="Gelir Toplamı" value={totalGelir} tone="olive" />
            <SummaryBox label="Gider Toplamı" value={totalGider} tone="terracotta" />
            <SummaryBox label="Net Genel Toplam" value={net} tone="charcoal" />
          </div>

          {error ? (
            <div className="rounded-2xl border border-cream-200 bg-white/80 p-8 text-center">
              <p className="font-serif text-lg font-bold text-charcoal-700">📡 Panoya ulaşılamadı</p>
              <p className="mt-1 text-sm text-charcoal-600">
                Bu tablo yalnızca canlı (Netlify + MongoDB) ortamda çalışır.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-charcoal-800 text-cream-50">
                    <tr>
                      <Th className="w-28">Tarih</Th>
                      <Th className="min-w-[180px] text-left">Gider Açıklama</Th>
                      <Th className="min-w-[180px] text-left">Gelir Açıklama</Th>
                      <Th className="w-28">Gelir</Th>
                      <Th className="w-28">Gider</Th>
                      <Th className="w-32">Toplam</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-charcoal-500">
                          Yükleniyor…
                        </td>
                      </tr>
                    ) : (
                      dateList.map((date, idx) => {
                        const d = entries[date] || emptyDay()
                        const run = running[date] || 0
                        const day = idx + 1
                        return (
                          <tr
                            key={date}
                            className={idx % 2 ? 'bg-cream-50/60' : 'bg-white'}
                          >
                            <td className="whitespace-nowrap border-b border-cream-100 px-3 py-1.5 font-semibold tabular-nums text-charcoal-700">
                              {pad(day)}.{pad(month)}.{year}
                            </td>
                            <TdInput
                              value={d.giderNote}
                              onChange={(v) => updateCell(date, 'giderNote', v)}
                              placeholder="—"
                              align="left"
                            />
                            <TdInput
                              value={d.gelirNote}
                              onChange={(v) => updateCell(date, 'gelirNote', v)}
                              placeholder="—"
                              align="left"
                            />
                            <TdInput
                              value={d.gelir}
                              onChange={(v) => updateCell(date, 'gelir', v)}
                              placeholder="0"
                              numeric
                              tone="olive"
                            />
                            <TdInput
                              value={d.gider}
                              onChange={(v) => updateCell(date, 'gider', v)}
                              placeholder="0"
                              numeric
                              tone="terracotta"
                            />
                            <td
                              className={`whitespace-nowrap border-b border-cream-100 px-3 py-1.5 text-right font-extrabold tabular-nums ${
                                run < 0 ? 'text-terracotta-600' : 'text-charcoal-800'
                              }`}
                            >
                              {formatTL(run)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-3 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

function TdInput({ value, onChange, placeholder, numeric, align = 'right', tone }) {
  const toneCls =
    tone === 'olive' ? 'text-olive-700' : tone === 'terracotta' ? 'text-terracotta-600' : 'text-charcoal-800'
  return (
    <td className="border-b border-cream-100 px-1 py-0.5">
      <input
        type="text"
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'w-full rounded-md bg-transparent px-2 py-1 outline-none transition-colors placeholder:text-charcoal-300 focus:bg-cream-100',
          numeric ? `text-right font-bold tabular-nums ${toneCls}` : 'text-left text-charcoal-700',
          align === 'left' ? 'text-left' : '',
        ].join(' ')}
      />
    </td>
  )
}

function SummaryBox({ label, value, tone }) {
  const styles = {
    olive: 'bg-olive-500 text-cream-50',
    terracotta: 'bg-terracotta-500 text-cream-50',
    charcoal: 'bg-charcoal-800 text-cream-50',
  }
  return (
    <div className={`rounded-2xl p-4 shadow-card ${styles[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">{label}</p>
      <p className="mt-1 font-serif text-2xl font-extrabold tabular-nums">{formatTL(value)}</p>
    </div>
  )
}

function SaveBadge({ status }) {
  if (status === 'idle') return null
  const map = {
    saving: { t: 'Kaydediliyor…', c: 'text-charcoal-500' },
    saved: { t: 'Kaydedildi ✓', c: 'text-olive-600' },
    error: { t: 'Kayıt hatası', c: 'text-terracotta-600' },
  }
  const s = map[status]
  return <span className={`text-xs font-bold ${s.c}`}>{s.t}</span>
}
