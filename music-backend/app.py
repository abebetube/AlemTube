from flask_cors import CORS  # <-- חשוב כדי שהדפדפן יוכל לשלוח בקשות

app = Flask(__name__)
CORS(app)  # מאפשר ל-frontend לשלוח בקשות מכל דומיין

# הקיים
@app.route("/")
def home():
    return "Backend working!"

@app.route("/audio")
def get_audio():
    url = request.args.get("url")
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
        return jsonify({"error": str(e)})

# ✨ הוספת /search
@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # לדוגמה: מחזיר מידע כמו /audio אבל עם query
    return jsonify({
        "query": query,
        "results": []  # כאן אפשר לשלב yt-dlp לחיפוש או רשימה ריקה
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
