"use strict";

// 🚫 הגנות מפני ניווט חיצוני - הוסף מיד בהתחלה
(function setupSecurityProtections() {
  // חסום פתיחת חלונות חיצוניים
  const originalOpen = window.open;
  window.open = function(url, target, features) {
    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      console.log('חסימת פתיחת חלון יוטיוב חיצוני:', url);
      // ננסה לפתוח את הסרטון באפליקציה במקום
      const videoId = extractVideoId(url);
      if (videoId) {
        setTimeout(() => openVideoInApp(videoId), 100);
      }
      return null;
    }
    return originalOpen.call(window, url, target, features);
  };

  // חסום ניווט חיצוני
  document.addEventListener('click', function(e) {
    let target = e.target;
    
    // חפש אלמנט <a> קליק
    while (target && target !== document) {
      if (target.tagName === 'A' && target.href) {
        const href = target.href.toLowerCase();
        
        // בדוק אם זה לינק יוטיוב חיצוני
        if (href.includes('youtube.com/watch') || href.includes('youtu.be/')) {
          e.preventDefault();
          e.stopPropagation();
          
          const videoId = extractVideoId(href);
          if (videoId) {
            openVideoInApp(videoId);
          } else {
            showNotification('לינק יוטיוב - השתמש בחיפוש הפנימי', 'warning');
          }
          return false;
        }
      }
      target = target.parentNode;
    }
  }, true);

  // הגן מפני iframe בתוך iframe
  if (window.top !== window.self) {
    try {
      window.top.location = window.self.location;
    } catch (e) {
      console.warn('אתר ממוסגר - הגנה פעילה');
    }
  }
})();

let playlist = [];
let currentIndex = 0;
let player = null;
let playerContainer, results, searchInput;
let autoPlayEnabled = true;
let lastQuery = "";
let playedVideos = new Set();
let videoEndCheckInterval = null;

// 🧠 מחכים שה־DOM יהיה מוכן
document.addEventListener("DOMContentLoaded", () => {
  playerContainer = document.getElementById("player-container");
  results = document.getElementById("results");
  searchInput = document.getElementById("searchInput");

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.onclick = searchVideos;

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") searchVideos();
  });

  // Toggle Autoplay
  const autoBtn = document.getElementById("autoplayToggle");
  if (autoBtn) {
    autoBtn.onclick = () => {
      autoPlayEnabled = !autoPlayEnabled;
      autoBtn.innerText = "Autoplay: " + (autoPlayEnabled ? "ON" : "OFF");
      if (!autoPlayEnabled) {
        removeEmergencyStop();
        clearVideoEndCheck();
      } else {
        setupVideoEndCheck();
      }
    };
  }

  loadFromCache();
  
  // טען YouTube API
  loadYouTubeAPI();
});

// Splash
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.5s';
      setTimeout(() => {
        splash.style.display = 'none';
      }, 500);
    }
  }, 2000);
});

