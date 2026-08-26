# 🍕 Italizzo — Masa Adisyon / POS Sistemi

İtalyan pizza & makarna dükkânları için tek sayfalık (SPA) masa adisyon ve ödeme
yönetim sistemi. **Frontend + Backend + Veritabanı** tek repoda, tek deploy ile
Netlify üzerinde canlıya çıkar.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Netlify Functions (serverless)
- **Veritabanı:** MongoDB Atlas — menü **ve** adisyonlar burada tutulur
- **Satış panosu:** gün gün ciro + en çok satan ürün/içecek sıralaması (`/api/dashboard`)

---

## ✨ Özellikler

- **3 sütunlu POS arayüzü** (Menü · Kat Planı · Canlı Adisyon), responsive.
- **Giriş ekranı (login):** gün boyu açık kalır, kendiliğinden çıkış yapmaz.
- **Menü veritabanından** gelir; “+ Ekle” ile ürün ekleme, kart köşesinden silme.
  Menüde yalnızca **isim + fiyat** (açıklama yok). Kategoriler:
  Soğuk İçecekler · Sıcak İçecekler · Makarna · Pizza.
- **Adet bazlı ödeme:** Her ürün adedi ayrı satırdır. Ödenen adet **kilitlenir**
  (“✓ Ödendi”), tekrar seçilemez; kalan adetler seçilebilir. Seçilenlerin toplamı
  otomatik “hesaptan düş” tutarı olur. Ürün seçimi **kalan bakiyeyi aşamaz**.
- **Serbest tutar:** İstenirse elle tutar da düşülebilir (ör. 200 ₺ nakit).
- **Kalanı Tümüyle Öde**, ödeme geçmişi ve **geri alma** (kilidi de açar).
- **Hesabı Kapat / Masayı Temizle:** onay modalı sonrası masayı sıfırlar ve adisyonu
  **o günün kaydı** olarak veritabanına arşivler.
- **Satış panosu (Dashboard):** üst bardaki **📊 Dashboard** butonu; gün gün ciro,
  en çok satan **ürünler** ve **içecekler** sıralaması (7 / 30 / 90 gün).

---

## 🖥️ Yerel Geliştirme

### Seçenek 1 — Sadece arayüz (veritabanı gerekmez)

```bash
npm install
npm run dev          # http://localhost:5173
```

Backend olmadığından menü **yerel yedekten** gelir, adisyonlar **tarayıcıda**
tutulur. Giriş için **admin / admin** kullanın (offline yedek giriş).

### Seçenek 2 — Tam sistem (Functions + MongoDB)

```bash
npm install -g netlify-cli      # tek seferlik
cp .env.example .env            # .env içini doldurun (aşağıya bakın)
npm run dev:netlify             # http://localhost:8888
```

`.env` (örnek için `.env.example`):

```
MONGODB_URI="mongodb+srv://KULLANICI:SIFRE@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="italizzo"
APP_USERNAME="admin"
APP_PASSWORD="admin"
```

> Veritabanı ilk kez **boşsa** menü otomatik varsayılan ürünlerle dolar.

---

## 🗄️ MongoDB Atlas (ücretsiz)

1. https://www.mongodb.com/atlas → ücretsiz **M0 cluster**.
2. **Database Access** → kullanıcı adı/şifre.
3. **Network Access** → `0.0.0.0/0`.
4. **Database → Connect → Drivers** → bağlantı adresini `MONGODB_URI` olarak kullanın.

---

## 🚀 Netlify’a Yükleme

1. Projeyi **GitHub**’a gönderin.
2. Netlify → **Add new site → Import from Git** (ayarlar `netlify.toml`’dan okunur).
3. **Site settings → Environment variables**: `.env`’deki tüm değişkenleri girin.
4. Deploy. `/api/*` fonksiyonlara yönlenir.
5. **Domain management → Add a domain** ile alan adınızı bağlayın (HTTPS otomatik).

---

## 🔌 API Uçları

| Metot  | Yol                       | Açıklama                                   |
|--------|---------------------------|--------------------------------------------|
| POST   | `/api/login`              | Giriş `{username, password}`               |
| GET    | `/api/menu`               | Menü (boşsa varsayılanla doldurur)         |
| POST   | `/api/menu`               | Ürün ekle `{name, category, price}`        |
| DELETE | `/api/menu?id=...`        | Ürün sil                                   |
| GET    | `/api/orders`             | Tüm açık adisyonlar                        |
| PUT    | `/api/orders`             | Adisyonu kaydet (upsert)                   |
| POST   | `/api/orders`             | Masayı kapat/arşivle `{tableId}`           |
| GET    | `/api/dashboard`          | Satış panosu verisi (`?days=7\|30\|90`)     |

---

## 🛠️ Özelleştirme

- **Masalar:** `src/data.js` (`TABLES`).
- **Kategoriler:** `src/data.js` + `netlify/functions/menu.js` (`VALID_CATEGORIES`) aynı olmalı.
- **Renkler & fontlar:** `tailwind.config.js`.
- **Verileri sıfırlamak (yerel cache):** tarayıcı konsolunda `localStorage.clear()`.
