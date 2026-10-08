import crypto from 'node:crypto';

/**
 * [8.1] & [8.2] Serverless Function Node.js (Webhook Receiver)
 * Endpoint: POST /api/webhook
 * Implementasi Validasi HMAC-SHA256 berurutan (a)-(e)
 */
export default async function handler(req, res) {
  // Hanya menerima HTTP method POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: `Method ${req.method} not allowed. Hanya menerima request POST.`,
    });
  }

  try {
    // (a) Periksa apakah header x-signature ada. Jika tidak ada, tolak dengan 400 Bad Request.
    const signature = req.headers['x-signature'];
    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Header x-signature tidak ditemukan. Request ditolak.',
      });
    }

    // Ambil kunci rahasia HMAC
    const HMAC_SECRET = process.env.HMAC_SECRET || 'secret_key_demo';

    // (b) Ambil isi body request sebagai string (JSON.stringify jika perlu).
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // (c) Buat HMAC-SHA256 dari body string menggunakan:
    // crypto.createHmac("sha256", HMAC_SECRET).update(body).digest("hex")
    const computedHmac = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(rawBody)
      .digest('hex');

    // (d) Bandingkan HMAC yang Anda buat dengan nilai di header x-signature menggunakan perbandingan string biasa.
    // (e) Jika tidak cocok, tolak dengan 401 Unauthorized.
    if (computedHmac !== signature) {
      return res.status(401).json({
        status: 'error',
        message: 'Signature tidak valid / tidak cocok. Request tidak diizinkan.',
      });
    }

    // [8.3] Integrasi Telegram Bot Alert
    // Ambil kredensial dari environment variables (atau header khusus pengujian simulator)
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || req.headers['x-telegram-token'];
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || req.headers['x-telegram-chat-id'];

    // Parsing data payload dari Supabase (record atau body langsung)
    const payload = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const record = payload.record || payload.data || payload;

    // Ekstraksi status kejadian (AMAN / BAHAYA), level ancaman, dan detail pesan
    const statusKejadian = record.status || payload.status || (record.is_danger ? 'BAHAYA' : 'AMAN');
    const levelAncaman = record.threat_level || record.level || payload.level || 'MEDIUM';
    const detailPesan = record.message || record.detail || record.description || payload.message || 'Laporan terdeteksi dari database Supabase';

    // Susun format pesan Telegram (ringkas dan bersih tanpa payload mentah)
    const statusIcon = statusKejadian.toUpperCase() === 'BAHAYA' ? '🚨' : '✅';
    const telegramMessage = [
      `${statusIcon} *NOTIFIKASI WEBHOOK SUPABASE*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📌 *Status Kejadian* : *${statusKejadian.toUpperCase()}*`,
      `⚠️ *Level Ancaman*   : *${levelAncaman.toUpperCase()}*`,
      `📝 *Detail Pesan*    : ${detailPesan}`,
      `🕒 *Waktu*           : ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      `━━━━━━━━━━━━━━━━━━━━`,
    ].join('\n');

    let telegramResult = { status: 'skipped', message: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset.' };

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const tgResponse = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: telegramMessage,
            parse_mode: 'Markdown',
          }),
        });

        const tgData = await tgResponse.json();
        if (tgData.ok) {
          telegramResult = { status: 'sent', message_id: tgData.result.message_id };
        } else {
          telegramResult = { status: 'failed', error: tgData.description };
        }
      } catch (tgError) {
        telegramResult = { status: 'error', error: tgError.message };
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Validasi HMAC-SHA256 berhasil. Laporan diproses.',
      telegram: telegramResult,
      data: req.body,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memproses validasi webhook.',
      detail: error.message,
    });
  }
}
