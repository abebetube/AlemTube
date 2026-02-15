from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import functools

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/")
def home():
    return "Backend working!"


# ========= הגדרות yt-dlp =========
YDL_BASE_OPTS = {
    "quiet": True,
    "skip_download": True,
    "noplaylist": True,
    "cachedir": False
}


# ========= Cache קטן לסטרים =========
@functools.lru_cache(maxsize=100)
def get_stream_url(video_url):
    ydl_opts = {
        **YDL_BASE_OPTS,
        "format": "best[ext=mp4]/best"
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)

    return {
        "title": info.get("title"),
        "streamUrl": info.get("url"),
        "thumb": info.get("thumbnail")
    }


# ========= חיפוש =========
@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "No query"}), 400

    try:
        # שלב 1 – חיפוש מהיר
        with yt_dlp.YoutubeDL({
            **YDL_BASE_OPTS,
            "extract_flat": True
        }) as ydl:
            info = ydl.extract_info(f"ytsearch15:{query}", download=False)

        results = []

        # שלב 2 – להביא סטרים אמיתי לכל סרטון
        for item in info.get("entries", []):
            video_url = f"https://www.youtube.com/watch?v={item['id']}"

            try:
                stream_data = get_stream_url(video_url)

                results.append({
                    "videoId": item["id"],
                    "title": stream_data["title"],
                    "thumb": stream_data["thumb"],
                    "streamUrl": stream_data["streamUrl"]
                })

            except Exception:
                continue

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========= סטרים בודד =========
@app.route("/audio")
def audio():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "No URL"}), 400

    try:
        data = get_stream_url(url)
        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

