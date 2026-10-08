import os
import json
import urllib.request
import urllib.error

def main():
    token = os.environ.get("TG_TOKEN")
    chat_id = os.environ.get("TG_CHAT_ID")
    status = os.environ.get("INPUT_STATUS", "BAHAYA").strip()
    level = os.environ.get("INPUT_LEVEL", "HIGH").strip()
    detail = os.environ.get("INPUT_DETAIL", "Uji Coba Integrasi: Terdeteksi anomali trafik mencurigakan pada database").strip()

    if not token or not chat_id:
        print("Error: TG_TOKEN atau TG_CHAT_ID tidak ditemukan.")
        exit(1)

    icon = "🚨" if status.upper() == "BAHAYA" else "✅"
    message = (
        f"{icon} *NOTIFIKASI WEBHOOK SUPABASE*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📌 *Status Kejadian* : *{status.upper()}*\n"
        f"⚠️ *Level Ancaman*   : *{level.upper()}*\n"
        f"📝 *Detail Pesan*    : {detail}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🧪 *Uji Koneksi Telegram Berhasil*"
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print("Pesan berhasil dikirim ke Telegram!")
            print(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"Error mengirim Telegram: {e.code} - {e.read().decode('utf-8')}")
        exit(1)

if __name__ == "__main__":
    main()
