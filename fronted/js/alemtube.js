console.log("🎬 AlemTube מתחיל...");

let playlist = [];
let currentIndex = 0;

// אתחול
window.onload = () => loadFromCache();

// חיבור שדה החיפוש
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchVideos();
  }
});
console.log("✅ שדה חיפוש מחובר");

// חיפוש סרטונים דרך ה-Backend שלך
async function searchVideos() {
  const query = searchInput.value.trim();
  if (!query) return;

  console.log("🔍 מחפש:", query);

  playlist = [];
  currentIndex = 0;
  document.getElementById("results").innerHTML = "";
  document.getElementById("player-container").innerHTML = "";

  try {
    // כאן תשים את הכתובת של ה-backend שלך
    const res = await fetch(`https://alemtube.onrender.com/search?q=${encodeURIComponent(query)}`);
const data = await res.json();


    if (!data || data.length === 0) {
      alert("לא נמצאו סרטונים ניתנים לניגון");
      return;
    }

    playlist = data;
    currentIndex = 0;
    saveToCache();
    playVideo(currentIndex);

  } catch (err) {
    console.error("שגיאת חיפוש:", err);
    alert("אירעה שגיאה בחיפוש. בדוק שה-backend פועל.");
  }
}

// ניגון סרטון
function playVideo(index) {
  const video = playlist[index];
  if (!video) return;

  const playerContainer = document.getElementById("player-container");
  playerContainer.innerHTML = `<iframe id="ytplayer" src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1" allowfullscreen allow="autoplay"></iframe>`;

  setTimeout(() => playerContainer.scrollIntoView({ behavior: "smooth" }), 500);

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  playlist.forEach((v, i) => {
    if (i === index) return;
    const div = document.createElement("div");
    div.className = "video-item";
    div.onclick = () => {
      currentIndex = i;
      saveToCache();
      playVideo(i);
    };
    div.innerHTML = `<img src="${v.thumb}" alt="${v.title}"><div class="video-title">${v.title}</div>`;
    resultsDiv.appendChild(div);
  });
}

// שמירת וניגון מה-cache
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

// Fullscreen
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

// Splash + fireworks
window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  let count = 0;
  const interval = setInterval(() => {
    launchFireworks();
    count++;
    if (count >= 4) clearInterval(interval);
  }, 700);
  setTimeout(() => splash.style.display = "none", 4000);
});

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
