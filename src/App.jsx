import { useEffect, useMemo, useRef, useState } from 'react'
import { TABLES } from './data'
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  fetchMenu,
  fetchOrders,
  saveOrder,
  closeOrder,
} from './api'
import useLocalStorage from './hooks/useLocalStorage'
import { emptyOrder, orderTotals, tableStatus } from './lib/orders'
import { formatTL } from './lib/format'
import Header from './components/Header'
import MenuColumn from './components/MenuColumn'
import TablesColumn from './components/TablesColumn'
import BillColumn from './components/BillColumn'
import Login from './components/Login'

const STORAGE_ORDERS = 'italizzo.orders.v1'
const STORAGE_ACTIVE = 'italizzo.activeTable.v1'
const STORAGE_AUTH = 'italizzo.auth.v1'

export default function App() {
  const [auth, setAuth] = useLocalStorage(STORAGE_AUTH, null)
  const [orders, setOrders] = useLocalStorage(STORAGE_ORDERS, {})
  const [activeTableId, setActiveTableId] = useLocalStorage(STORAGE_ACTIVE, TABLES[0].id)
  const [mobileView, setMobileView] = useState('tables')

  // Menu MongoDB'den yuklenir (backend yoksa yedege duser)
  const [menu, setMenu] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuSource, setMenuSource] = useState('local')

  const saveTimers = useRef({})

  const activeTable = useMemo(
    () => TABLES.find((t) => t.id === activeTableId) || TABLES[0],
    [activeTableId],
  )
  const activeOrder = orders[activeTable.id]

  const openTables = useMemo(
    () => TABLES.filter((t) => tableStatus(orders[t.id]) !== 'empty').length,
    [orders],
  )
  const activeRemaining = orderTotals(activeOrder).remaining

  // Menuyu yukle (giris sonrasi)
  useEffect(() => {
    if (!auth) return
    let alive = true
    fetchMenu().then(({ items, source }) => {
      if (!alive) return
      setMenu(items)
      setMenuSource(source)
      setMenuLoading(false)
    })
    return () => {
      alive = false
    }
  }, [auth])

  // Acik adisyonlari DB'den yukle; ulasilamazsa yereldeki kalir
  useEffect(() => {
    if (!auth) return
    let alive = true
    fetchOrders().then((res) => {
      if (!alive || !res.ok) return
      const map = {}
      for (const o of res.orders) {
        map[o.tableId] = { items: o.items || [], payments: o.payments || [] }
      }
      setOrders(map)
    })
    return () => {
      alive = false
    }
  }, [auth])

  // --- DB'ye kaydet (kisa debounce ile) ---
  const persistOrder = (tableId, order) => {
    const timers = saveTimers.current
    clearTimeout(timers[tableId])
    const table = TABLES.find((t) => t.id === tableId)
    timers[tableId] = setTimeout(() => {
      saveOrder({
        tableId,
        tableName: table?.name || tableId,
        items: order.items,
        payments: order.payments,
      }).catch(() => {})
    }, 500)
  }

  const setActiveOrder = (nextOrder) => {
    setOrders((prev) => ({ ...prev, [activeTable.id]: nextOrder }))
    persistOrder(activeTable.id, nextOrder)
  }

  const mutateActive = (fn) => {
    const current = orders[activeTable.id] || emptyOrder()
    setActiveOrder(fn(current))
  }

  // --- Menu -> masaya urun ekle ---
  const handleAddItem = (item) => {
    mutateActive((order) => {
      const existing = order.items.find((i) => i.id === item.id)
      const items = existing
        ? order.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
        : [...order.items, { id: item.id, name: item.name, price: item.price, qty: 1, paidQty: 0 }]
      return { ...order, items }
    })
  }

  // --- Adet sil (yalnizca odenmemis birim; odenen adedin altina inilemez) ---
  const handleChangeQty = (itemId, delta) => {
    mutateActive((order) => {
      const items = order.items.flatMap((i) => {
        if (i.id !== itemId) return [i]
        const paidQty = i.paidQty || 0
        const newQty = Math.max(paidQty, i.qty + delta)
        if (newQty <= 0) return []
        return [{ ...i, qty: newQty }]
      })
      return { ...order, items }
    })
  }

  // --- Odeme ekle: type = 'item' | 'manual' | 'all' ---
  const handleAddPayment = (payment) => {
    mutateActive((order) => {
      const { remaining } = orderTotals(order)
      if (remaining <= 0) return order

      // Tumunu ode: tum birimler odenir
      if (payment.type === 'all') {
        const paidCounts = {}
        for (const i of order.items) {
          const add = i.qty - (i.paidQty || 0)
          if (add > 0) paidCounts[i.id] = add
        }
        const items = order.items.map((i) => ({ ...i, paidQty: i.qty }))
        const payments = [
          ...order.payments,
          { amount: remaining, at: Date.now(), type: 'all', paidCounts },
        ]
        return { ...order, items, payments }
      }

      // Urun bazli odeme: secili adetleri kilitle
      if (payment.type === 'item' && payment.paidCounts) {
        const applied = Math.min(payment.amount, remaining)
        if (applied <= 0) return order
        const items = order.items.map((i) => {
          const add = payment.paidCounts[i.id]
          return add ? { ...i, paidQty: Math.min(i.qty, (i.paidQty || 0) + add) } : i
        })
        const payments = [
          ...order.payments,
          { amount: applied, at: Date.now(), type: 'item', paidCounts: payment.paidCounts },
        ]
        return { ...order, items, payments }
      }

      // Serbest (manuel) odeme: yalnizca bakiyeyi azaltir
      const applied = Math.min(payment.amount, remaining)
      if (applied <= 0) return order
      const payments = [...order.payments, { amount: applied, at: Date.now(), type: 'manual' }]
      return { ...order, payments }
    })
  }

  // --- Odemeyi geri al (kilitli adetleri de geri acar) ---
  const handleRemovePayment = (index) => {
    mutateActive((order) => {
      const p = order.payments[index]
      if (!p) return order
      let items = order.items
      if (p.paidCounts) {
        items = order.items.map((i) => {
          const sub = p.paidCounts[i.id]
          return sub ? { ...i, paidQty: Math.max(0, (i.paidQty || 0) - sub) } : i
        })
      }
      const payments = order.payments.filter((_, idx) => idx !== index)
      return { ...order, items, payments }
    })
  }

  // --- Hesabi kapat / masayi temizle (DB'de o gunun kaydina arsivle) ---
  // Onay/uyari BillColumn'daki modalda alinir; burada dogrudan kapatilir.
  const handleClearTable = async () => {
    const id = activeTable.id
    const cur = orders[id]

    clearTimeout(saveTimers.current[id])
    try {
      if (cur && (cur.items?.length || cur.payments?.length)) {
        await saveOrder({
          tableId: id,
          tableName: activeTable.name,
          items: cur.items,
          payments: cur.payments,
        })
      }
      await closeOrder(id)
    } catch {
      /* offline: yalnizca yerelde temizlenir */
    }
    setOrders((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleSelectTable = (tableId) => {
    setActiveTableId(tableId)
    setMobileView('menu')
  }

  // --- Menuye urun ekle (DB; backend yoksa hafizada) ---
  const handleCreateMenuItem = async (payload) => {
    try {
      const created = await createMenuItem(payload)
      setMenu((prev) => [...prev, created])
      setMenuSource('db')
    } catch (err) {
      if (menuSource === 'local') {
        setMenu((prev) => [...prev, { ...payload, id: `local-${Date.now()}` }])
        return
      }
      throw err
    }
  }

  // --- Menudeki urunu guncelle (iyimser) ---
  const handleUpdateMenuItem = async (id, payload) => {
    const snapshot = menu
    setMenu((prev) => prev.map((m) => (m.id === id ? { ...m, ...payload } : m)))
    if (menuSource === 'local' || String(id).startsWith('local-')) return
    try {
      const updated = await updateMenuItem(id, payload)
      setMenu((prev) => prev.map((m) => (m.id === id ? updated : m)))
    } catch (err) {
      setMenu(snapshot)
      window.alert(`Ürün güncellenemedi: ${err.message}`)
    }
  }

  // --- Menuden urun sil (iyimser guncelleme) ---
  const handleDeleteMenuItem = async (id) => {
    const snapshot = menu
    setMenu((prev) => prev.filter((m) => m.id !== id))
    if (menuSource === 'local' || String(id).startsWith('local-')) return
    try {
      await deleteMenuItem(id)
    } catch (err) {
      setMenu(snapshot)
      window.alert(`Ürün silinemedi: ${err.message}`)
    }
  }

  const handleLogout = () => {
    if (window.confirm('Çıkış yapılsın mı?')) setAuth(null)
  }

  // --- Giris yapilmadiysa login ekrani ---
  if (!auth) return <Login onLogin={setAuth} />

  const menuEl = (
    <MenuColumn
      menu={menu}
      loading={menuLoading}
      source={menuSource}
      onAddItem={handleAddItem}
      onCreateMenuItem={handleCreateMenuItem}
      onUpdateMenuItem={handleUpdateMenuItem}
      onDeleteMenuItem={handleDeleteMenuItem}
      activeTableName={activeTable.name}
    />
  )
  const tablesEl = (
    <TablesColumn orders={orders} activeTableId={activeTable.id} onSelectTable={handleSelectTable} />
  )
  const billEl = (
    <BillColumn
      table={activeTable}
      order={activeOrder}
      onChangeQty={handleChangeQty}
      onAddPayment={handleAddPayment}
      onRemovePayment={handleRemovePayment}
      onClearTable={handleClearTable}
    />
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header openTables={openTables} onLogout={handleLogout} />

      {/* Mobil/tablet panel gecis kontrolu */}
      <nav className="flex gap-1.5 border-b border-cream-200 bg-cream-50/80 px-3 py-2 lg:hidden">
        <MobileTab active={mobileView === 'menu'} onClick={() => setMobileView('menu')} icon="📖" label="Menü" />
        <MobileTab
          active={mobileView === 'tables'}
          onClick={() => setMobileView('tables')}
          icon="🍽️"
          label="Masalar"
          badge={openTables > 0 ? openTables : null}
        />
        <MobileTab
          active={mobileView === 'bill'}
          onClick={() => setMobileView('bill')}
          icon="🧾"
          label="Adisyon"
          badge={activeRemaining > 0 ? formatTL(activeRemaining) : null}
        />
      </nav>

      <main className="flex-1 overflow-hidden p-3 sm:p-4">
        {/* Masaustu: 3 sutun */}
        <div className="hidden h-full gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {menuEl}
          {tablesEl}
          {billEl}
        </div>

        {/* Mobil/tablet: tek panel */}
        <div className="h-full lg:hidden">
          {mobileView === 'menu' && menuEl}
          {mobileView === 'tables' && tablesEl}
          {mobileView === 'bill' && billEl}
        </div>
      </main>
    </div>
  )
}

function MobileTab({ active, onClick, icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold transition-all',
        active ? 'bg-terracotta-500 text-cream-50 shadow-soft' : 'bg-white/70 text-charcoal-700 hover:bg-cream-100',
      ].join(' ')}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      {badge != null && (
        <span
          className={[
            'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums',
            active ? 'bg-cream-50 text-terracotta-600' : 'bg-terracotta-500 text-cream-50',
          ].join(' ')}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
