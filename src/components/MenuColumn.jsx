import { useMemo, useState } from 'react'
import { CATEGORIES, groupByCategory } from '../data'
import { formatTL, parseAmount } from '../lib/format'
import ConfirmModal from './ConfirmModal'

const DEFAULT_CAT = CATEGORIES.find((c) => c.id === 'pizza')?.id || CATEGORIES[0].id

/**
 * SOL SUTUN - Menu & Kategoriler (kompakt)
 *  - Urunler MongoDB'den gelir; satira/"+"ya tiklaninca secili masaya eklenir.
 *  - "+ Ekle" ile menuye yeni urun; satir kosesindeki cop kutusu ile silme.
 *  - Kalem ikonu ile urun duzenleme (isim/kategori/fiyat).
 */
export default function MenuColumn({
  menu,
  loading,
  source,
  onAddItem,
  onCreateMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  activeTableName,
}) {
  const [activeCat, setActiveCat] = useState(DEFAULT_CAT)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null) // silinecek urun

  const grouped = useMemo(() => groupByCategory(menu), [menu])
  const items = grouped[activeCat] || []

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-cream-200 bg-cream-50/70 shadow-card">
      {/* Baslik */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-bold text-charcoal-800">Menü</h2>
          <p className="truncate text-[11px] text-charcoal-600">
            Masa: <span className="font-bold text-terracotta-600">{activeTableName}</span>
            {source === 'local' && (
              <span className="ml-1.5 rounded-full bg-cream-200 px-1.5 py-0.5 text-[9px] font-bold text-charcoal-600">
                çevrimdışı
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className={[
            'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all',
            showForm ? 'bg-charcoal-800 text-cream-50' : 'bg-olive-500 text-cream-50 shadow-soft hover:bg-olive-600',
          ].join(' ')}
        >
          <span className="text-sm leading-none">{showForm ? '×' : '+'}</span>
          {showForm ? 'Kapat' : 'Ekle'}
        </button>
      </div>

      {/* Yeni urun formu */}
      {showForm && (
        <AddItemForm
          defaultCategory={activeCat}
          onCreate={onCreateMenuItem}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Kategori sekmeleri (dar sutunda satira sigsin diye wrap) */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCat
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={[
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all duration-200',
                isActive
                  ? 'bg-terracotta-500 text-cream-50 shadow-soft'
                  : 'bg-white/70 text-charcoal-700 hover:bg-cream-100 hover:text-terracotta-600',
              ].join(' ')}
            >
              <span className="text-sm">{cat.icon}</span>
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Urun listesi (kompakt satirlar) */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-charcoal-600">Menü yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-charcoal-600">
            Bu kategoride ürün yok. “+ Ekle” ile ekleyin.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-cream-200 bg-white/80 shadow-soft transition-all duration-200 hover:border-terracotta-300 hover:shadow-card"
              >
                <div className="flex items-center gap-1.5 py-2 pl-3.5 pr-2.5">
                  {/* İsim + fiyat — tıklanınca masaya ekle */}
                  <button
                    type="button"
                    onClick={() => onAddItem(item)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-semibold text-charcoal-800">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-terracotta-600">
                      {formatTL(item.price)}
                    </span>
                  </button>

                  {/* Düzenle — küçük, hover'da görünür */}
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] text-charcoal-400 opacity-0 shadow-soft transition-all hover:bg-olive-50 hover:text-olive-600 group-hover:opacity-100"
                    title="Düzenle"
                    aria-label={`${item.name} düzenle`}
                  >
                    ✎
                  </button>

                  {/* Sil — küçük, hover'da görünür */}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] text-charcoal-400 opacity-0 shadow-soft transition-all hover:bg-terracotta-50 hover:text-terracotta-600 group-hover:opacity-100"
                    title="Menüden sil"
                    aria-label={`${item.name} sil`}
                  >
                    ✕
                  </button>

                  {/* Ekle (+) — en büyük, her zaman görünür */}
                  <button
                    type="button"
                    onClick={() => onAddItem(item)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-olive-500 text-base font-bold text-cream-50 shadow-soft transition-transform duration-200 group-hover:scale-110"
                    aria-label={`${item.name} masaya ekle`}
                  >
                    +
                  </button>
                </div>

                {/* Satır içi düzenleme formu */}
                {editingId === item.id && (
                  <EditItemForm
                    item={item}
                    onUpdate={async (payload) => {
                      await onUpdateMenuItem(item.id, payload)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingDelete && (
        <ConfirmModal
          icon="🗑️"
          title="Ürünü Sil"
          message={`"${pendingDelete.name}" menüden kalıcı olarak silinecek.`}
          confirmLabel="Sil"
          cancelLabel="Vazgeç"
          tone="danger"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteMenuItem(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      )}
    </section>
  )
}

// --- Satir ici duzenleme formu ---
function EditItemForm({ item, onUpdate, onCancel }) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [price, setPrice] = useState(String(item.price))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const cleanName = name.trim()
    const numPrice = parseAmount(price)
    if (!cleanName) return setError('Ürün adı girin.')
    if (!(numPrice > 0)) return setError('Geçerli bir fiyat girin.')

    setSaving(true)
    try {
      await onUpdate({ name: cleanName, category, price: numPrice })
    } catch (err) {
      setError(err.message || 'Güncellenemedi.')
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-sm text-charcoal-800 outline-none transition-all placeholder:text-charcoal-400 focus:border-terracotta-400 focus:shadow-glow'

  return (
    <form
      onSubmit={submit}
      className="animate-slide-up space-y-1.5 border-t border-olive-100 bg-olive-50/60 p-3"
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-olive-600">Düzenle</p>
      <input
        className={inputCls}
        placeholder="Ürün adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-charcoal-400">
          ₺
        </span>
        <input
          className={`${inputCls} pl-7 tabular-nums`}
          placeholder="Fiyat"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      {error && <p className="text-xs font-bold text-terracotta-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-olive-500 py-1.5 text-sm font-extrabold text-cream-50 shadow-soft transition-all hover:bg-olive-600 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-cream-100 px-3 py-1.5 text-sm font-bold text-charcoal-600 transition-all hover:bg-cream-200"
        >
          İptal
        </button>
      </div>
    </form>
  )
}

// --- Yeni urun ekleme formu (alanlar alt alta -> tasma yok) ---
function AddItemForm({ defaultCategory, onCreate, onDone }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const cleanName = name.trim()
    const numPrice = parseAmount(price)
    if (!cleanName) return setError('Ürün adı girin.')
    if (!(numPrice > 0)) return setError('Geçerli bir fiyat girin.')

    setSaving(true)
    try {
      await onCreate({ name: cleanName, category, price: numPrice })
      setName('')
      setPrice('')
      onDone?.()
    } catch (err) {
      setError(err.message || 'Ürün eklenemedi.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-charcoal-800 outline-none transition-all placeholder:text-charcoal-400 focus:border-terracotta-400 focus:shadow-glow'

  return (
    <form
      onSubmit={submit}
      className="mx-4 mt-2 animate-slide-up space-y-2 rounded-2xl border border-olive-100 bg-white/90 p-3 shadow-soft"
    >
      <p className="text-sm font-extrabold text-charcoal-800">Yeni Ürün</p>
      <input
        className={inputCls}
        placeholder="Ürün adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-charcoal-400">
          ₺
        </span>
        <input
          className={`${inputCls} pl-7 tabular-nums`}
          placeholder="Fiyat"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      {error && <p className="text-xs font-bold text-terracotta-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-terracotta-500 py-2 text-sm font-extrabold text-cream-50 shadow-soft transition-all hover:bg-terracotta-600 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Ekleniyor…' : 'Menüye Ekle'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-cream-100 px-3 py-2 text-sm font-bold text-charcoal-600 transition-all hover:bg-cream-200"
        >
          Vazgeç
        </button>
      </div>
    </form>
  )
}
