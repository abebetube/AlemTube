from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "AlemTube backend OK"


# ---------- SEARCH ----------
@app.route("/search")
def search():
    query = request.args.get("q")

    if not query:
        return jsonify({"error": "missing query"}), 400

    try:
        with yt_dlp.YoutubeDL({
            "quiet": True,
            "extract_flat": True,
            "skip_download": True
        }) as ydl:
            info = ydl.extract_info("ytsearch10:{}".format(query), download=False)

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


# ---------- STREAM ----------
@app.route("/stream")
def stream():
    vid = request.args.get("id")

    if not vid:
        return jsonify({"error": "missing id"}), 400

    url = "https://www.youtube.com/watch?v={}".format(vid)

    try:
        with yt_dlp.YoutubeDL({
            "quiet": True,
            "format": "best[ext=mp4]/best",
            "noplaylist": True
        }) as ydl:

            info = ydl.extract_info(url, download=False)

        return jsonify({
            "streamUrl": info.get("url"),
            "title": info.get("title"),
            "thumb": info.get("thumbnail")
        })

    except Exception as e:
        print("STREAM ERROR:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
