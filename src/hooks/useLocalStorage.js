import { useEffect, useRef, useState } from 'react'

/**
 * Degeri tarayici localStorage'inda kalici tutan basit hook.
 * Sayfa yenilense de veri kaybolmaz (veritabani gerektirmez).
 *
 * @param {string} key   localStorage anahtari
 * @param {*}      initial  ilk deger (kayit yoksa kullanilir)
 */
export default function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })

  // Yazma hatalarinda uygulama cokmesin diye try/catch
  const keyRef = useRef(key)
  keyRef.current = key

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value))
    } catch {
      /* kota dolu / gizli mod: sessizce yoksay */
    }
  }, [value])

  return [value, setValue]
}
