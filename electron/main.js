/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = 3745; // fixed port for the desktop app

function waitForServer(url, callback, maxRetries = 60) {
  let retries = 0;
  const check = () => {
    http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 307) {
        callback();
      } else {
        retry();
      }
    }).on('error', () => retry());
  };
  const retry = () => {
    retries++;
    if (retries >= maxRetries) {
      console.log('[Electron] Server did not start in time, loading anyway...');
      callback();
      return;
    }
    setTimeout(check, 500);
  };
  check();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 375,
    minHeight: 600,
    backgroundColor: '#faf9fb',
    title: 'LearnX AI',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    icon: path.join(__dirname, '..', 'public', 'icon-512.png'),
  });

  // Load the app
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window once it's ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  let serverPath;

  if (app.isPackaged) {
    // In production: use the bundled standalone server
    serverPath = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
  } else {
    // In development: use the local standalone server
    serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  }

  console.log('[Electron] Starting server from:', serverPath);

  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    DATABASE_URL: `file:${path.join(app.getPath('userData'), 'learnx.db')}`,
  };

  serverProcess = spawn(process.execPath.includes('electron') ? 'node' : process.execPath, [serverPath], {
    env,
    cwd: path.dirname(serverPath),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    console.log('[Server]', data.toString().trim());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('[Server Error]', data.toString().trim());
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Failed to start server:', err);
  });
}

app.whenReady().then(() => {
  startServer();

  waitForServer(`http://localhost:${PORT}/api/subjects`, () => {
    console.log('[Electron] Server is ready, creating window...');
    createWindow();
  });
});

// Quit when all windows are closed (except on Mac)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up the server process when the app quits
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});

// Ensure server is killed if app crashes
process.on('exit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGKILL');
  }
});
