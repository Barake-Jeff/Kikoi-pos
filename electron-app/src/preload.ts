import { contextBridge, ipcRenderer } from 'electron';

// This is the API that will be exposed to your React app
// on the `window.electronAPI` object.
export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
  printReceipt: (receiptData: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  listPrinters: () => Promise<any[]>;
  previewReceipt: (receiptData: any) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const electronAPI: IElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
  listPrinters: () => ipcRenderer.invoke('list-printers'),
  previewReceipt: (receiptData) => ipcRenderer.invoke('preview-receipt', receiptData),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);