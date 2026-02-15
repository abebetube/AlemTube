"use strict";

let playlist = [];
let currentIndex = 0;
let playerContainer, results, searchInput;
let autoplayEnabled = true;
let player = null;
let failedVideos = new Set(); // סט למעקב אחר סרטונים שנכשלו

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
  
  // הצגת מסך פתיחה
  showSplashScreen();
  
  // טעינת YouTube API
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
      
      // השלמת טעינה
      setTimeout(() => {
        splash.classList.add('hidden');
        
        setTimeout(() => {
          splash.style.display = 'none';
          
          // פוקוס על שדה החיפוש
          setTimeout(() => {
            if (searchInput) {
              searchInput.focus();
            }
          }, 300);
          
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
  failedVideos.clear(); // נקה את רשימת הסרטונים שנכשלו
  results.innerHTML = "";
  
  playerContainer.innerHTML = '<div class="loading">מחפש סרטונים...</div>';
  
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.disabled = true;
  
  try {
    const res = await fetch(
      `https://alemtube-vhr1.onrender.com/search?q=${encodeURIComponent(query)}`
    );
    
    if (!res.ok) {
      throw new Error(`שגיאה בחיפוש: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      results.innerHTML = '<div class="empty-list">לא נמצאו סרטונים</div>';
      playerContainer.innerHTML = '<div class="player-placeholder"><p>לא נמצאו סרטונים</p></div>';
      return;
    }
    
    // בדיקת סרטונים שניתנים לנגינה - בדיקה מעמיקה יותר
    const playableVideos = [];
    
    for (const video of data) {
      // דלג אם כבר נכשל בעבר
      if (failedVideos.has(video.videoId)) continue;
      
      // בדוק אם הסרטון זמין
      const isPlayable = await checkIfVideoPlayable(video.videoId);
      if (isPlayable) {
        playableVideos.push({
          ...video,
          thumb: video.thumb || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
        });
      } else {
        // הוסף לרשימת הסרטונים שנכשלו
        failedVideos.add(video.videoId);
        console.log(`סרטון לא זמין נדחה: ${video.videoId}`);
      }
    }
    
    if (playableVideos.length === 0) {
      results.innerHTML = '<div class="empty-list">לא נמצאו סרטונים זמינים לניגון</div>';
      playerContainer.innerHTML = '<div class="player-placeholder"><p>לא נמצאו סרטונים זמינים לניגון</p></div>';
      return;
    }
    
    playlist = playableVideos;
    
    // אם יש סרטונים, נגן את הראשון
    if (playlist.length > 0) {
      playVideo(0);
    }
    
    renderResults();
    
  } catch (err) {
    console.error("שגיאה בחיפוש:", err);
    playerContainer.innerHTML = '<div class="player-placeholder"><p>שגיאה בחיפוש</p></div>';
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

async function checkIfVideoPlayable(videoId) {
  return new Promise((resolve) => {
    // בדיקה פשוטה - נסה לטעון את התמונה
    const img = new Image();
    img.onload = () => {
      // אם התמונה נטענת, בדוק גם אם אפשר לטעון את ה-iFrame
      testIframeEmbed(videoId).then(resolve);
    };
    img.onerror = () => resolve(false);
    img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    setTimeout(() => resolve(false), 3000);
  });
}

// בדיקה נוספת - ניסיון לטעון iframe קטן
async function testIframeEmbed(videoId) {
  return new Promise((resolve) => {
    const testIframe = document.createElement('iframe');
    testIframe.style.display = 'none';
    testIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    testIframe.onload = () => {
      document.body.removeChild(testIframe);
      resolve(true);
    };
    testIframe.onerror = () => {
      document.body.removeChild(testIframe);
      resolve(false);
    };
    
    setTimeout(() => {
      if (testIframe.parentNode) {
        document.body.removeChild(testIframe);
      }
      resolve(false);
    }, 2000);
    
    document.body.appendChild(testIframe);
  });
}

function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = function() {
  console.log("YouTube API Ready");
};

function playVideo(index) {
  if (index < 0 || index >= playlist.length) return;
  
  currentIndex = index;
  const video = playlist[index];
  
  if (player) {
    // טען סרטון חדש בנגן הקיים
    player.loadVideoById(video.videoId);
    player.playVideo();
  } else {
    // צור נגן חדש
    playerContainer.innerHTML = '<div id="player"></div>';
    
    player = new YT.Player('player', {
      height: '500',
      width: '100%',
      videoId: video.videoId,
      playerVars: {
        'autoplay': 1,
        'rel': 0,
        'modestbranding': 1,
        'playsinline': 1
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
        'onError': onPlayerError
      }
    });
  }
  
  renderResults();
}

function onPlayerReady(event) {
  console.log("Player ready");
}

function onPlayerStateChange(event) {
  // כאשר סרטון מסתיים
  if (event.data === YT.PlayerState.ENDED) {
    if (autoplayEnabled) {
      // נגן את הסרטון הבא
      setTimeout(() => {
        playNextAvailableVideo();
      }, 1000);
    }
  }
}

function onPlayerError(event) {
  console.error("Player error code:", event.data);
  
  // שגיאות ב-YouTube Player API:
  // 2, 5, 100, 101, 150 - סרטון לא זמין
  
  const currentVideo = playlist[currentIndex];
  if (currentVideo) {
    // הוסף את הסרטון לרשימת הסרטונים שנכשלו
    failedVideos.add(currentVideo.videoId);
    console.log(`סרטון נכשל נוסף לרשימה: ${currentVideo.videoId}`);
    
    // הסר את הסרטון מהפלייליסט
    playlist.splice(currentIndex, 1);
    
    // אם אין יותר סרטונים ברשימה
    if (playlist.length === 0) {
      playerContainer.innerHTML = '<div class="player-placeholder"><p>אין סרטונים זמינים</p></div>';
      results.innerHTML = '<div class="empty-list">אין סרטונים זמינים</div>';
      return;
    }
    
    // התאם את האינדקס הנוכחי
    if (currentIndex >= playlist.length) {
      currentIndex = playlist.length - 1;
    }
    
    // נגן סרטון זמין
    if (autoplayEnabled && playlist.length > 0) {
      console.log("עובר לסרטון זמין הבא...");
      setTimeout(() => {
        playVideo(currentIndex);
      }, 1000);
    } else if (playlist.length > 0) {
      // אם אוטופליי כבוי, עדכן רק את התצוגה
      renderResults();
    }
  }
}

// פונקציה למעבר לסרטון הבא הזמין
function playNextAvailableVideo() {
  if (playlist.length === 0) {
    playerContainer.innerHTML = '<div class="player-placeholder"><p>אין עוד סרטונים</p></div>';
    return;
  }
  
  let nextIndex = currentIndex + 1;
  
  // מצא את הסרטון הבא הזמין
  while (nextIndex < playlist.length) {
    const nextVideo = playlist[nextIndex];
    if (nextVideo && !failedVideos.has(nextVideo.videoId)) {
      playVideo(nextIndex);
      return;
    }
    nextIndex++;
  }
  
  // אם לא נמצא סרטון אחרי המיקום הנוכחי, נסה מההתחלה
  for (let i = 0; i < currentIndex; i++) {
    const video = playlist[i];
    if (video && !failedVideos.has(video.videoId)) {
      playVideo(i);
      return;
    }
  }
  
  // אם לא נמצא שום סרטון זמין
  playerContainer.innerHTML = '<div class="player-placeholder"><p>אין סרטונים זמינים</p></div>';
  results.innerHTML = '<div class="empty-list">אין סרטונים זמינים</div>';
}

function renderResults() {
  results.innerHTML = "";
  
  if (playlist.length === 0) {
    results.innerHTML = '<div class="empty-list">אין סרטונים ברשימה</div>';
    return;
  }
  
  // הצג רק סרטונים שלא נכשלו
  playlist.forEach((video, index) => {
    // דלג על סרטונים שנכשלו
    if (failedVideos.has(video.videoId)) return;
    
    const div = document.createElement("div");
    div.className = "video-item" + (index === currentIndex ? " active" : "");
    div.innerHTML = `
      <img src="${video.thumb}" alt="${video.title}" 
           onerror="this.src='https://via.placeholder.com/320x180/333333/ffffff?text=תמונה+לא+זמינה'">
      <div class="video-title">${video.title || "ללא כותרת"}</div>
    `;
    
    div.onclick = () => {
      playVideo(index);
    };
    
    results.appendChild(div);
  });
  
  // אם אחרי הסינון אין תוצאות
  if (results.children.length === 0) {
    results.innerHTML = '<div class="empty-list">אין סרטונים זמינים להצגה</div>';
  }
}

// פונקציה לניקוי הפלייליסט מסרטונים שנכשלו
function cleanupFailedVideos() {
  playlist = playlist.filter(video => !failedVideos.has(video.videoId));
  renderResults();
}
