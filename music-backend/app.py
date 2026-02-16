from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Backend working!"


# ========= חיפוש בלבד =========
@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "No query"}), 400

    try:
        with yt_dlp.YoutubeDL({
            "quiet": True,
            "extract_flat": True,
            "skip_download": True
        }) as ydl:

            info = ydl.extract_info(f"ytsearch10:{query}", download=False)

        results = [
            {
                "videoId": item["id"],
                "title": item["title"],
                "thumb": item.get("thumbnail")
            }
            for item in info.get("entries", [])
            if item.get("id")
        ]

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========= קבלת סטרים =========
@app.route("/stream")
def stream():
    video_id = request.args.get("id")
    if not video_id:
        return jsonify({"error": "No video id"}), 400

    url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        with yt_dlp.YoutubeDL({
            "quiet": True,
            "format": "best",
            "noplaylist": True
        }) as ydl:

            info = ydl.extract_info(url, download=False)

        return jsonify({
            "streamUrl": info.get("url"),
            "title": info.get("title"),
            "thumb": info.get("thumbnail")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
