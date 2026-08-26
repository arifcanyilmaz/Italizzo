import { useEffect, useState } from 'react'
import { fetchDashboard } from '../api'
import { formatTL } from '../lib/format'

const RANGES = [
  { days: 7, label: '7 Gün' },
  { days: 30, label: '30 Gün' },
  { days: 90, label: '90 Gün' },
]

/**
 * Satis panosu — gun gun ciro + en cok satan urun/icecek siralamalari.
 * Verinin tamami KAPATILMIS adisyonlardan (/api/dashboard) gelir.
 */
export default function Dashboard({ onBack }) {
  const [days, setDays] = useState(30)
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchDashboard(days).then((res) => {
      if (!alive) return
      if (res.ok) setState({ loading: false, error: null, data: res.data })
      else setState({ loading: false, error: res.error, data: null })
    })
    return () => {
      alive = false
    }
  }, [days])

  const { loading, error, data } = state
  const totals = data?.totals
  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-cream-50">
      {/* Ust bar */}
      <header className="flex items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur sm:px-6">
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
            <h1 className="font-serif text-2xl font-bold text-charcoal-800">📊 Satış Panosu</h1>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-600">
              Italizzo · Raporlar
            </p>
          </div>
        </div>

        {/* Aralik secici */}
        <div className="flex gap-1 rounded-full border border-cream-200 bg-white/70 p-1 shadow-soft">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-bold transition-all sm:text-sm',
                days === r.days
                  ? 'bg-terracotta-500 text-cream-50 shadow-soft'
                  : 'text-charcoal-600 hover:bg-cream-100',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <CenterNote icon="⏳" title="Yükleniyor…" />
        ) : error ? (
          <CenterNote
            icon="📡"
            title="Panoya ulaşılamadı"
            desc="Sunucuya bağlanılamadı. Bu sayfa yalnızca canlı (Netlify + MongoDB) ortamda çalışır."
          />
        ) : !totals || totals.closedCount === 0 ? (
          <CenterNote
            icon="🧾"
            title="Henüz kapatılmış hesap yok"
            desc="Bir masayı kapattığınızda ciro ve satış verileri burada görünecek."
          />
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Ozet kartlari */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Toplam Ciro" value={formatTL(totals.revenue)} accent="terracotta" />
              <StatCard label="Tahsil Edilen" value={formatTL(totals.collected)} accent="olive" />
              <StatCard label="Kapatılan Hesap" value={totals.closedCount} />
              <StatCard label="Satılan Ürün" value={totals.itemCount} />
            </div>

            {/* Gun gun ciro */}
            <Panel title="Gün Gün Ciro" icon="📅">
              <ul className="space-y-2">
                {data.daily.map((d) => (
                  <li key={d.date} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm font-semibold capitalize text-charcoal-700 sm:w-40">
                      {d.prettyDate.replace(/ \d{4}/, '')}
                    </span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-cream-100">
                      <div
                        className="h-full rounded-lg bg-terracotta-400/80"
                        style={{ width: `${Math.max(6, (d.revenue / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm font-extrabold tabular-nums text-charcoal-800">
                      {formatTL(d.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* Siralamalar */}
            <div className="grid gap-6 lg:grid-cols-2">
              <RankPanel title="En Çok Satan Ürünler" icon="🍕" rows={data.topProducts} />
              <RankPanel title="En Çok Satan İçecekler" icon="🥤" rows={data.topDrinks} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  const color =
    accent === 'terracotta'
      ? 'text-terracotta-600'
      : accent === 'olive'
        ? 'text-olive-600'
        : 'text-charcoal-800'
  return (
    <div className="rounded-2xl border border-cream-200 bg-white/80 p-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">{label}</p>
      <p className={`mt-1 font-serif text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Panel({ title, icon, children }) {
  return (
    <section className="rounded-3xl border border-cream-200 bg-white/80 p-4 shadow-card sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-bold text-charcoal-800">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function RankPanel({ title, icon, rows }) {
  return (
    <Panel title={title} icon={icon}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-charcoal-500">Bu dönemde satış yok.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((r, idx) => (
            <li
              key={r.name}
              className="flex items-center gap-3 rounded-xl border border-cream-200 bg-cream-50/60 px-3 py-2"
            >
              <span
                className={[
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-extrabold',
                  idx === 0
                    ? 'bg-terracotta-500 text-cream-50'
                    : idx < 3
                      ? 'bg-terracotta-100 text-terracotta-700'
                      : 'bg-cream-200 text-charcoal-600',
                ].join(' ')}
              >
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-semibold text-charcoal-800">
                {r.name}
              </span>
              <span className="shrink-0 rounded-full bg-olive-100 px-2 py-0.5 text-xs font-extrabold text-olive-700">
                {r.qty} adet
              </span>
              <span className="w-20 shrink-0 text-right text-sm font-bold tabular-nums text-terracotta-600">
                {formatTL(r.total)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function CenterNote({ icon, title, desc }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <span className="text-5xl opacity-70">{icon}</span>
      <p className="font-serif text-xl font-bold text-charcoal-700">{title}</p>
      {desc && <p className="max-w-sm text-sm text-charcoal-600">{desc}</p>}
    </div>
  )
}
