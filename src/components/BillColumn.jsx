import { useEffect, useMemo, useState } from 'react'
import { formatTL, formatTime, parseAmount } from '../lib/format'
import { orderTotals } from '../lib/orders'
import ConfirmModal from './ConfirmModal'

const PAYMENT_LABEL = { item: 'Ürün ödemesi', manual: 'Serbest ödeme', all: 'Tümü ödendi' }

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * Adisyonun yazdirilabilir fisini yeni pencerede acar ve yazdirma ekranini getirir
 * (Ctrl+P gibi). Termal fis gorunumu (~76mm, monospace).
 */
function openReceiptPrint({ table, items, payments, subtotal, paid, remaining, itemCount }) {
  const now = new Date().toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const itemRows = items
    .map(
      (i) => `
      <tr>
        <td class="q">${i.qty}×</td>
        <td class="n">${esc(i.name)}</td>
        <td class="a">${formatTL(i.price * i.qty)}</td>
      </tr>`,
    )
    .join('')

  const paymentRows = payments.length
    ? `<div class="sec">ALINAN ÖDEMELER</div>` +
      payments
        .map(
          (p) => `
      <div class="pay">
        <span>${PAYMENT_LABEL[p.type] || 'Ödeme'} · ${formatTime(p.at)}</span>
        <span>−${formatTL(p.amount)}</span>
      </div>`,
        )
        .join('')
    : ''

  const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Adisyon · ${esc(table.name)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { width: 72mm; margin: 0 auto; font-family: 'Courier New', monospace; color: #000; font-size: 12px; }
  h1 { text-align: center; font-size: 20px; margin: 0; letter-spacing: 1px; }
  .sub { text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 2px 0 8px; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  .dash { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  td.q { width: 26px; }
  td.n { padding-right: 6px; }
  td.a { text-align: right; white-space: nowrap; }
  .tot { display: flex; justify-content: space-between; margin: 2px 0; }
  .tot.big { font-size: 15px; font-weight: bold; }
  .sec { font-size: 10px; letter-spacing: 1px; margin: 6px 0 2px; }
  .pay { display: flex; justify-content: space-between; font-size: 11px; }
  .foot { text-align: center; margin-top: 10px; font-size: 11px; }
</style></head>
<body>
  <h1>ITALIZZO</h1>
  <div class="sub">Pizzeria · Trattoria</div>
  <div class="meta"><span>${esc(table.name)}${table.zone ? ' · ' + esc(table.zone) : ''}</span><span>${now}</span></div>
  <div class="dash"></div>
  <table>${itemRows}</table>
  <div class="dash"></div>
  <div class="tot"><span>Ara Toplam (${itemCount} ürün)</span><span>${formatTL(subtotal)}</span></div>
  ${paid > 0 ? `<div class="tot"><span>Ödenen</span><span>−${formatTL(paid)}</span></div>` : ''}
  <div class="tot big"><span>${remaining > 0 ? 'KALAN' : 'ÖDENDİ'}</span><span>${formatTL(remaining)}</span></div>
  ${paymentRows}
  <div class="dash"></div>
  <div class="foot">Afiyet olsun! · Teşekkür ederiz</div>
  <script>window.onload = function(){ window.print(); }; window.onafterprint = function(){ window.close(); };</script>
</body></html>`

  const w = window.open('', 'ITALIZZO_RECEIPT', 'width=380,height=640')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  return true
}


export default function BillColumn({
  table,
  order,
  onChangeQty,
  onAddPayment,
  onRemovePayment,
  onClearTable,
}) {
  const [manualAmount, setManualAmount] = useState('')
  const [selectedUnits, setSelectedUnits] = useState(() => new Set())
  const [confirmClear, setConfirmClear] = useState(false)

  const { subtotal, paid, remaining, itemCount } = orderTotals(order)
  const items = order?.items || []
  const payments = order?.payments || []
  const isEmpty = items.length === 0

  
  useEffect(() => {
    setSelectedUnits(new Set())
    setManualAmount('')
    setConfirmClear(false)
  }, [table.id])

  // Urunler degisince (adet/odenen) gecersiz secim anahtarlarini temizle
  const itemsSig = items.map((i) => `${i.id}:${i.qty}:${i.paidQty || 0}`).join('|')
  useEffect(() => {
    setSelectedUnits((prev) => {
      let changed = false
      const next = new Set()
      for (const key of prev) {
        const [id, posStr] = key.split('#')
        const pos = Number(posStr)
        const it = items.find((i) => i.id === id)
        if (it && pos >= (it.paidQty || 0) && pos < it.qty) next.add(key)
        else changed = true
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSig])

  // Secili birimlerin toplami
  const selectedValue = useMemo(() => {
    let sum = 0
    for (const key of selectedUnits) {
      const id = key.split('#')[0]
      const it = items.find((i) => i.id === id)
      if (it) sum += it.price
    }
    return sum
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnits, itemsSig])

  const hasSelection = selectedUnits.size > 0
  const manualValue = parseAmount(manualAmount)
  const amountToPay = hasSelection ? selectedValue : Math.min(manualValue, remaining)
  const canPay = amountToPay > 0 && remaining > 0

  const toggleUnit = (itemId, pos, price) => {
    const key = `${itemId}#${pos}`
    setSelectedUnits((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      // Secim, kalan bakiyeyi asamaz
      if (selectedValue + price > remaining + 0.001) return prev
      next.add(key)
      return next
    })
  }

  const submitPayment = (e) => {
    e?.preventDefault()
    if (!canPay) return
    if (hasSelection) {
      const paidCounts = {}
      let amount = 0
      for (const key of selectedUnits) {
        const id = key.split('#')[0]
        const it = items.find((i) => i.id === id)
        if (!it) continue
        paidCounts[id] = (paidCounts[id] || 0) + 1
        amount += it.price
      }
      if (amount <= 0) return
      onAddPayment({ type: 'item', amount, paidCounts })
      setSelectedUnits(new Set())
    } else {
      onAddPayment({ type: 'manual', amount: amountToPay })
      setManualAmount('')
    }
  }

  const payAll = () => {
    if (remaining <= 0) return
    onAddPayment({ type: 'all' })
    setSelectedUnits(new Set())
    setManualAmount('')
  }

  const handleClear = () => {
    if (isEmpty) return
    setConfirmClear(true)
  }

  const confirmClearTable = () => {
    setSelectedUnits(new Set())
    setManualAmount('')
    setConfirmClear(false)
    onClearTable()
  }

  const handlePrint = () => {
    if (isEmpty) return
    openReceiptPrint({ table, items, payments, subtotal, paid, remaining, itemCount })
  }

  // Urunleri birim birim satirlara ac
  const unitRows = items.flatMap((item) => {
    const paidQty = item.paidQty || 0
    return Array.from({ length: item.qty }, (_, pos) => ({
      key: `${item.id}#${pos}`,
      item,
      pos,
      paid: pos < paidQty,
    }))
  })

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-cream-200 bg-white/80 shadow-card">
      {/* Baslik */}
      <div className="flex items-center justify-between gap-3 border-b border-cream-200 bg-charcoal-800 px-5 py-4 text-cream-50">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-200/80">
            Adisyon · {table.zone}
          </p>
          <h2 className="font-serif text-2xl font-bold">{table.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-cream-200/70">Toplam</p>
          <p className="font-serif text-2xl font-bold tabular-nums">{formatTL(subtotal)}</p>
        </div>
      </div>

      {/* Birim satirlari */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="text-5xl opacity-70">🧾</span>
            <p className="font-serif text-lg font-semibold text-charcoal-700">Adisyon boş</p>
            <p className="max-w-[220px] text-sm text-charcoal-600">
              Soldaki menüden ürün ekleyerek <strong>{table.name}</strong> için hesabı başlatın.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-[11px] font-semibold text-charcoal-500">
              Ödenen adedi ✓ ile işaretleyin — tutar aşağıda toplanır.
            </p>
            <ul className="space-y-1.5">
              {unitRows.map(({ key, item, pos, paid: isPaid }) => {
                const selected = selectedUnits.has(key)
                const disabledAdd =
                  !selected && (remaining <= 0 || selectedValue + item.price > remaining + 0.001)
                return (
                  <li
                    key={key}
                    className={[
                      'flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors',
                      isPaid
                        ? 'border-olive-100 bg-olive-50/70'
                        : selected
                          ? 'border-olive-400 bg-olive-50'
                          : 'border-cream-200 bg-cream-50/70',
                    ].join(' ')}
                  >
                    {isPaid ? (
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-olive-500 text-sm font-bold text-cream-50"
                        title="Ödendi"
                      >
                        ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleUnit(item.id, pos, item.price)}
                        disabled={disabledAdd}
                        className={[
                          'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold transition-all',
                          selected
                            ? 'border-olive-500 bg-olive-500 text-cream-50'
                            : 'border-cream-300 bg-white text-transparent hover:border-olive-400',
                          disabledAdd ? 'cursor-not-allowed opacity-40' : '',
                        ].join(' ')}
                        aria-pressed={selected}
                        aria-label={selected ? 'Seçimi kaldır' : 'Ödeme için seç'}
                      >
                        ✓
                      </button>
                    )}

                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          'truncate font-serif text-[15px] font-semibold',
                          isPaid ? 'text-charcoal-500 line-through' : 'text-charcoal-800',
                        ].join(' ')}
                      >
                        {item.name}
                      </p>
                    </div>

                    <span
                      className={[
                        'shrink-0 text-sm font-bold tabular-nums',
                        isPaid ? 'text-olive-600' : 'text-terracotta-600',
                      ].join(' ')}
                    >
                      {formatTL(item.price)}
                    </span>

                    {isPaid ? (
                      <span className="shrink-0 rounded-full bg-olive-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-olive-700">
                        Ödendi
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onChangeQty(item.id, -1)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-charcoal-500 transition-colors hover:bg-terracotta-50 hover:text-terracotta-600"
                        aria-label="Bu adedi sil"
                        title="Bu adedi sil"
                      >
                        🗑️
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {/* Odeme gecmisi */}
        {payments.length > 0 && (
          <div className="mt-4 rounded-2xl border border-olive-100 bg-olive-50/60 p-3">
            <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-olive-700">
              Alınan Ödemeler ({payments.length})
            </p>
            <ul className="space-y-1">
              {payments.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-charcoal-700">
                    <span>💰</span>
                    <span className="font-semibold">{PAYMENT_LABEL[p.type] || 'Ödeme'}</span>
                    <span className="text-xs text-charcoal-500">{formatTime(p.at)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-olive-700">−{formatTL(p.amount)}</span>
                    <button
                      type="button"
                      onClick={() => onRemovePayment(idx)}
                      className="text-xs text-charcoal-400 transition-colors hover:text-terracotta-600"
                      title="Ödemeyi geri al"
                      aria-label="Ödemeyi geri al"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Ozet + odeme + islemler */}
      <div className="space-y-3 border-t border-cream-200 bg-cream-50/80 p-4">
        <div className="space-y-1.5 rounded-2xl bg-white/80 p-3 shadow-soft">
          <Row label={`Ara Toplam (${itemCount} ürün)`} value={formatTL(subtotal)} />
          {paid > 0 && <Row label="Ödenen" value={`−${formatTL(paid)}`} accent="olive" />}
          <div className="my-1 h-px bg-cream-200" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-charcoal-700">Kalan Bakiye</span>
            <span
              className={`font-serif text-2xl font-extrabold tabular-nums ${
                remaining > 0 ? 'text-terracotta-600' : 'text-olive-600'
              }`}
            >
              {formatTL(remaining)}
            </span>
          </div>
        </div>

        <form onSubmit={submitPayment} className="rounded-2xl bg-white/80 p-3 shadow-soft">
          {hasSelection ? (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-olive-50 px-3 py-2.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-olive-700">
                  Seçili {selectedUnits.size} adet
                </p>
                <p className="font-serif text-xl font-extrabold tabular-nums text-charcoal-800">
                  {formatTL(selectedValue)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUnits(new Set())}
                className="rounded-lg px-2 py-1 text-xs font-bold text-charcoal-500 transition-colors hover:text-terracotta-600"
              >
                Seçimi Temizle
              </button>
            </div>
          ) : (
            <div className="relative mb-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-charcoal-400">
                ₺
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="Serbest tutar (ör. 200)"
                disabled={isEmpty || remaining <= 0}
                className="w-full rounded-xl border border-cream-200 bg-white py-2.5 pl-7 pr-3 text-base font-bold tabular-nums text-charcoal-800 outline-none transition-all placeholder:font-normal placeholder:text-charcoal-400 focus:border-terracotta-400 focus:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!canPay}
            className="w-full rounded-xl bg-terracotta-500 py-2.5 text-sm font-extrabold text-cream-50 shadow-soft transition-all hover:bg-terracotta-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {amountToPay > 0 ? `${formatTL(amountToPay)} Tutar Düş` : 'Tutar Düş'}
          </button>

          <button
            type="button"
            onClick={payAll}
            disabled={isEmpty || remaining <= 0}
            className="mt-2 w-full rounded-xl border-2 border-olive-400 py-2 text-sm font-bold text-olive-700 transition-all hover:bg-olive-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Kalanı Tümüyle Öde ({formatTL(remaining)})
          </button>
        </form>

        <button
          type="button"
          onClick={handlePrint}
          disabled={isEmpty}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-charcoal-300 bg-white py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal-700 shadow-soft transition-all hover:bg-cream-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-base">🖨️</span> Çıktı Al
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="w-full rounded-2xl bg-charcoal-800 py-3 text-sm font-extrabold uppercase tracking-wide text-cream-50 shadow-card transition-all hover:bg-charcoal-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hesabı Kapat / Masayı Temizle
        </button>
      </div>

      {confirmClear && (
        <ConfirmModal
          icon="🧾"
          title="Hesabı Kapat"
          message={`${table.name} hesabı kapatılıp masa sıfırlanacak. Kayıt günün raporuna işlenir.`}
          warning={remaining > 0 ? `Henüz ödenmemiş ${formatTL(remaining)} var.` : null}
          confirmLabel="Evet, Kapat"
          cancelLabel="Vazgeç"
          tone="dark"
          onCancel={() => setConfirmClear(false)}
          onConfirm={confirmClearTable}
        />
      )}
    </section>
  )
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-charcoal-600">{label}</span>
      <span
        className={`font-bold tabular-nums ${
          accent === 'olive' ? 'text-olive-600' : 'text-charcoal-800'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
