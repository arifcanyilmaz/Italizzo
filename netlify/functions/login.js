// -----------------------------------------------------------------------------
//  /api/login  ->  Basit giris dogrulamasi (guvenlik minimal — "config"ten).
//
//  Kullanici adi/sifre ortam degiskenlerinden okunur:
//    APP_USERNAME (varsayilan: admin)
//    APP_PASSWORD (varsayilan: admin)
//
//  Basarili girise "token" doner; frontend bunu localStorage'da saklar ve
//  kendiliginden cikis YAPMAZ (gun boyu acik kalir).
// -----------------------------------------------------------------------------

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Bu metot desteklenmiyor' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { error: 'Geçersiz istek' })
  }

  const username = String(body.username || '')
  const password = String(body.password || '')

  const U = process.env.APP_USERNAME || 'admin'
  const P = process.env.APP_PASSWORD || 'admin'

  if (username === U && password === P) {
    return json(200, { ok: true, user: username, token: `italizzo-${Date.now()}` })
  }
  return json(401, { error: 'Kullanıcı adı veya şifre hatalı' })
}
