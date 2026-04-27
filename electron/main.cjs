'use strict';
/**
 * electron/main.cjs — Archon Desktop
 *
 * Electron main-process entry point.
 * Uses .cjs extension so it runs as CommonJS even though the project
 * has "type": "module" in package.json.
 *
 * Load strategy: file:// against the compiled Vite dist/.
 * Vite must be built with base: './' for relative asset paths to resolve.
 */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const IS_DEV    = process.env.NODE_ENV === 'development';
const DIST_ROOT = path.join(__dirname, '..', 'dist');
const INDEX     = path.join(DIST_ROOT, 'index.html');

// ─── Window factory ──────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    title:           'Archon',
    backgroundColor: '#0a0a12',   // matches the game's dark background — no white flash
    show:            false,        // reveal only once content is ready
    autoHideMenuBar: true,         // hide menu bar (Alt to reveal in dev)
    icon:            path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration:     false,  // security: no Node in renderer
      contextIsolation:    true,   // security: isolated context
      devTools:            IS_DEV, // DevTools only in dev mode
    },
  });

  // Hide the menu bar entirely in production
  if (!IS_DEV) {
    Menu.setApplicationMenu(null);
  }

  // Load the built Vite app from disk
  if (IS_DEV) {
    // Dev: load from Vite dev server if running, else from dist
    win.loadFile(INDEX);
  } else {
    win.loadFile(INDEX);
  }

  // Show window once DOM is ready — prevents white-flash on load
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Open external links in the system browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows / Linux: quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
