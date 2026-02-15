from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)  # מאפשר ל-frontend לקרוא את ה-API מכל דומיין

# בדיקה שהשרת עובד
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

# חיפוש / מחזיר תוצאה לדוגמה (ניתן לשדרג בעתיד עם yt-dlp חיפוש)
@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # אפשר לשלב כאן yt-dlp לחיפוש, כרגע מחזיר רשימה ריקה עם query
    return jsonify({
        "query": query,
        "results": []  # בעתיד: רשימת סרטונים או אודיו
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
