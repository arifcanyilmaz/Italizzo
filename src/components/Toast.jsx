/**
 * Kisa bildirim (native window.alert yerine). Kendi kendine kapanir (App yonetir).
 * toast: { message, tone: 'error' | 'success' | 'info' } | null
 */
const TONES = {
  error: { bg: 'bg-terracotta-600', icon: '⚠️' },
  success: { bg: 'bg-olive-600', icon: '✓' },
  info: { bg: 'bg-charcoal-800', icon: 'ℹ️' },
}

export default function Toast({ toast, onClose }) {
  if (!toast) return null
  const t = TONES[toast.tone] || TONES.info
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold text-cream-50 shadow-card ${t.bg} animate-slide-up`}
        role="status"
      >
        <span className="text-base">{t.icon}</span>
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-1 text-cream-50/80 transition-colors hover:text-cream-50"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
