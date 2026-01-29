import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

/* בדיקת חיים */
app.get("/", (req, res) => {
  res.send("✅ Alemtube backend is running");
});
console.log("API KEY:", process.env.YOUTUBE_API_KEY);
app.get("/search", async (req, res) => {
  const query = req.query.q;
  console.log("🔍 Search query:", query);

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "Missing YOUTUBE_API_KEY" });
  }

  const url =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&type=video&maxResults=15` +
    `&q=${encodeURIComponent(query)}` +
    `&key=${process.env.YOUTUBE_API_KEY}`;

  try {
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    console.log("📺 YouTube API response:", data);

    if (data.error) {
      return res.status(500).json({
        error: data.error.message,
        details: data.error,
      });
    }

    const videos = data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumb: item.snippet.thumbnails.medium.url,
    }));

    res.json(videos);
  } catch (err) {
    console.error("🔥 Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log("🚀 Backend running on port", port)
);
