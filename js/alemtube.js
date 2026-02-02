window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("splash").style.display = "none";
  }, 4000);
});

let playlist = [];
let currentIndex = 0;

window.onload = () => loadFromCache();

document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchVideos();
  }
});


async function checkEmbeddable(id) {
  try {
    const res = await fetch(`https://alemtube-v.onrender.com/videos?id=${id}`);
    if (!res.ok) throw new Error("Server error " + res.status);
    const data = await res.json();
    return data.embeddable ?? false;
  } catch {
    return false;
  }
}

async function searchVideos() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  playlist = [];
  currentIndex = 0;
  document.getElementById("results").innerHTML = "";
  document.getElementById("player-container").innerHTML = "";

  const isURL = query.includes("youtube.com") || query.includes("youtu.be");
  if (isURL) {
    const match = query.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const videoId = match ? match[1] : "";
    if (videoId && await checkEmbeddable(videoId)) {
      playlist = [{ videoId, title: "סרטון שהוזן", thumb: "" }];
      currentIndex = 0;
      saveToCache();
      playVideo(currentIndex);
    }
    return;
  }

  // 🔹 החיפוש נעשה דרך backend
  const url = `https://alemtube-v.onrender.com/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Server fetch failed " + res.status);
    const data = await res.json();

    for (const item of data) {
      if (await checkEmbeddable(item.videoId)) {
        playlist.push(item);
      }
    }

    if (playlist.length === 0) return alert("לא נמצאו סרטונים ניתנים לניגון");

    currentIndex = 0;
    saveToCache();
    playVideo(currentIndex);
  } catch (e) {
    console.error("שגיאת חיפוש:", e);
  }
}

/*async function searchVideos() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  playlist = [];
  currentIndex = 0;
  document.getElementById("results").innerHTML = "";
  document.getElementById("player-container").innerHTML = "";

  const isURL = query.includes("youtube.com") || query.includes("youtu.be");
  if (isURL) {
    const match = query.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const videoId = match ? match[1] : "";
    if (videoId) {
      playlist = [{ videoId, title: "סרטון שהוזן", thumb: "" }];
      currentIndex = 0;
      saveToCache();
      playVideo(currentIndex);
    }
    return;
  }

  // 🔹 קריאה ל-backend שלך במקום ל-YouTube ישירות
  const url = `https://alemtube-v.onrender.com/search?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Server fetch failed " + res.status);
    const data = await res.json();

    for (const item of data) {
      playlist.push(item);
    }

    if (playlist.length === 0) return alert("לא נמצאו סרטונים ניתנים לניגון");

    currentIndex = 0;
    saveToCache();
    playVideo(currentIndex);
  } catch (e) {
    console.error("שגיאת חיפוש:", e);
  }
}
*/
/*function playVideo(index) {
  const video = playlist[index];
  if (!video) return;

  document.getElementById("player-container").innerHTML =
    `<iframe id="ytplayer" src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1" allowfullscreen allow="autoplay"></iframe>`;

  setTimeout(() => {
    document.getElementById("player-container").scrollIntoView({ behavior: "smooth" });
  }, 500);*/

function playVideo(index) {
  const video = playlist[index];
  if (!video) return;

 /* document.getElementById("player-container").innerHTML = `
    <iframe
      id="ytplayer"
      src="https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1&fs=0"
      allow="autoplay"
      sandbox="allow-scripts allow-same-origin"
      referrerpolicy="no-referrer"
    ></iframe>
  `;*/

  document.getElementById("player-container").innerHTML = `
  <iframe
    id="ytplayer"
    src="https://www.youtube-nocookie.com/embed/${video.videoId}
      ?autoplay=1
      &rel=0
      &modestbranding=1
      &iv_load_policy=3
      &fs=0
      &disablekb=1
      &playsinline=1"
    allow="autoplay"
    sandbox="allow-scripts allow-same-origin"
  ></iframe>
`;

  
  setTimeout(() => {
    document
      .getElementById("player-container")
      .scrollIntoView({ behavior: "smooth" });
  }, 300);


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

  setTimeout(() => setupPlayerEvents(), 1000);
}

function setupPlayerEvents() {
  if (typeof YT === "undefined" || typeof YT.Player === "undefined") return;
  new YT.Player("ytplayer", {
    events: {
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED && currentIndex + 1 < playlist.length) {
          currentIndex++;
          saveToCache();
          playVideo(currentIndex);
        }
      },
    },
  });
}

// 🔹 קאש
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

// 🔹 חסימת פרסומות
document.addEventListener('DOMContentLoaded', () => {
  const ads = document.querySelectorAll('.ad, .ads, .advertisement');
  ads.forEach(ad => ad.style.display = 'none');
});

function skipAds() {
  const adElements = document.querySelectorAll('.ad, .advertisement, #ad-container');
  adElements.forEach(el => el.style.display = 'none');
  const skipButton = document.querySelector('.skip-ad, .skip-button');
  if (skipButton) skipButton.click();
}

setInterval(skipAds, 3000);

// 🔹 YouTube iframe API
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// 🎆 Fireworks
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
  const splash = document.getElementById("splash");
  let count = 0;
  const interval = setInterval(() => {
    launchFireworks();
    count++;
    if (count >= 4) clearInterval(interval);
  }, 700);

  setTimeout(() => {
    splash.style.display = "none";
  }, 4000);
});

// לביטול פתיחה חיוצונית
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (a && a.href.includes("youtube.com")) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

