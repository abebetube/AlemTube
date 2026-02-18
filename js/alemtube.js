"use strict";

// ---------------- BASE URL ----------------
const BASE_URL = "https://alemtube-8nwl.onrender.com";

let playlist = [];
let currentIndex = 0;
let playerContainer, results, searchInput;

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  playerContainer = document.getElementById("player-container");
  results = document.getElementById("results");
  searchInput = document.getElementById("searchInput");

  document.getElementById("searchBtn")?.addEventListener("click", searchVideos);

  searchInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") searchVideos();
  });

  showSplashScreen();
}

// ---------------- SPLASH ----------------
function showSplashScreen() {
  const splash = document.getElementById("splash");
  const loadingProgress = document.querySelector(".loading-progress");
  if (!splash || !loadingProgress) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20 + 10;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      setTimeout(() => {
        splash.classList.add("hidden");
        setTimeout(() => {
          splash.style.display = "none";
          searchInput?.focus();
        }, 500);
      }, 500);
    }

    loadingProgress.style.width = progress + "%";
  }, 150);
}

// ---------------- SEARCH ----------------
async function searchVideos() {
  const query = searchInput.value.trim();

  if (!query) {
    alert("נא להזין מילת חיפוש");
    return;
  }

  playlist = [];
  currentIndex = 0;

  results.innerHTML = "";
  playerContainer.innerHTML = '<div class="loading">מחפש...</div>';

  try {
    const res = await fetch(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}`
    );

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();

    if (!data.results?.length) {
      showEmpty("לא נמצאו סרטונים");
      return;
    }

    playlist = data.results;

    playVideo(0);
    renderResults();

  } catch (err) {
    console.error(err);
    showEmpty("שגיאה בחיפוש");
  }
}

// ---------------- PLAY VIDEO ----------------


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


// ---------------- PLAY NEXT ----------------
function playNextAvailableVideo() {
  let next = currentIndex + 1;
  if (next >= playlist.length) next = 0;
  playVideo(next);
}

// ---------------- RENDER LIST ----------------
function renderResults() {
  results.innerHTML = "";

  playlist.forEach((video, index) => {
    const div = document.createElement("div");
    div.className =
      "video-item" + (index === currentIndex ? " active" : "");

    div.innerHTML = `
      <img src="${video.thumb || ''}" alt="">
      <div class="video-title">${video.title}</div>
    `;

    div.onclick = () => playVideo(index);
    results.appendChild(div);
  });
}

function showEmpty(msg) {
  playerContainer.innerHTML = `<p>${msg}</p>`;
  results.innerHTML = "";
}

