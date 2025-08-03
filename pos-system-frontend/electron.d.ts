// This file makes TypeScript aware of the `electronAPI` object
// that you exposed in your preload script.

import { IElectronAPI } from '../electron-app/src/preload';

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}