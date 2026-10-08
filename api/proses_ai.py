import asyncio
import time
from typing import Optional
from fastapi import FastAPI, Query

app = FastAPI(title="Asynchronous AI Processor on Vercel")


async def predict_rf(data_teks: str) -> dict:
    """
    Simulasi Model A: Random Forest (RF)
    Delay simulasi: 0.3 detik
    """
    await asyncio.sleep(0.3)
    # Logika simulasi prediksi berdasarkan kata kunci atau input
    is_danger = any(
        keyword in data_teks.lower()
        for keyword in ["bahaya", "malware", "virus", "attack", "danger"]
    )
    return {
        "model": "Random Forest (RF)",
        "prediction": "BAHAYA" if is_danger else "AMAN",
        "confidence": 0.94 if is_danger else 0.88,
    }


async def predict_svm(data_teks: str) -> dict:
    """
    Simulasi Model B: Support Vector Machine (SVM)
    Delay simulasi: 0.5 detik
    """
    await asyncio.sleep(0.5)
    # Logika simulasi prediksi berdasarkan kata kunci atau input
    is_danger = any(
        keyword in data_teks.lower()
        for keyword in ["bahaya", "malware", "virus", "attack", "danger"]
    )
    return {
        "model": "Support Vector Machine (SVM)",
        "prediction": "BAHAYA" if is_danger else "AMAN",
        "confidence": 0.91 if is_danger else 0.85,
    }


@app.get("/api/proses_ai")
async def proses_ai(input: Optional[str] = Query(default="", description="Data teks untuk diprediksi")):
    try:
        # [7.2] Catat waktu mulai
        start_time = time.time()

        # Eksekusi konkurensi paralel dengan asyncio.gather
        rf_result, svm_result = await asyncio.gather(
            predict_rf(input),
            predict_svm(input)
        )

        # Catat waktu selesai
        end_time = time.time()
        duration_seconds = round(end_time - start_time, 4)

        # [7.3] Format respons JSON
        return {
            "status": "success",
            "duration_seconds": duration_seconds,
            "results": {
                "model_rf": rf_result,
                "model_svm": svm_result,
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }
