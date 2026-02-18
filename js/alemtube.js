"use strict";

// ---------- BACKEND ----------
const BASE_URL = "https://alemtube-8nwl.onrender.com";

let playlist = [];
let currentIndex = 0;

let playerContainer, results, searchInput;

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  playerContainer = document.getElementById("player-container");
  results = document.getElementById("results");
  searchInput = document.getElementById("searchInput");

  document.getElementById("searchBtn")?.addEventListener("click", searchVideos);

  searchInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") searchVideos();
  });
});


// ---------- SEARCH ----------
async function searchVideos() {
  const query = searchInput.value.trim();

  if (!query) {
    alert("נא להזין מילת חיפוש");
    return;
  }

  results.innerHTML = "";
  playerContainer.innerHTML = '<div class="loading">מחפש...</div>';

  try {
    const res = await fetch(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}`
    );

    if (!res.ok) throw new Error(res.status);

    const data = await res.json();

    if (!data.results || !data.results.length) {
      showEmpty("לא נמצאו סרטונים");
      return;
    }

    playlist = data.results;
    currentIndex = 0;

    playVideo(currentIndex);
    renderResults();

  } catch (err) {
    console.error(err);
    showEmpty("שגיאה בחיפוש");
  }
}


// ---------- PLAY VIDEO ----------
async function playVideo(index) {
  const video = playlist[index];
  if (!video) return;

  currentIndex = index;

  playerContainer.innerHTML = `
    <iframe
      width="100%"
      height="500"
      src="https://www.youtube.com/embed/${video.videoId}?autoplay=1"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen>
    </iframe>
  `;

  // מידע נוסף מהשרת (yt-dlp metadata)
  try {
    const res = await fetch(`${BASE_URL}/info?id=${video.videoId}`);
    const data = await res.json();
    console.log("VIDEO INFO:", data);
  } catch (err) {
    console.log("info error", err);
  }

  renderResults();
}


// ---------- NEXT VIDEO ----------
function playNextVideo() {
  let next = currentIndex + 1;
  if (next >= playlist.length) next = 0;
  playVideo(next);
}


// ---------- RESULTS UI ----------
function renderResults() {
  results.innerHTML = "";

  playlist.forEach((video, index) => {
    const div = document.createElement("div");
    div.className =
      "video-item" + (index === currentIndex ? " active" : "");

    div.innerHTML = `
      <img src="${video.thumb || ''}">
      <div class="video-title">${video.title || "ללא כותרת"}</div>
    `;

    div.onclick = () => playVideo(index);
    results.appendChild(div);
  });
}


// ---------- EMPTY STATE ----------
function showEmpty(msg) {
  playerContainer.innerHTML = `<p>${msg}</p>`;
  results.innerHTML = "";
}
