# 🎵 Music Player Widget

A lightweight desktop music player widget built with **Electron** and the **Spotify Web API**. It sits on your desktop and displays your currently playing track — album art, song title, artist name, and a live progress bar — with playback controls to skip, pause, and resume without ever opening Spotify.

---

## ✨ Features

- **Now Playing Display** — Shows the current song title (with smooth scrolling for long titles) and artist name
- **Album Art** — Dynamically updates with the current track's album cover
- **Playback Controls** — Previous, Play/Pause, and Next buttons
- **Live Progress Bar** — Tracks playback position in real time
- **Spotify OAuth Login** — Secure login via the Spotify Authorization Code flow
- **Always-on-top Widget** — Stays on your desktop without interrupting your workflow

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Electron](https://www.electronjs.org/) |
| Auth Server | [Express](https://expressjs.com/) |
| Music Source | [Spotify Web API](https://developer.spotify.com/documentation/web-api) |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Environment | [dotenv](https://github.com/motdotla/dotenv) |

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- A [Spotify account](https://www.spotify.com/) (Free or Premium)
- A registered [Spotify Developer App](https://developer.spotify.com/dashboard)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/michaelawad3/Music-Player-Widget.git
cd Music-Player-Widget
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Your Spotify App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new app.
2. In your app's settings, add the following **Redirect URI**:
http://127.0.0.1:8080
3. Copy your **Client ID**.

### 4. Configure Your Credentials

Open `spotify.js` and replace the placeholder with your Client ID:
```js
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
```

> **Tip:** For better security, consider moving your credentials into a `.env` file. The project already includes `dotenv` as a dependency.

### 5. Run the App
```bash
npm run start
```

A window will open and prompt you to log in to Spotify via your browser. After authorizing, the widget will appear and begin showing your currently playing track.

---

## 📁 Project Structure
Music-Player-Widget/
├── images/              # UI icons (play, pause, previous, next, default album art)
├── index.html           # Widget UI layout
├── style.css            # Widget styling
├── spotify.js           # Spotify API integration & playback logic
├── main.js              # Electron main process (window creation & lifecycle)
├── preload.js           # Electron preload script (context bridge)
├── package.json         # Project metadata & scripts
└── .gitignore

---

## 🔧 How It Works

1. **Electron** launches a frameless, always-on-top browser window that renders `index.html`.
2. An **Express** server starts locally on port `8080` to handle the Spotify OAuth redirect.
3. The app opens a browser tab to initiate the **Spotify Authorization Code flow**. After the user logs in, Spotify redirects back to the local server with an authorization code.
4. The code is exchanged for an **access token**, which is used to poll the Spotify Web API for the currently playing track.
5. The UI updates in real time — album art, song/artist info, and the progress bar all reflect the live playback state.

---

## ⚠️ Known Limitations

- Requires an active Spotify session (something must be playing for the widget to display track info).
- Volume control and Save Track features are currently commented out in the UI (work in progress).
- The access token expires after 1 hour; token refresh is not yet implemented.
