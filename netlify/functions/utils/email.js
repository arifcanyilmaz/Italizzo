// Resend (https://resend.com) uzerinden e-posta gonderimi.
// Bagimlilik gerektirmez; dogrudan REST API'ye istek atar.
//
// Gerekli ortam degiskenleri:
//   RESEND_API_KEY     : Resend API anahtari
//   REPORT_TO_EMAIL    : raporun gonderilecegi adres(ler) (virgulle birden fazla)
//   REPORT_FROM_EMAIL  : gonderen adres (varsayilan: onboarding@resend.dev)

export async function sendEmail({ subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.REPORT_TO_EMAIL
  const from = process.env.REPORT_FROM_EMAIL || 'Italizzo <onboarding@resend.dev>'

  if (!apiKey || !to) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY veya REPORT_TO_EMAIL tanımlı değil (e-posta atlandı).',
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`E-posta gönderilemedi (${res.status}): ${detail}`)
  }

  return { sent: true }
}
