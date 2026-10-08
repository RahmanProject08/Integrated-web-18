import asyncio
import time
import json
from api.proses_ai import predict_rf, predict_svm


async def test_sequential(data_teks: str):
    """Pengujian jika model dipanggil secara sekuensial (berurutan)"""
    start = time.time()
    rf = await predict_rf(data_teks)
    svm = await predict_svm(data_teks)
    duration = time.time() - start
    return duration, rf, svm


async def test_concurrent(data_teks: str):
    """Pengujian menggunakan teknik Asynchronous (asyncio.gather)"""
    start = time.time()
    rf, svm = await asyncio.gather(
        predict_rf(data_teks),
        predict_svm(data_teks)
    )
    duration = time.time() - start
    return duration, rf, svm


async def main():
    test_input = "deteksi serangan malware berbahaya pada jaringan"
    print("=" * 65)
    print(" [7.4] PENGUJIAN KONKURENSI ASYNCHRONOUS AI PREDICTION")
    print("=" * 65)
    print(f"Input Data Teks : '{test_input}'\n")

    # 1. Eksekusi Sekuensial
    print("[1] Menjalankan Model Secara Sekuensial (Tanpa Gather):")
    seq_time, seq_rf, seq_svm = await test_sequential(test_input)
    print(f"    - Waktu Simulasi Model RF  : 0.3s")
    print(f"    - Waktu Simulasi Model SVM : 0.5s")
    print(f"    -> Total Waktu Sekuensial  : {seq_time:.4f} detik (0.3s + 0.5s = ~0.8s)")
    print()

    # 2. Eksekusi Konkuren / Paralel
    print("[2] Menjalankan Model Secara Asynchronous (asyncio.gather):")
    conc_time, conc_rf, conc_svm = await test_concurrent(test_input)
    print(f"    -> Total Waktu Konkuren    : {conc_time:.4f} detik (~= 0.5 detik)")
    print()

    # 3. Format Output JSON
    response_json = {
        "status": "success",
        "duration_seconds": round(conc_time, 4),
        "results": {
            "model_rf": conc_rf,
            "model_svm": conc_svm
        }
    }

    print("[3] Bukti Format Respons JSON:")
    print(json.dumps(response_json, indent=2))
    print()

    # 4. Kesimpulan Pembuktian
    total_script_duration = time.time() - script_start_time
    print("=" * 65)
    print(" KESIMPULAN PEMBUKTIAN & WAKTU EKSEKUSI AKHIR:")
    print(f" - Eksekusi Sekuensial      : {seq_time:.4f} detik (penjumlahan waktu)")
    print(f" - Eksekusi Konkuren        : {conc_time:.4f} detik (waktu model terlama / max)")
    print(f" - Efisiensi Waktu          : Menghemat {(seq_time - conc_time):.4f} detik (~{((seq_time - conc_time) / seq_time) * 100:.1f}%)")
    print(f" - Waktu Eksekusi Akhir     : {total_script_duration:.4f} detik")
    print(f" - Waktu Selesai (Timestamp): {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)


if __name__ == "__main__":
    script_start_time = time.time()
    asyncio.run(main())
