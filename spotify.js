// --- CONFIG --- 
// --- LOAD CONFIG FROM SERVER ---
let clientId, redirectUri;

(async () => {
  try {
    const configRes = await fetch("/config");
    const config = await configRes.json();

    const clientId = config.clientId;
    const redirectUri = config.redirectUri;

    // --- SCOPES ---
    const scope = "user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state user-library-modify";

    // --- TOKEN HELPERS ---
    const getStoredTokenData = () => {
      return {
        access_token: localStorage.getItem("access_token"),
        refresh_token: localStorage.getItem("refresh_token"),
        expires_at: parseInt(localStorage.getItem("expires_at") || "0", 10)
      };
    };

    const saveTokenData = (data) => {
      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem("expires_at", expiresAt.toString());
    };

    async function refreshAccessToken(clientId) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return null;

      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });

      const data = await response.json();

      if (data.access_token) {
        saveTokenData(data);
        return data.access_token;
      } else {
        console.warn("Failed to refresh token:", data);
        return null;
      }
    }

    // --- PKCE UTILS ---
    const generateRandomString = (length) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const values = crypto.getRandomValues(new Uint8Array(length));
      return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };

    const sha256 = async (plain) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      return crypto.subtle.digest('SHA-256', data);
    };

    const base64encode = (input) => {
      return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    // --- MAIN AUTH LOGIC ---
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      const { access_token, refresh_token, expires_at } = getStoredTokenData();

      // If we already have a valid access token
      if (access_token && Date.now() < expires_at) {
        console.log("✅ Using stored access token");
        setupPlayerControls();
        animateProgressBar();
        return;
      }

      // If token expired but we have a refresh token
      if (refresh_token) {
        console.log("🔄 Refreshing expired access token...");
        const newAccess = await refreshAccessToken(clientId);
        if (newAccess) {
          setupPlayerControls();
          animateProgressBar();
          return;
        }
      }

      // If we’re returning from Spotify auth
      if (code) {
        const codeVerifier = localStorage.getItem("code_verifier");
        const body = new URLSearchParams({
          client_id: clientId,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        });

        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body
        });

        const data = await response.json();
        if (data.access_token) {
          saveTokenData(data);
          window.history.replaceState({}, document.title, "/"); // remove ?code=...
          setupPlayerControls();
          animateProgressBar();
          return;
        } else {
          document.body.innerHTML = `<h2>Something went wrong</h2><pre>${JSON.stringify(data, null, 2)}</pre>`;
          return;
        }
      }

      // Otherwise, start the authorization flow
      const codeVerifier = generateRandomString(64);
      localStorage.setItem("code_verifier", codeVerifier);

      const hashed = await sha256(codeVerifier);
      const codeChallenge = base64encode(hashed);

      const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
      window.location.href = authUrl;
    })();

  } catch (err) {
    console.error("Failed to fetch /config:", err);
  }
})();


// --- WEB API CONTROLS ---


function updateTitleScrolling() {
  const wrapper = document.querySelector('.title-wrapper');
  const title = document.getElementById('song-title');

  if (title.scrollWidth > wrapper.clientWidth) {
    title.classList.add('scrolling-text');
  } else {
    title.classList.remove('scrolling-text');
  }
}

function forceRepaint(el) {
  el.style.transform = "scale(1.0001)";
  requestAnimationFrame(() => {
    el.style.transform = "scale(1)";
  });
}

let currentProgress = 0;
let currentDuration = 1;
let lastUpdateTimestamp = Date.now();

function animateProgressBar() {
  const progressEl = document.getElementById("progress-bar");

  const update = () => {
    const elapsed = Date.now() - lastUpdateTimestamp;
    const smoothedProgress = currentProgress + elapsed;
    const percent = Math.min((smoothedProgress / currentDuration) * 100, 100);
    progressEl.style.width = `${percent}%`;
    requestAnimationFrame(update);
  };

  update();
}

// async function findLikedSongs(){
//   const token = localStorage.getItem("access_token");
//   const res = await fetch("https://api.spotify.com/v1/me/tracks", {
//     method: "GET",
//     headers: {
//       Authorization: `Bearer ${token}`
//     }
//   });

//   if (!res.ok) return;

//   const data = await res.json();
//   console.log(data);
// }

async function updateCurrentSongInfo() {
  //findLikedSongs();
  const titleHTML = document.getElementById("song-title");
  const artistsHTML = document.getElementById("artists");
  const albumcoverHTML = document.getElementById("album-cover");

  const token = localStorage.getItem("access_token");

  const song = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
  }
});

  if (!song.ok || song.status === 204) {
    console.log("No song playing");
    titleHTML.textContent = "-";
    artistsHTML.textContent = "-";
    albumcoverHTML.src = "images/default.png";
    currentProgress = 0;
    currentDuration = 1;
    return;
  }

  const data = await song.json();
  const title = data.item.name;
  const artists = data.item.artists.map(a => a.name).join(", ");
  const albumImg = data.item.album.images[1].url;

  titleHTML.textContent = title;
  updateTitleScrolling();
  artistsHTML.textContent = artists;
  albumcoverHTML.src = albumImg;

  currentProgress = data.progress_ms;
  currentDuration = data.item.duration_ms;
  lastUpdateTimestamp = Date.now();
}

document.querySelector(".progress-container").addEventListener("click", async (e) => {
  const token = localStorage.getItem("access_token");
  const container = e.currentTarget;
  const rect = container.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;

  const percent = clickX / width;

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok || res.status === 204) return;
  const data = await res.json();
  const duration = data.item.duration_ms;

  const seekTo = Math.floor(percent * duration);

  await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${seekTo}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  updateCurrentSongInfo();
});

async function checkPlayPause() {
  const token = localStorage.getItem("access_token");
  const res = await fetch("https://api.spotify.com/v1/me/player/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  localStorage.setItem("is_playing", data.is_playing);
}

function updatePlayPauseImage(is_playing) {
  const playImg = document.querySelector("#play img");
  playImg.src = is_playing ? "images/play.png" : "images/pause.png";
}

async function setupPlayerControls() {
  await updateCurrentSongInfo();
  await checkPlayPause();
  is_playing = localStorage.getItem("is_playing") === "true";
  updatePlayPauseImage(is_playing);
  const token = localStorage.getItem("access_token");

  document.getElementById("play").onclick = async () => {
    if (is_playing) {
      await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    is_playing = !is_playing;
    updatePlayPauseImage(is_playing);
  };

  await updateCurrentSongInfo();

  document.getElementById("next").onclick = async () => {
    await fetch("https://api.spotify.com/v1/me/player/next", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    setTimeout(() => {
      updateCurrentSongInfo();
    }, 500);
  };

  document.getElementById("previous").onclick = async () => {
    const playbackRes = await fetch("https://api.spotify.com/v1/me/player", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!playbackRes.ok) return;

    const playbackData = await playbackRes.json();
    const currentPosition = playbackData.progress_ms;

    if (currentPosition < 3000) {
      await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      await fetch("https://api.spotify.com/v1/me/player/seek?position_ms=0", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    setTimeout(() => {
      updateCurrentSongInfo();
    }, 500);
  };
  
  setInterval(async () => {
    await updateCurrentSongInfo();
    await checkPlayPause();
    let is_playing = localStorage.getItem("is_playing") === "true";
    updatePlayPauseImage(is_playing);
  }, 3000);
}
