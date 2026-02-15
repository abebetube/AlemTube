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
        # חיפוש מהיר ללא הורדה
        with yt_dlp.YoutubeDL({
            **YDL_BASE_OPTS,
            "extract_flat": True
        }) as ydl:
            info = ydl.extract_info(f"ytsearch15:{query}", download=False)

        results = []

        for item in info.get("entries", []):
            video_url = f"https://www.youtube.com/watch?v={item['id']}"
            try:
                # סטרים אמיתי
                ydl_opts = {
    "quiet": True,
    "nocheckcertificate": True,
    "ignoreerrors": True,
    "extract_flat": False,
    "format": "best[ext=mp4]/best",
    "user_agent": "Mozilla/5.0",
}

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    stream_info = ydl.extract_info(video_url, download=False)

                stream_url = None
                if "url" in stream_info:
                    stream_url = stream_info["url"]
                elif "formats" in stream_info and stream_info["formats"]:
                    stream_url = stream_info["formats"][0]["url"]

                if not stream_url:
                    continue  # דילוג על סרטון שלא ניתן להשמיע

                results.append({
                    "videoId": item["id"],
                    "title": stream_info.get("title"),
                    "thumb": stream_info.get("thumbnail"),
                    "streamUrl": stream_url
                })

            except Exception:
                continue  # דילוג על סרטון שלא מצליח

        return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

