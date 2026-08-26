// Backend (Netlify Functions -> MongoDB) API istemcisi.
// Backend'e ulasilamazsa uygulama cokmesin diye uygun yerlerde yedege duser.

import { MENU as FALLBACK_MENU } from './data'

// ------------------------------------------------------------------ Menu ----

export async function fetchMenu() {
  try {
    const res = await fetch('/api/menu', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Beklenmeyen yanıt')
    return { items: data, source: 'db' }
  } catch (err) {
    return { items: FALLBACK_MENU, source: 'local', error: err.message }
  }
}

export async function createMenuItem(payload) {
  const res = await fetch('/api/menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ürün eklenemedi')
  return data
}

export async function updateMenuItem(id, payload) {
  const res = await fetch(`/api/menu?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ürün güncellenemedi')
  return data
}

export async function deleteMenuItem(id) {
  const res = await fetch(`/api/menu?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ürün silinemedi')
  return data
}

// ---------------------------------------------------------------- Orders ----

/** Tum ACIK adisyonlari getirir. Backend yoksa { ok:false } doner. */
export async function fetchOrders() {
  try {
    const res = await fetch('/api/orders', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Beklenmeyen yanıt')
    return { ok: true, orders: data }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

/** Bir masanin acik adisyonunu kaydeder (upsert). */
export async function saveOrder({ tableId, tableName, items, payments }) {
  const res = await fetch('/api/orders', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId, tableName, items, payments }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Adisyon kaydedilemedi')
  }
  return res.json().catch(() => ({}))
}

/** Bir masayi kapatir / arsivler (o gunun kaydina gecer). */
export async function closeOrder(tableId) {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Masa kapatılamadı')
  }
  return res.json().catch(() => ({}))
}

// ----------------------------------------------------------------- Login ----

/**
 * Giris. Backend varsa /api/login dogrular. Backend'e ULASILAMAZSA
 * (yerel/offline gelistirme) yalnizca admin/admin kabul edilir.
 */
export async function login(username, password) {
  let res
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    // Sunucuya hic ulasilamadi -> offline gelistirme yedegi
    if (username === 'admin' && password === 'admin') {
      return { ok: true, user: username, token: 'local-dev' }
    }
    throw new Error('Sunucuya ulaşılamadı')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Kullanıcı adı veya şifre hatalı')
  return data
}
