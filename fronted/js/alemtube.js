let playlist = [];
let currentIndex = 0;
const BACKEND_URL = "https://YOUR_BACKEND_URL"; // <-- החלף ל-URL של ה-Backend שלך

window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("splash").style.display = "none", 4000);
});

document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); searchVideos(); }
});

async function searchVideos() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  playlist = [];
  currentIndex = 0;
  document.getElementById("results").innerHTML = "";
  document.getElementById("player-container").innerHTML = "";

  try {
    const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data || data.length === 0) return alert("לא נמצאו סרטונים ניתנים לניגון");

    playlist = data;
    currentIndex = 0;
    saveToCache();
    playVideo(currentIndex);
  } catch (e) {
    console.error("שגיאת חיפוש:", e);
  }
}

function playVideo(index) {
  const video = playlist[index];
  if (!video) return;

  document.getElementById("player-container").innerHTML =
    `<iframe id="ytplayer" src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1" allowfullscreen allow="autoplay"></iframe>`;

  setTimeout(() => document.getElementById("player-container").scrollIntoView({ behavior: "smooth" }), 500);

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  playlist.forEach((v, i) => {
    if (i === index) return;
    const div = document.createElement("div");
    div.className = "video-item";
    div.onclick = () => { currentIndex = i; saveToCache(); playVideo(i); }
    div.innerHTML = `<img src="${v.thumb}" alt="${v.title}"><div class="video-title">${v.title}</div>`;
    resultsDiv.appendChild(div);
  });
}

function saveToCache() {
  localStorage.setItem("abe_playlist", JSON.stringify(playlist));
  localStorage.setItem("abe_index", currentIndex);
}

function loadFromCache() {
  const list = localStorage.getItem("abe_playlist");
  const idx = localStorage.getItem("abe_index");
  if (list && idx !== null) {
    playlist = JSON.parse(list);
    currentIndex = parseInt(idx);
    playVideo(currentIndex);
  }
}

// YouTube Iframe API
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// Fullscreen toggle
function toggleFullScreen() {
  const btn = document.getElementById("fullscreen-btn");
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    btn.textContent = "יציאה ממסך מלא";
  } else {
    document.exitFullscreen();
    btn.textContent = "מעבר למסך מלא";
  }
}

// Splash fireworks
function launchFireworks(count = 5) {
  const container = document.querySelector('.fireworks');
  for (let i = 0; i < count; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    for (let j = 0; j < 30; j++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const angle = (Math.PI * 2 * j) / 30;
      const distance = 80 + Math.random() * 50;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      particle.style.setProperty('--x', `${dx}px`);
      particle.style.setProperty('--y', `${dy}px`);
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 1500);
    }
  }
}

window.addEventListener("load", () => {
  let count = 0;
  const interval = setInterval(() => {
    launchFireworks();
    count++;
    if (count >= 4) clearInterval(interval);
  }, 700);
});
