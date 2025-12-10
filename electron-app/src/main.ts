import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { join } from 'path';
import { fork, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as fs from 'fs';
import { PosPrinter, PosPrintData, PosPrintOptions } from 'electron-pos-printer';

// --- Global Variables and Constants ---
const backendStatus = new EventEmitter();
let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 3000;
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

// --- Receipt Printing Handler ---
function formatReceiptData(receiptData: any): PosPrintData[] {
    const printData: PosPrintData[] = [
        {
            type: 'text',
            value: 'Celeb Shop',
            style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' }
        },
        {
            type: 'text',
            value: 'The Altitude, Taurus',
            style: { fontSize: '10px', textAlign: 'center' }
        },
        {
            type: 'text',
            value: `Date: ${new Date().toLocaleString()}`,
            style: { fontSize: '8px', textAlign: 'center' }
        }
    ];

    if (receiptData.transactionId) {
        printData.push({
            type: 'text',
            value: `Receipt No: ${receiptData.transactionId}`,
            style: { fontSize: '8px', textAlign: 'center' }
        });
    }

    if (receiptData.servedBy) {
        printData.push({
            type: 'text',
            value: `Served by: ${receiptData.servedBy.username || 'Staff'}`,
            style: { fontSize: '8px', textAlign: 'center' }
        });
    }

    // Divider
    printData.push({
        type: 'text',
        value: '================================',
        style: { fontSize: '8px', textAlign: 'center' }
    });

    // Items table (and plain-text fallback rows)
    const tableBody = receiptData.items.map((item: any) => [
        item.name.substring(0, 15),
        item.quantity.toString(),
        `Ksh ${item.price.toFixed(2)}`,
        `Ksh ${(item.quantity * item.price).toFixed(2)}`
    ]);

    printData.push({
        type: 'table',
        style: { fontSize: '8px', border: '1px solid #000' },
        tableHeader: ['Item', 'Qty', 'Price', 'Total'],
        tableBody,
        tableHeaderStyle: { backgroundColor: '#000', color: 'white', fontWeight: 'bold' },
        tableBodyStyle: { border: '0.5px solid #000' }
    });

    // Also add plain text lines for each item as a fallback (some preview renderers drop table content)
    tableBody.forEach((row: string[]) => {
        const [name, qty, price, total] = row;
        printData.push({
            type: 'text',
            value: `${name}  ${qty} x ${price} = ${total}`,
            style: { fontSize: '8px' }
        });
    });

    // Divider
    printData.push({
        type: 'text',
        value: '================================',
        style: { fontSize: '8px', textAlign: 'center' }
    });

    // Totals
    printData.push({
        type: 'text',
        value: `TOTAL: Ksh ${receiptData.total.toFixed(2)}`,
        style: { fontWeight: 'bold', fontSize: '12px', textAlign: 'right' }
    });

    // Payments
    if (receiptData.payments && receiptData.payments.length > 0) {
        printData.push({
            type: 'text',
            value: '',
            style: {}
        });
        receiptData.payments.forEach((payment: any) => {
            printData.push({
                type: 'text',
                value: `Paid via ${payment.method.toUpperCase()}: Ksh ${payment.amount.toFixed(2)}`,
                style: { fontSize: '8px' }
            });
        });
    }

    // Balance due to customer
    if (receiptData.balanceDue && receiptData.balanceDue > 0) {
        printData.push({
            type: 'text',
            value: '',
            style: {}
        });
        printData.push({
            type: 'text',
            value: `BALANCE DUE: Ksh ${receiptData.balanceDue.toFixed(2)}`,
            style: { fontWeight: 'bold', fontSize: '10px', textAlign: 'right', color: 'green' }
        });
    }

    // Footer
    printData.push({
        type: 'text',
        value: '',
        style: {}
    });
    printData.push({
        type: 'text',
        value: 'Thank you for your purchase!',
        style: { textAlign: 'center', fontSize: '8px', marginTop: '10px' }
    });

    return printData;
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
    });
    
    // IPC handler for printing receipts to thermal printer
    ipcMain.handle('print-receipt', async (event, receiptData) => {
        try {
            console.log('[Electron Main] Print request received for receipt:', receiptData?.transactionId);
            console.log('[Electron Main] payload keys:', receiptData ? Object.keys(receiptData) : 'NO_PAYLOAD');
            console.log('[Electron Main] items length:', receiptData?.items?.length ?? 0);

            if (!receiptData?.items || receiptData.items.length === 0) {
                console.warn('[Electron Main] No items to print — aborting');
                return { success: false, error: 'No items in receiptData' };
            }

            const printData = formatReceiptData(receiptData);
            console.log('[Electron Main] formatted printData length:', printData.length);
            console.log('[Electron Main] sample printData entries:', JSON.stringify(printData.slice(0,3)));

            const options = {
                preview: false, // disable preview for testing
                margin: '0 0 0 0',
                copies: 1,
                name: 'Kikoi POS Receipt',
                pageSize: '80mm',
                timeOutPerLine: 400,
                silent: true,
            };

            await PosPrinter.print(printData, options as any);
            console.log('[Electron Main] Receipt printed successfully');
            return { success: true, message: 'Receipt sent to printer' };
        } catch (error: any) {
            console.error('[Electron Main] Print error:', error);
            return { success: false, error: error.message || 'Unknown error occurred' };
        }
    });
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