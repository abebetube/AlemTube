console.log("🎬 AlemTube מתחיל...");

const BACKEND_URL = "https://alemtube-v.onrender.com/search";

let playlist = [];
let currentIndex = 0;

window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("splash").style.display = "none";
  }, 3000);
});

document.getElementById("searchBtn").onclick = searchVideos;
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") searchVideos();
});

async function searchVideos() {
  const query = searchInput.value.trim();
  if (!query) return;

  playlist = [];
  results.innerHTML = "";
  playerContainer.innerHTML = "";

  try {
    const res = await fetch(`${BACKEND_URL}?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.error) {
      alert("שגיאה: " + data.error);
      return;
    }

    playlist = data;
    playVideo(0);

  } catch (err) {
    console.error("❌ שגיאה:", err);
  }
}

function playVideo(index) {
  currentIndex = index;
  const video = playlist[index];
  if (!video) return;

  playerContainer.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1"
      allowfullscreen
      allow="autoplay">
    </iframe>
  `;

  results.innerHTML = "";
  playlist.forEach((v, i) => {
    if (i === index) return;
    const div = document.createElement("div");
    div.className = "video-item";
    div.onclick = () => playVideo(i);
    div.innerHTML = `
      <img src="${v.thumb}">
      <div class="video-title">${v.title}</div>
    `;
    results.appendChild(div);
  });
}
