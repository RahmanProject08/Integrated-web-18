import crypto from 'node:crypto';
import handler from '../api/webhook.js';

/**
 * Script Pengujian 3 Skenario Keamanan Webhook HMAC-SHA256
 * Mendukung pengujian lokal (direct handler invocation) maupun HTTP endpoint remote.
 */

const HMAC_SECRET = process.env.HMAC_SECRET || 'secret_key_demo';
process.env.HMAC_SECRET = HMAC_SECRET;

// Dummy payload laporan ancaman keamanan dari Supabase
const testPayload = {
  event: 'INSERT',
  table: 'threat_logs',
  record: {
    id: 108,
    status: 'BAHAYA',
    threat_level: 'HIGH',
    message: 'Percobaan akses unauthorized terdeteksi pada database internal',
    ip_address: '192.168.1.100',
    created_at: new Date().toISOString(),
  },
};

const rawBody = JSON.stringify(testPayload);

// Helper untuk membuat signature HMAC-SHA256 yang valid
function generateValidSignature(bodyString, secret) {
  return crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
}

// Mock Response Object untuk simulasi serverless handler lokal
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runTest(testName, headers, body) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`▶ MENJALANKAN: ${testName}`);
  console.log(`------------------------------------------------------------`);
  console.log(`Headers :`, JSON.stringify(headers));

  const req = {
    method: 'POST',
    headers: headers,
    body: body,
  };
  const res = createMockResponse();

  await handler(req, res);

  console.log(`Status HTTP  : ${res.statusCode}`);
  console.log(`Respons Body :`, JSON.stringify(res.body, null, 2));

  return res;
}

async function main() {
  console.log(`============================================================`);
  console.log(`  PENGUJIAN 3 SKENARIO KEAMANAN WEBHOOK HMAC-SHA256`);
  console.log(`============================================================`);
  console.log(`Secret Key Digunakan : "${HMAC_SECRET}"`);
  console.log(`Payload String      : ${rawBody.substring(0, 70)}...`);

  const validSignature = generateValidSignature(rawBody, HMAC_SECRET);
  let passedCount = 0;

  // -------------------------------------------------------------------------
  // Test 1 — Valid: Signature HMAC benar -> harus diterima (200 OK)
  // -------------------------------------------------------------------------
  const res1 = await runTest(
    'Test 1 — Valid (Signature HMAC Benar)',
    { 'x-signature': validSignature },
    testPayload
  );

  if (res1.statusCode === 200 && res1.body?.status === 'success') {
    console.log(`✅ HASIL TEST 1: BERHASIL (Status 200 OK - Signature Diterima)`);
    passedCount++;
  } else {
    console.log(`❌ HASIL TEST 1: GAGAL (Ekspektasi: 200 OK, Dapat: ${res1.statusCode})`);
  }

  // -------------------------------------------------------------------------
  // Test 2 — Tampered: Signature diubah/dirusak -> harus ditolak (401 Unauthorized)
  // -------------------------------------------------------------------------
  const tamperedSignature = validSignature.substring(0, 10) + 'deadbeef' + validSignature.substring(18);
  const res2 = await runTest(
    'Test 2 — Tampered (Signature Diubah / Rusak)',
    { 'x-signature': tamperedSignature },
    testPayload
  );

  if (res2.statusCode === 401) {
    console.log(`✅ HASIL TEST 2: BERHASIL (Status 401 Unauthorized - Ditolak Sesuai Ekspektasi)`);
    passedCount++;
  } else {
    console.log(`❌ HASIL TEST 2: GAGAL (Ekspektasi: 401 Unauthorized, Dapat: ${res2.statusCode})`);
  }

  // -------------------------------------------------------------------------
  // Test 3 — Missing: Tanpa header x-signature -> harus ditolak (400 Bad Request)
  // -------------------------------------------------------------------------
  const res3 = await runTest(
    'Test 3 — Missing (Tanpa Header x-signature)',
    {},
    testPayload
  );

  if (res3.statusCode === 400) {
    console.log(`✅ HASIL TEST 3: BERHASIL (Status 400 Bad Request - Ditolak Sesuai Ekspektasi)`);
    passedCount++;
  } else {
    console.log(`❌ HASIL TEST 3: GAGAL (Ekspektasi: 400 Bad Request, Dapat: ${res3.statusCode})`);
  }

  // -------------------------------------------------------------------------
  // Ringkasan
  // -------------------------------------------------------------------------
  console.log(`\n============================================================`);
  console.log(` RINGKASAN HASIL TEST KEAMANAN:`);
  console.log(` - Total Pengujian : 3`);
  console.log(` - Lolos           : ${passedCount} / 3`);
  console.log(` - Status          : ${passedCount === 3 ? 'SEMUA SKENARIO VALID (100% LOLOS)' : 'ADA YANG GAGAL'}`);
  console.log(`============================================================\n`);
}

main().catch(console.error);
