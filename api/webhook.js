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

    // Jika cocok, lanjutkan ke pengiriman Telegram (atau proses event berikutnya)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    let telegramStatus = 'Skipped (credentials not configured)';

    if (telegramBotToken && telegramChatId) {
      try {
        const messageText = `🚨 *Laporan Webhook Diterima*\n\nData:\n\`\`\`json\n${rawBody}\n\`\`\``;
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: messageText,
            parse_mode: 'Markdown',
          }),
        });
        telegramStatus = 'Sent';
      } catch (tgError) {
        telegramStatus = `Failed: ${tgError.message}`;
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Validasi HMAC-SHA256 berhasil. Laporan diproses.',
      telegram: telegramStatus,
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
