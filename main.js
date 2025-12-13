require('dotenv').config();

const { app, BrowserWindow, nativeImage, ipcMain, globalShortcut} = require('electron');
const path = require('path');
const express = require('express');

const PORT = 8080;

const startServer = () => {
  const server = express();

  // Serve frontend
  server.use(express.static(__dirname));
  // Add config route to expose client ID safely
  server.get('/config', (req, res) => {
    res.json({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
  });



  server.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Express server bound to http://127.0.0.1:${PORT}`);
    createWindow();
  });
  
};

let win;
let isFront = true;

const createWindow = () => {
    win = new BrowserWindow({
    icon: nativeImage.createThumbnailFromPath(path.join(__dirname, 'images/icon.png'), ({ width: 16, height: 16 })),
    x: 12,
    y: 50,
    width: 270,
    height: 270,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    hasShadow: false,
    transparent: true,
    moveable: true,
    //vibrancy: "fullscreen-ui",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  ipcMain.on('toggle-always-on-top', () => {
    if (win) {
      const isOnTop = win.isAlwaysOnTop();
      win.setAlwaysOnTop(!isOnTop);
      console.log("🔁 AlwaysOnTop toggled:", !isOnTop);
    }
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
};

app.whenReady().then(startServer).then(() => {
  globalShortcut.register('F3', () => {
    if(!win) return;
    if (!isFront) {
      //win.hide();
      //win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
      win.setAlwaysOnTop(true, 'screen-saver');
      win.show();
      win.focus();
      win.moveTop();
    }
    else{
      //win.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: false, skipTransformProcessType: true });
      win.setAlwaysOnTop(false);
      win.blur();
    }
    isFront = !isFront;
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
