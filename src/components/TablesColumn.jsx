import { TABLES } from '../data'
import { formatTL } from '../lib/format'
import { orderTotals, tableStatus } from '../lib/orders'

const ZONES = ['Salon', 'Bahçe', 'VIP']

const STATUS_STYLES = {
  empty: {
    card: 'border-olive-300/50 bg-white/70 hover:border-olive-400 text-charcoal-700',
    dot: 'bg-olive-400',
    label: 'Boş',
    labelClass: 'text-olive-600',
  },
  occupied: {
    card: 'border-terracotta-300 bg-terracotta-50 text-charcoal-800',
    dot: 'bg-terracotta-500',
    label: 'Adisyon Açık',
    labelClass: 'text-terracotta-600',
  },
  paid: {
    card: 'border-olive-400 bg-olive-50 text-charcoal-800',
    dot: 'bg-olive-500',
    label: 'Ödendi',
    labelClass: 'text-olive-700',
  },
}

/**
 * ORTA SUTUN - Masa Yonetimi / Kat Plani
 * Masalar bolgelere gore gruplanir; durumlarina gore renklenir.
 * Masaya tiklaninca aktif olur ve sag panelde hesabi yuklenir.
 */
export default function TablesColumn({ orders, activeTableId, onSelectTable }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-cream-200 bg-cream-50/70 shadow-card">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="font-serif text-xl font-bold text-charcoal-800">Kat Planı</h2>
          <p className="text-xs text-charcoal-600">Masayı seçin ve adisyonu açın</p>
        </div>
        <span className="text-2xl">🍽️</span>
      </div>

      {/* Durum aciklamasi (legend) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 text-xs font-semibold">
        <Legend color="bg-olive-400" label="Boş" />
        <Legend color="bg-terracotta-500" label="Adisyon Açık" />
        <Legend color="bg-olive-500" label="Ödendi" />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
        {ZONES.map((zone) => {
          const zoneTables = TABLES.filter((t) => t.zone === zone)
          if (zoneTables.length === 0) return null
          return (
            <div key={zone}>
              <div className="mb-2.5 flex items-center gap-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-charcoal-600">
                  {zone}
                </h3>
                <span className="h-px flex-1 bg-cream-200" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {zoneTables.map((table) => {
                  const order = orders[table.id]
                  const status = tableStatus(order)
                  const { subtotal, remaining, itemCount } = orderTotals(order)
                  const style = STATUS_STYLES[status]
                  const isActive = table.id === activeTableId

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => onSelectTable(table.id)}
                      className={[
                        'relative flex flex-col gap-2 rounded-2xl border-2 p-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card',
                        style.card,
                        isActive ? 'ring-4 ring-terracotta-500/25 ring-offset-1 ring-offset-cream-50' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-base font-bold leading-none">
                          {table.name}
                        </span>
                        <span className={`h-3 w-3 rounded-full ${style.dot}`} />
                      </div>

                      {status === 'empty' ? (
                        <span className={`text-xs font-bold ${style.labelClass}`}>
                          {style.label}
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-baseline justify-between gap-1">
                            <span className={`text-[11px] font-bold ${style.labelClass}`}>
                              {status === 'paid' ? 'Ödendi' : `${itemCount} ürün`}
                            </span>
                          </div>
                          <div className="text-sm font-extrabold tabular-nums text-charcoal-800">
                            {status === 'paid' ? formatTL(subtotal) : formatTL(remaining)}
                          </div>
                          {status === 'occupied' && (
                            <div className="text-[10px] text-charcoal-600">kalan bakiye</div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-charcoal-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}
