import { useEffect, useState } from 'react'

/**
 * Basit sifre kapisi (JWT/oturum YOK — sadece rastgele biri gormesin diye).
 * Dogru sifre girilince onSuccess cagirilir. Hicbir yerde saklanmaz;
 * her acilista tekrar sorulur.
 */
export default function PasswordModal({ title = 'Şifre Gerekli', expected, onSuccess, onCancel }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = (e) => {
    e.preventDefault()
    if (value === expected) onSuccess()
    else setError(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-cream-200 bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-terracotta-50 text-2xl">
            🔒
          </span>
          <h3 className="font-serif text-xl font-bold text-charcoal-800">{title}</h3>
        </div>

        <p className="mb-3 text-sm text-charcoal-600">Devam etmek için şifreyi girin.</p>

        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          autoFocus
          placeholder="••••••••"
          className={[
            'w-full rounded-xl border bg-white px-3 py-2.5 text-base font-bold text-charcoal-800 outline-none transition-all',
            error
              ? 'border-terracotta-400 focus:shadow-glow'
              : 'border-cream-200 focus:border-terracotta-400 focus:shadow-glow',
          ].join(' ')}
        />
        {error && <p className="mt-2 text-xs font-bold text-terracotta-600">Şifre hatalı.</p>}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-cream-200 py-2.5 text-sm font-bold text-charcoal-600 transition-all hover:bg-cream-100 active:scale-[0.98]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-charcoal-800 py-2.5 text-sm font-extrabold text-cream-50 shadow-soft transition-all hover:bg-charcoal-900 active:scale-[0.98]"
          >
            Gir
          </button>
        </div>
      </form>
    </div>
  )
}
