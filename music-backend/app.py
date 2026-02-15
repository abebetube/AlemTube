from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)  # מאפשר ל-frontend לקרוא את ה-API מכל דומיין

@app.route("/")
def home():
    return "Backend working!"

# מחזיר לינק אודיו נקי מ-YouTube
@app.route("/audio")
def get_audio():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL provided"}), 400

    ydl_opts = {
        "format": "bestaudio",
        "quiet": True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        return jsonify({
            "title": info.get("title"),
            "audio": info["url"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# חיפוש אמיתי ב-YouTube עם yt-dlp
@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": True  # מחזיר רק מידע בסיסי, בלי להוריד
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # מחפש 10 תוצאות
            search_result = ydl.extract_info(f"ytsearch10:{query}", download=False)
            videos = []

            for entry in search_result.get("entries", []):
                videos.append({
                    "videoId": entry.get("id"),
                    "title": entry.get("title"),
                    "thumb": entry.get("thumbnail")
                })

        return jsonify({
            "query": query,
            "results": videos
        })

    except Exception as e:
        return jsonify({"error": str(e), "results": []}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
