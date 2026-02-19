

"use strict";

let playlist = [];
let currentIndex = 0;
let playerContainer, results, searchInput;
let autoplayEnabled = true;
let player = null;
let failedVideos = new Set();

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

function initializeApp() {
  playerContainer = document.getElementById("player-container");
  results = document.getElementById("results");
  searchInput = document.getElementById("searchInput");

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.onclick = searchVideos;

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchVideos();
  });

  showSplashScreen();
  loadYouTubeAPI();
}

function showSplashScreen() {
  const splash = document.getElementById("splash");
  const loadingProgress = document.querySelector('.loading-progress');

  if (!splash || !loadingProgress) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20 + 10;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      setTimeout(() => {
        splash.classList.add('hidden');
        setTimeout(() => {
          splash.style.display = 'none';
          searchInput?.focus();
        }, 500);
      }, 500);
    }

    loadingProgress.style.width = progress + '%';
  }, 150);
}

async function searchVideos() {
  const query = searchInput.value.trim();
  if (!query) {
    alert("נא להזין מילת חיפוש");
    return;
  }

  playlist = [];
  currentIndex = 0;
  failedVideos.clear();
  results.innerHTML = "";
  playerContainer.innerHTML = '<div class="loading">מחפש סרטונים...</div>';

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.disabled = true;

  try {
    const res = await fetch(
      `https://alemtube-8nwl.onrender.com/search?q=${encodeURIComponent(query)}`
    );

    if (!res.ok) throw new Error(res.status);


    const data = await res.json();
const videos = data.results;

if (!Array.isArray(videos) || videos.length === 0) {
  results.innerHTML = '<div class="empty-list">לא נמצאו סרטונים</div>';
  playerContainer.innerHTML =
    '<div class="player-placeholder"><p>לא נמצאו סרטונים</p></div>';
  return;
}

// חשוב — להגדיר לפני השימוש
const playableVideos = [];

for (const video of videos) {
  if (failedVideos.has(video.videoId)) continue;

  const isPlayable = await checkIfVideoPlayable(video.videoId);

  if (isPlayable) {
    playableVideos.push({
      ...video,
      thumb:
        video.thumb ||
        `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
    });
  } else {
    failedVideos.add(video.videoId);
  }
}


    if (!playableVideos.length) {
      showEmpty("לא נמצאו סרטונים זמינים לניגון");
      return;
    }

    playlist = playableVideos;
    playVideo(0);
    renderResults();

  } catch (err) {
    console.error("שגיאה:", err);
    showEmpty("שגיאה בחיפוש");
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

function showEmpty(msg) {
  results.innerHTML = `<div class="empty-list">${msg}</div>`;
  playerContainer.innerHTML =
    `<div class="player-placeholder"><p>${msg}</p></div>`;
}

async function checkIfVideoPlayable(videoId) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => testIframeEmbed(videoId).then(resolve);
    img.onerror = () => resolve(false);
    img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    setTimeout(() => resolve(false), 3000);
  });
}

async function testIframeEmbed(videoId) {
  return new Promise(resolve => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `https://www.youtube.com/embed/${videoId}`;

    iframe.onload = () => {
      iframe.remove();
      resolve(true);
    };

    iframe.onerror = () => {
      iframe.remove();
      resolve(false);
    };

    setTimeout(() => {
      iframe.remove();
      resolve(false);
    }, 2000);

    document.body.appendChild(iframe);
  });
}

function loadYouTubeAPI() {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

window.onYouTubeIframeAPIReady = () => {
  console.log("YouTube API Ready");
};

function playVideo(index) {
  if (!playlist[index]) return;

  currentIndex = index;
  const video = playlist[index];

  if (player) {
    player.loadVideoById(video.videoId);
  } else {
    playerContainer.innerHTML = '<div id="player"></div>';

    player = new YT.Player("player", {
      height: "500",
      width: "100%",
      videoId: video.videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }

  renderResults();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED && autoplayEnabled) {
    playNextAvailableVideo();
  }
}

function onPlayerError() {
  const video = playlist[currentIndex];
  if (!video) return;

  failedVideos.add(video.videoId);
  playlist.splice(currentIndex, 1);

  if (!playlist.length) {
    showEmpty("אין סרטונים זמינים");
    return;
  }

  if (currentIndex >= playlist.length) currentIndex = 0;
  playVideo(currentIndex);
}

function playNextAvailableVideo() {
  if (!playlist.length) return;

  let next = currentIndex + 1;
  if (next >= playlist.length) next = 0;

  playVideo(next);
}

function renderResults() {
  results.innerHTML = "";

  playlist.forEach((video, index) => {
    if (failedVideos.has(video.videoId)) return;

    const div = document.createElement("div");
    div.className = "video-item" + (index === currentIndex ? " active" : "");

    div.innerHTML = `
      <img src="${video.thumb}" alt="${video.title}">
      <div class="video-title">${video.title || "ללא כותרת"}</div>
    `;

    div.onclick = () => playVideo(index);
    results.appendChild(div);
  });

  if (!results.children.length) {
    results.innerHTML = '<div class="empty-list">אין סרטונים</div>';
  }
}
  
