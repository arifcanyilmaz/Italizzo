// ---------------------------------------------------------------------------
//  Italizzo - Kategori & masa tanimlari
//
//  Menu artik TAMAMEN MongoDB'den cekilir (bkz. src/api.js). Sabit/mock urun
//  yoktur; urunler "+ Ekle" formundan (ya da dogrudan DB'den) girilir.
//  MENU yalnizca backend'e HIC ulasilamazsa (ag hatasi) bos yedek olarak kalir.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  { id: 'soguk', label: 'Soğuk İçecekler', icon: '🥤' },
  { id: 'sicak', label: 'Sıcak İçecekler', icon: '☕' },
  { id: 'makarna', label: 'Makarna', icon: '🍝' },
  { id: 'pizza', label: 'Pizza', icon: '🍕' },
]

// Mock veri yok — menu DB'den gelir.
export const MENU = []

export const TABLES = [
  { id: 't-01', name: 'Masa 01', zone: 'Salon' },
  { id: 't-02', name: 'Masa 02', zone: 'Salon' },
  { id: 't-03', name: 'Masa 03', zone: 'Salon' },
  { id: 't-04', name: 'Masa 04', zone: 'Salon' },
  { id: 't-05', name: 'Masa 05', zone: 'Salon' },
  { id: 't-06', name: 'Masa 06', zone: 'Salon' },
]

/** Verilen menu dizisini { kategoriId: [urunler] } seklinde gruplar */
export function groupByCategory(menu) {
  return CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = menu.filter((m) => m.category === cat.id)
    return acc
  }, {})
}
