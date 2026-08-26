// Adisyon (siparis) hesaplama yardimcilari - tek kaynaktan kullanilir.

/** Bos bir adisyon nesnesi olusturur */
export function emptyOrder() {
  return { items: [], payments: [] }
}

/**
 * Bir adisyonun ara toplam, odenen ve kalan tutarlarini hesaplar.
 * @returns {{ subtotal:number, paid:number, remaining:number, itemCount:number }}
 */
export function orderTotals(order) {
  const items = order?.items || []
  const payments = order?.payments || []
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const paid = payments.reduce((sum, p) => sum + p.amount, 0)
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0)
  return {
    subtotal,
    paid,
    remaining: Math.max(0, subtotal - paid),
    itemCount,
  }
}

/**
 * Masa durumu:
 *  - 'empty'    : adisyon yok / urun yok        -> yesilimsi-gri
 *  - 'paid'     : urun var ama kalan bakiye 0   -> zeytin yesili (kapatmaya hazir)
 *  - 'occupied' : adisyon acik, bakiye var      -> terracotta
 */
export function tableStatus(order) {
  const { subtotal, remaining } = orderTotals(order)
  if (subtotal <= 0) return 'empty'
  if (remaining <= 0) return 'paid'
  return 'occupied'
}