// 🔍 חיפוש - גרסה מוגנת
async function searchVideos() {
  const q = searchInput.value.trim();
  if (!q) {
    showNotification("נא להזין מונח חיפוש", "warning");
    return;
  }

  // בדיקת אבטחה - מניעת URLים חיצוניים שאינם יוטיוב
  if (isExternalUrlAttempt(q) && !q.includes("youtu")) {
    showNotification("שימוש בקישורים חיצוניים חסום. השתמש בחיפוש טקסטואלי.", "warning");
    return;
  }

  lastQuery = q;
  playedVideos.clear();
  clearVideoEndCheck();

  playlist = [];
  currentIndex = 0;
  results.innerHTML = "";
  playerContainer.innerHTML = "<div class='loading'>טוען...</div>";

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.disabled = true;

  try {
    // URL ישיר של יוטיוב
    if (q.includes("youtu")) {
      const id = extractVideoId(q);
      if (!id) {
        showNotification("קישור YouTube לא תקין", "error");
        return;
      }

      showNotification("בודק סרטון...", "info");
      
      if (await checkEmbeddable(id)) {
        playlist = [{ 
          videoId: id, 
          title: "סרטון מהקישור", 
          thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` 
        }];
        playVideo(0);
      } else {
        showNotification("הסרטון לא ניתן להטמעה", "error");
      }
      return;
    }

    // חיפוש דרך השרת
    showNotification("מבצע חיפוש...", "info");
    
    const res = await fetch(
      `https://alemtube-v.onrender.com/search?q=${encodeURIComponent(q)}`
    );
    
    if (!res.ok) {
      throw new Error(`שגיאה בחיפוש: ${res.status}`);
    }
    
    const data = await res.json();

    if (!data || data.length === 0) {
      showNotification("לא נמצאו סרטונים", "info");
      playerContainer.innerHTML = '<div class="empty-list">לא נמצאו סרטונים</div>';
      return;
    }

    // בדוק סרטונים רק אם הם ניתנים להטמעה
    const embeddableVideos = [];
    
    for (const video of data) {
      try {
        if (await checkEmbeddable(video.videoId)) {
          embeddableVideos.push({
            ...video,
            thumb: video.thumb || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
          });
        }
      } catch (e) {
        console.warn("שגיאה בבדיקת סרטון:", video.videoId, e);
      }
      
      // עצור אם יש מספיק סרטונים ניתנים להטמעה
      if (embeddableVideos.length >= 15) break;
    }

    if (embeddableVideos.length === 0) {
      showNotification("אין סרטונים ניתנים להטמעה בתוצאות", "error");
      playerContainer.innerHTML = '<div class="empty-list">אין סרטונים ניתנים להטמעה</div>';
      return;
    }

    playlist = embeddableVideos;
    showNotification(`נמצאו ${playlist.length} סרטונים זמינים`, "success");
    playVideo(0);

  } catch (err) {
    console.error("שגיאה בחיפוש:", err);
    showNotification("שגיאה בחיפוש, נסה שוב", "error");
    playerContainer.innerHTML = '<div class="error">שגיאה בחיפוש</div>';
  } finally {
    if (searchBtn) searchBtn.disabled = false;
  }
}

// פונקציה לפתיחת סרטון באפליקציה במקום חיצוני
function openVideoInApp(videoId) {
  showNotification('פותח סרטון באפליקציה...', 'info');
  
  // נקה הכל קודם
  lastQuery = "סרטון ישיר";
  playedVideos.clear();
  clearVideoEndCheck();
  
  playlist = [{ 
    videoId: videoId, 
    title: "סרטון", 
    thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` 
  }];
  currentIndex = 0;
  
  playVideo(0);
}

// ▶️ ניגון - עם הגנות iframe
function playVideo(index) {
  if (index < 0 || index >= playlist.length) {
    console.error("אינדקס לא תקין:", index);
    return;
  }

  currentIndex = index;
  const video = playlist[index];
  playedVideos.add(video.videoId);

  saveToCache();
  removeEmergencyStop();
  clearVideoEndCheck();

  // יצירת iframe עם הגנות
  const iframeHTML = `
    <div class="player-wrapper">
      <iframe
        id="ytplayer"
        src="https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        style="width:100%; height:100%; min-height:400px; border:none;"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
        referrerpolicy="strict-origin-when-cross-origin"
        title="YouTube video player"
      ></iframe>
    </div>
  `;
  
  playerContainer.innerHTML = iframeHTML;

  // הוסף הגנות נוספות על ה-iframe
  setTimeout(() => {
    const iframe = document.getElementById('ytplayer');
    if (iframe) {
      // מניעת drag-and-drop מה-iframe
      iframe.addEventListener('dragstart', (e) => e.preventDefault());
      
      // מניעת קליק ימני
      iframe.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showNotification('פעולה זו חסומה באפליקציה זו', 'warning');
      });
      
      // הגבל אינטראקציות עם ה-iframe
      iframe.style.pointerEvents = 'auto'; // אבל הגבלנו דרך sandbox
    }
  }, 100);

  // עדכן את רשימת התוצאות
  renderResults();
  
  // גלול למעלה להצגת הנגן
  setTimeout(() => {
    playerContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
  
  // אתחל את הפלייר של YouTube
  initYouTubePlayer();
  
  // הפעל מעקב לסיום הסרטון
  if (autoPlayEnabled) {
    setupVideoEndCheck();
  }
}

// אתחול YouTube Player
function initYouTubePlayer() {
  // אם הפלייר הקיים תקין, נשתמש בו
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(playlist[currentIndex].videoId);
    return;
  }

  // אחרת, נחכה שה-API יהיה זמין ונאתחל פלייר חדש
  const initPlayer = () => {
    if (window.YT && window.YT.Player) {
      // אם יש פלייר קיים, נשמיד אותו
      if (player) {
        try {
          player.destroy();
        } catch (e) {
          console.warn("שגיאה בהריסת פלייר ישן:", e);
        }
      }

      // נאתחל פלייר חדש
      player = new YT.Player('ytplayer', {
        events: {
          onReady: () => {
            console.log("YouTube Player מוכן");
          },
          onStateChange: (e) => {
            console.log("מצב פלייר:", e.data);
            
            // אם הסרטון הסתיים ואנו במצב אוטופליי
            if (e.data === YT.PlayerState.ENDED && autoPlayEnabled) {
              console.log("סרטון הסתיים, ממשיך אוטומטית...");
              handleVideoEnded();
            }
          },
          onError: (e) => {
            console.error("שגיאה בפלייר YouTube:", e);
            if (e.data === 150 || e.data === 101 || e.data === 100) {
              showNotification("סרטון זה אינו ניתן לצפייה", "error");
              // נסה למחוק את הסרטון מהרשימה אם לא ניתן לצפות בו
              playlist.splice(currentIndex, 1);
              if (playlist.length > 0) {
                playVideo(Math.max(0, currentIndex - 1));
              }
            }
          }
        }
      });
    } else {
      // ה-API עדיין לא זמין, ננסה שוב
      setTimeout(initPlayer, 100);
    }
  };

  // נתחיל את האתחול אחרי זמן קצר
  setTimeout(initPlayer, 500);
}

// 📃 רשימה מסודרת של תוצאות
function renderResults() {
  results.innerHTML = "";
  
  if (playlist.length === 0) {
    results.innerHTML = '<div class="empty-list">אין סרטונים ברשימה</div>';
    return;
  }

  playlist.forEach((v, i) => {
    const div = document.createElement("div");
    div.className = `video-item ${i === currentIndex ? 'active' : ''}`;
    div.innerHTML = `
      <img src="${v.thumb}" alt="${v.title}" 
           onerror="this.src='https://via.placeholder.com/250x140/333333/ffffff?text=No+Preview'">
      <div class="video-title">${escapeHtml(v.title) || "ללא כותרת"}</div>
    `;

    div.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      playVideo(i);
    };

    results.appendChild(div);
  });
}

// 🔁 טוען סרטונים נוספים עבור אוטופליי
async function loadMoreVideos() {
  if (!lastQuery || !autoPlayEnabled) return;

  console.log("טוען סרטונים נוספים...");
  
  // הוסף כפתור עצירה
  addEmergencyStop();
  
  // הצג טוען
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'loading-more';
  loadingMsg.textContent = 'טוען סרטונים נוספים...';
  results.appendChild(loadingMsg);

  try {
    const res = await fetch(
      `https://alemtube-v.onrender.com/search?q=${encodeURIComponent(lastQuery)}&skip=${playlist.length}`
    );
    
    if (!res.ok) throw new Error(`שגיאה: ${res.status}`);
    
    const data = await res.json();
    let added = 0;

    for (const v of data) {
      if (playedVideos.has(v.videoId)) continue;
      if (!(await checkEmbeddable(v.videoId))) continue;

      playlist.push({
        ...v,
        thumb: v.thumb || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`
      });
      added++;
      
      // אם זו התוספת הראשונה, נגן אותה
      if (added === 1) {
        playVideo(playlist.length - 1);
        break;
      }
    }

    if (added === 0) {
      showNotification("לא נמצאו סרטונים חדשים", "info");
    } else {
      showNotification(`נוספו ${added} סרטונים חדשים`, "success");
    }
  } catch (e) {
    console.error("שגיאה בטעינת סרטונים נוספים:", e);
    showNotification("שגיאה בטעינת סרטונים נוספים", "error");
  } finally {
    loadingMsg.remove();
  }
}

// ניהול סיום סרטון
function setupVideoEndCheck() {
  clearVideoEndCheck();
  
  videoEndCheckInterval = setInterval(() => {
    if (!autoPlayEnabled || !player) return;
    
    try {
      // בדיקה אם הסרטון קרוב לסיום (95% ומעלה)
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      
      if (duration > 0 && currentTime > 0) {
        const progressPercent = (currentTime / duration) * 100;
        
        if (progressPercent >= 95) {
          console.log("סרטון קרוב לסיום, מכין סרטון הבא...");
          handleVideoEnded();
        }
      }
    } catch (e) {
      console.warn("שגיאה בבדיקת סיום סרטון:", e);
    }
  }, 2000); // בדוק כל 2 שניות
}

function clearVideoEndCheck() {
  if (videoEndCheckInterval) {
    clearInterval(videoEndCheckInterval);
    videoEndCheckInterval = null;
  }
}

function handleVideoEnded() {
  clearVideoEndCheck();
  
  setTimeout(() => {
    if (currentIndex < playlist.length - 1) {
      // יש עוד סרטונים ברשימה
      console.log("עובר לסרטון הבא:", currentIndex + 1);
      playVideo(currentIndex + 1);
    } else {
      // אין סרטונים נוספים, נטען חדשים
      console.log("טוען סרטונים נוספים...");
      loadMoreVideos();
    }
  }, 2000);
}

// ⭐ בדיקת embed - שיטה פשוטה יותר
async function checkEmbeddable(videoId) {
  try {
    // בדיקה פשוטה - נסה לטעון את התמונה
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      setTimeout(() => reject(new Error("Timeout")), 3000);
    });
    return true;
  } catch {
    return false;
  }
}

// 🛑 כפתור עצירת חירום לאוטופליי
function addEmergencyStop() {
  if (document.getElementById('emergency-stop')) return;
  
  const stopBtn = document.createElement('button');
  stopBtn.id = 'emergency-stop';
  stopBtn.innerHTML = '⏹ עצור אוטופליי';
  stopBtn.style.cssText = `
    position: fixed;
    top: 80px;
    right: 10px;
    z-index: 10000;
    padding: 10px 15px;
    background: #cc0000;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s;
    font-size: 0.9rem;
  `;
  
  stopBtn.onmouseover = () => {
    stopBtn.style.transform = 'scale(1.05)';
    stopBtn.style.background = '#b30000';
  };
  
  stopBtn.onmouseout = () => {
    stopBtn.style.transform = 'scale(1)';
    stopBtn.style.background = '#cc0000';
  };
  
  stopBtn.onclick = () => {
    autoPlayEnabled = false;
    const autoBtn = document.getElementById('autoplayToggle');
    if (autoBtn) autoBtn.innerText = 'Autoplay: OFF';
    removeEmergencyStop();
    clearVideoEndCheck();
    showNotification("אוטופליי הופסק", "info");
  };
  
  document.body.appendChild(stopBtn);
}

function removeEmergencyStop() {
  const stopBtn = document.getElementById('emergency-stop');
  if (stopBtn) stopBtn.remove();
}

// 💾 Cache
function saveToCache() {
  try {
    const cacheData = {
      playlist: playlist,
      index: currentIndex,
      lastQuery: lastQuery,
      playedVideos: Array.from(playedVideos),
      timestamp: Date.now()
    };
    localStorage.setItem("alemtube_cache", JSON.stringify(cacheData));
  } catch (e) {
    console.warn("שגיאה בשמירה ל-cache:", e);
  }
}

function loadFromCache() {
  try {
    const cached = localStorage.getItem("alemtube_cache");
    if (!cached) return;
    
    const data = JSON.parse(cached);
    
    // בדוק אם הנתונים ישנים מדי (יותר מ-24 שעות)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("alemtube_cache");
      return;
    }
    
    playlist = data.playlist || [];
    currentIndex = data.index || 0;
    lastQuery = data.lastQuery || "";
    playedVideos = new Set(data.playedVideos || []);
    
    // וודא שיש תמונות לכל הסרטונים
    playlist = playlist.map(v => ({
      ...v,
      thumb: v.thumb || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`
    }));
    
    if (playlist.length > 0 && currentIndex < playlist.length) {
      setTimeout(() => {
        playVideo(currentIndex);
      }, 1000);
    }
  } catch (e) {
    console.warn("שגיאה בטעינה מ-cache:", e);
    localStorage.removeItem("alemtube_cache");
  }
}

// 📢 הצגת הודעות
function showNotification(message, type = "info") {
  // הסר הודעות קודמות
  const oldNotifications = document.querySelectorAll('.notification');
  oldNotifications.forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };
  
  notification.innerHTML = `
    <span class="notification-icon">${icons[type] || icons.info}</span>
    <span class="notification-text">${escapeHtml(message)}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// 🆔 חילוץ ID מ-URL
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// 🎬 טעינת YouTube API
function loadYouTubeAPI() {
  // בדוק אם ה-API כבר נטען
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    return;
  }
  
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  tag.async = true;
  document.head.appendChild(tag);
}

// הגדרת פונקציה גלובלית עבור YouTube API
window.onYouTubeIframeAPIReady = function() {
  console.log("YouTube API loaded");
  
  // אם יש סרטון בטעינה, אתחל את הפלייר
  if (playlist.length > 0) {
    initYouTubePlayer();
  }
};

// 🔧 פונקציות עזר חדשות

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function isExternalUrlAttempt(text) {
  const urlPatterns = [
    /https?:\/\/[^\s]+/g,
    /www\.[^\s]+\.[^\s]+/g,
    /[^\s]+\.[a-z]{2,}\/[^\s]*/g
  ];
  
  // אם זה נראה כמו URL אבל לא של יוטיוב
  if (!text.includes("youtu") && urlPatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  return false;
}

// הגנה מפני שינויים זדוניים ב-DOM
(function setupDOMMonitoring() {
  // סרוק את הדף כל 30 שניות ללינקים חיצוניים
  setInterval(() => {
    const externalLinks = document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]');
    externalLinks.forEach(link => {
      if (!link.hasAttribute('data-alemtube-protected')) {
        link.setAttribute('data-alemtube-protected', 'true');
        link.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const videoId = extractVideoId(this.href);
          if (videoId) {
            openVideoInApp(videoId);
          }
        });
      }
    });
  }, 30000);
})();
