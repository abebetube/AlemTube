const BASE_URL = "https://alemtube-backend.onrender.com";

async function playVideo(videoId) {

  const playerContainer = document.getElementById("player-container");

  playerContainer.innerHTML = `
    <iframe
      width="100%"
      height="400"
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen>
    </iframe>
  `;

  // מביא מידע מהשרת (אופציונלי)
  try {
    const res = await fetch(`${BASE_URL}/info?id=${videoId}`);
    const data = await res.json();

    console.log("Video info:", data);

  } catch (err) {
    console.log("info error", err);
  }
}
