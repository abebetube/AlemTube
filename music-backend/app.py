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
    "format": "bestaudio/best",
    "quiet": True,
    "noplaylist": True,        # לא להוריד פלייליסטים שלמים
    "extract_flat": "in_playlist",  # כדי לקבל מידע על סרטונים בלי להוריד אותם
    "skip_download": True,     # לא מורידים שום קובץ
    "cachedir": False,         # לא להשתמש במטמון (מהיר יותר לבדיקה)
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

    search_url = f"ytsearch20:{query}"  # מחזיר עד 20 סרטונים

    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "skip_download": True,
        "extract_flat": True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(search_url, download=False)

        results = []
        for item in info.get("entries", []):
            results.append({
                "videoId": item.get("id"),
                "title": item.get("title"),
                "thumb": item.get("thumbnail"),
                "url": item.get("url"),
            })

        return jsonify({"query": query, "results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
