import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

// ⬅️ כאן אנחנו טוענים את כל המפתחות
const API_KEYS = process.env.YOUTUBE_API_KEYS.split(",");
let keyIndex = 0;

function getNextKey() {
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing query" });

  let lastError = null;

  // 🔁 ננסה כל מפתח בתורו
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = getNextKey();
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=30&q=${encodeURIComponent(query)}&key=${key}`;

    try {
      const ytRes = await fetch(url);
      const data = await ytRes.json();

      if (data.error) {
        console.warn("⛔ מפתח נכשל:", key, data.error.reason);
        lastError = data.error;
        continue; // מנסה מפתח הבא
      }

      const videos = data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumb: item.snippet.thumbnails.medium.url
      }));

      return res.json(videos); // ✅ הצליח
    } catch (err) {
      lastError = err;
    }
  }

  // ❌ אם כולם נכשלו
  res.status(500).json({
    error: "All API keys exhausted",
    details: lastError
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log("Backend running on port", port)
);
