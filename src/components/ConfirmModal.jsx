import { useEffect } from 'react'

/**
 * Genel onay penceresi (native window.confirm yerine).
 * Tum uygulamada tutarli gorunum icin tek yerden kullanilir.
 *
 * props:
 *  - title, message         : baslik + aciklama
 *  - warning                : (opsiyonel) turuncu uyari kutusu metni
 *  - icon                   : baslik ikonu (emoji)
 *  - confirmLabel/cancelLabel
 *  - tone: 'dark' | 'danger'  -> onay butonu rengi
 */
export default function ConfirmModal({
  title,
  message,
  warning,
  icon = '❓',
  confirmLabel = 'Evet',
  cancelLabel = 'Vazgeç',
  tone = 'dark',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const confirmCls =
    tone === 'danger'
      ? 'bg-terracotta-500 hover:bg-terracotta-600'
      : 'bg-charcoal-800 hover:bg-charcoal-900'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-cream-200 bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-terracotta-50 text-2xl">
            {icon}
          </span>
          <h3 className="font-serif text-xl font-bold text-charcoal-800">{title}</h3>
        </div>

        {message && <p className="text-sm leading-relaxed text-charcoal-600">{message}</p>}

        {warning && (
          <div className="mt-3 rounded-2xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm font-semibold text-terracotta-700">
            ⚠️ {warning}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-cream-200 py-2.5 text-sm font-bold text-charcoal-600 transition-all hover:bg-cream-100 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`flex-1 rounded-xl py-2.5 text-sm font-extrabold text-cream-50 shadow-soft transition-all active:scale-[0.98] ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
