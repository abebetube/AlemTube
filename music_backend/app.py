from flask import Flask, jsonify, request
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "AlemTube backend working ✅"


@app.route("/info")
def info():
    video_id = request.args.get("id")
    if not video_id:
        return jsonify({"error": "missing id"}), 400

    url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        return jsonify({
            "title": info.get("title"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "webpage_url": info.get("webpage_url")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/search")
def search():
    query = request.args.get("q")

    if not query:
        return jsonify({"error": "missing query"}), 400

    try:
        with yt_dlp.YoutubeDL({
            "quiet": True,
            "extract_flat": True,
            "skip_download": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0"
            }
        }) as ydl:

            info = ydl.extract_info(
                f"ytsearch10:{query}",
                download=False
            )

        results = []
        for e in info.get("entries", []):
            if not e.get("id"):
                continue

            results.append({
                "videoId": e.get("id"),
                "title": e.get("title"),
                "thumb": e.get("thumbnail")
            })

        return jsonify({"results": results})

    except Exception as e:
        print("SEARCH ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/stream")
def stream():
    video_id = request.args.get("id")

    if not video_id:
        return jsonify({"error": "missing id"}), 400

    url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        ydl_opts = {
            "quiet": True,
            "format": "bestaudio/best",
            "skip_download": True,
            "noplaylist": True
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        stream_url = info["url"]

        return jsonify({
            "streamUrl": stream_url,
            "title": info.get("title")
        })

    except Exception as e:
        print("STREAM ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)

