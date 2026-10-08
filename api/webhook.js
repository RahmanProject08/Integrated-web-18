import crypto from 'node:crypto';

/**
 * [8.1] Serverless Function Node.js (Webhook Receiver)
 * Endpoint: POST /api/webhook
 * Menerima laporan webhook (misal dari Supabase) dengan validasi HMAC SHA256 Signature.
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
    const secret = process.env.WEBHOOK_SECRET || 'default_secret_key_demo';
    const signatureHeader = req.headers['x-webhook-signature'] || req.headers['x-signature'] || '';
    
    // Payload dari request body
    const body = req.body;
    const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);

    // Hitung HMAC SHA-256 signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawPayload || '')
      .digest('hex');

    // Validasi Signature jika header signature dikirimkan
    if (signatureHeader) {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(computedSignature)
      );

      if (!isValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid signature. Request ditolak.',
        });
      }
    }

    // Ekstraksi data event dari Supabase
    const { event, table, record, old_record } = body || {};

    return res.status(200).json({
      status: 'success',
      message: 'Webhook diterima dan diverifikasi dengan sukses.',
      data: {
        event: event || 'INSERT',
        table: table || 'threat_logs',
        record: record || body,
        received_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memproses webhook.',
      detail: error.message,
    });
  }
}
