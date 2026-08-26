import { useEffect, useState } from 'react'

/** Ust bar: marka kimligi + canli saat + acik masa ozeti + cikis */
export default function Header({ openTables, onLogout }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(t)
  }, [])

  const dateLabel = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const timeLabel = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="flex items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-terracotta-500 text-xl shadow-soft">
          🍕
        </div>
        <div className="leading-tight">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal-800 sm:text-[26px]">
            Italizzo
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-600">
            Pizzeria · Trattoria
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold capitalize text-charcoal-700">{dateLabel}</p>
          <p className="text-xs text-charcoal-600">{timeLabel}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-terracotta-300/50 bg-white/70 px-3 py-1.5 shadow-soft">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terracotta-500" />
          </span>
          <span className="text-sm font-extrabold tabular-nums text-charcoal-800">
            {openTables}
          </span>
          <span className="text-xs font-semibold text-charcoal-600">açık masa</span>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="grid h-9 w-9 place-items-center rounded-full border border-cream-200 bg-white/70 text-charcoal-600 shadow-soft transition-colors hover:bg-terracotta-50 hover:text-terracotta-600"
            title="Çıkış yap"
            aria-label="Çıkış yap"
          >
            ⎋
          </button>
        )}
      </div>
    </header>
  )
}
