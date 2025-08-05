import { contextBridge, ipcRenderer } from 'electron';

// This is the API that will be exposed to your React app
// on the `window.electronAPI` object.
export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
  // You can add other functions here as you need them
  // e.g., showSaveDialog: (options) => Promise<string | undefined>
}

const electronAPI: IElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);