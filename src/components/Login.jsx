import { useState } from 'react'
import { login } from '../api'

/**
 * Basit giris ekrani. Basarili giriste onLogin({user, token}) cagrilir.
 * Oturum localStorage'da tutulur; kendiliginden cikis yapilmaz.
 */
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const auth = await login(username.trim(), password)
      onLogin({ user: auth.user, token: auth.token })
    } catch (err) {
      setError(err.message || 'Giriş başarısız')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-charcoal-800 outline-none transition-all placeholder:text-charcoal-400 focus:border-terracotta-400 focus:shadow-glow'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-cream-200 bg-cream-50/80 p-7 shadow-card backdrop-blur"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-terracotta-500 text-3xl shadow-soft">
            🍕
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-800">Italizzo</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive-600">
            Pizzeria · Trattoria
          </p>
        </div>

        <label className="mb-1.5 block text-xs font-bold text-charcoal-600">Kullanıcı Adı</label>
        <input
          className={inputCls}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kullanıcı adı"
          autoFocus
          autoComplete="username"
        />

        <label className="mb-1.5 mt-4 block text-xs font-bold text-charcoal-600">Şifre</label>
        <input
          type="password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-terracotta-50 px-3 py-2 text-sm font-bold text-terracotta-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-terracotta-500 py-3 font-extrabold text-cream-50 shadow-soft transition-all hover:bg-terracotta-600 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
}
