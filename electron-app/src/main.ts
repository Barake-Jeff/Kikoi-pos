import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { join } from 'path';
import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as fs from 'fs';

// --- Global Variables and Constants ---
const backendStatus = new EventEmitter();
let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 3100;
let backendStartAttempts = 0;
const MAX_BACKEND_ATTEMPTS = 3;
const BACKEND_PING_INTERVAL = 1000; // Check every 1 second
const BACKEND_PING_TIMEOUT = 30000; // 30 seconds total
let backendReadyFlag = false;

// --- Backend Startup Logic ---
function startBackend() {
    try {
        if (backendProcess && !backendProcess.killed) {
            console.log('[Electron Main] Backend is already running.');
            return;
        }

        if (backendStartAttempts >= MAX_BACKEND_ATTEMPTS) {
            console.error(`[Electron Main] Max backend start attempts (${MAX_BACKEND_ATTEMPTS}) reached. Quitting.`);
            dialog.showErrorBox('Backend Startup Failed', `The backend server could not be started after ${MAX_BACKEND_ATTEMPTS} attempts. Please check logs. The application will now close.`);
            app.quit();
            return;
        }
        backendStartAttempts++;
        console.log(`[Electron Main] Attempting to start backend (Attempt ${backendStartAttempts}/${MAX_BACKEND_ATTEMPTS}).`);

        const backendEntryPoint = 'dist/index.js';
        let backendPath: string;
        let backendCwd: string;

        // CORRECTED: Simplified and robust path handling
        if (app.isPackaged) {
            // In production, the backend is an "extraResource"
            backendCwd = join(process.resourcesPath, 'backend');
            backendPath = join(backendCwd, backendEntryPoint);
        } else {
            // In development, we point to the sibling backend project folder
            backendCwd = join(__dirname, '..', '..', 'pos-system-backend');
            backendPath = join(backendCwd, backendEntryPoint);
        }

        console.log(`[Electron Main] Backend CWD: ${backendCwd}`);
        console.log(`[Electron Main] Backend Entry Point: ${backendPath}`);

        if (!fs.existsSync(backendPath)) {
            throw new Error(`Backend entry point not found at: ${backendPath}. Make sure the backend is built.`);
        }

        // CORRECTED: Using `fork` is the ideal way to run a Node.js script.
        // It uses the same Node version as Electron and is more efficient.
        backendProcess = fork(backendPath, [], {
            cwd: backendCwd, // Set the working directory for the backend
            silent: false,   // Pipe backend's console output to Electron's console
            env: {
                ...process.env,
                PORT: String(BACKEND_PORT), // Ensure backend uses the correct port
            },
        });

        backendProcess.on('error', (err) => {
            throw new Error(`Failed to start backend process: ${err.message}`);
        });

        backendProcess.on('exit', (code) => {
            console.log(`[Electron Main] Backend process exited with code: ${code}`);
            backendProcess = null;
            // If the backend dies before it was ready, the ping timeout will eventually
            // trigger a retry or quit the app. This prevents a retry loop if the
            // backend is configured correctly but fails for an external reason (e.g., database offline).
            if (code !== 0 && !backendReadyFlag) {
                console.error('[Electron Main] Backend exited prematurely.');
            }
        });

        // Start pinging to check for readiness
        pingBackend();

    } catch (error: any) {
        console.error('[Electron Main] FATAL ERROR in startBackend:', error);
        dialog.showErrorBox('Backend Critical Error', `A fatal error occurred while trying to start the backend: ${error.message}`);
        app.quit();
    }
}

// --- Backend Readiness Ping Logic ---
function pingBackend() {
    let pingAttempts = 0;
    const maxPings = BACKEND_PING_TIMEOUT / BACKEND_PING_INTERVAL;

    const performPing = () => {
        if (backendReadyFlag || !backendProcess) return; // Stop if ready or process is gone

        if (pingAttempts >= maxPings) {
            console.error('[Electron Main] Backend did not respond within the timeout period.');
            dialog.showErrorBox('Backend Timeout', `The backend server did not respond within ${BACKEND_PING_TIMEOUT / 1000} seconds.`);
            if (backendProcess && !backendProcess.killed) backendProcess.kill();
            startBackend(); // Trigger a retry
            return;
        }

        pingAttempts++;
        const req = http.get(`http://localhost:${BACKEND_PORT}/`, (res) => {
            if (res.statusCode === 200) {
                console.log('[Electron Main] Backend is ready!');
                backendReadyFlag = true;
                backendStatus.emit('ready');
            } else {
                setTimeout(performPing, BACKEND_PING_INTERVAL);
            }
        });

        req.on('error', () => {
            setTimeout(performPing, BACKEND_PING_INTERVAL);
        });
        req.end();
    };

    setTimeout(performPing, BACKEND_PING_INTERVAL);
}

// --- Main Window Creation Logic ---
function createWindow() {
    // Your createWindow logic was already excellent, no changes needed here.
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load the frontend
    const frontendUrl = app.isPackaged
      ? `file://${join(app.getAppPath(), 'frontend', 'index.html')}`
      : 'http://localhost:5173';

    console.log(`[Electron Main] Loading frontend from: ${frontendUrl}`);
    mainWindow.loadURL(frontendUrl).catch(err => {
        console.error('[Electron Main] Failed to load frontend:', err);
        dialog.showErrorBox('Frontend Load Error', `Could not load the application UI. Please check if the frontend is running or built correctly. Error: ${err.message}`);
    });
    
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        console.log('[Electron Main] Main window closed.');
        mainWindow = null;
    });

    // Optional: Use a minimal menu in production
    if (app.isPackaged) {
        Menu.setApplicationMenu(null);
    }
}

// --- App Lifecycle Events ---
app.on('ready', () => {
    console.log('[Electron Main] App is ready.');
    backendStartAttempts = 0;
    backendReadyFlag = false;
    startBackend();

    backendStatus.on('ready', () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
        }
    ipcMain.handle('get-app-version', () => {
            return app.getVersion();
    })
    });
});

app.on('before-quit', () => {
    console.log('[Electron Main] Before quit: Terminating backend process.');
    if (backendProcess && !backendProcess.killed) {
        console.log('[Electron Main] Sending kill signal to backend.');
        const killed = backendProcess.kill();
        console.log(`[Electron Main] Backend process termination signal sent. Success: ${killed}`);
    }
});

app.on('window-all-closed', () => {
    console.log('[Electron Main] All windows closed.');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        // If backend is ready, create window. Otherwise, starting the backend
        // will eventually emit 'ready' and create it.
        if (backendReadyFlag) {
            createWindow();
        }
    }
});