// src/state/pendingSalesSlice.ts
import { create } from 'zustand';
import type { Transaction, CartItem } from '../types';
import { holdSale as holdSaleApi, getPending, deletePending } from '../api/pendingSalesApi';

interface PendingSalesState {
  pendingSales: Transaction[];
  isLoading: boolean;
  fetchPendingSales: () => Promise<void>;
  holdSale: (items: CartItem[], customerName: string) => Promise<unknown>;
  removePendingSale: (transactionId: string) => Promise<unknown>;
}

export const usePendingSalesStore = create<PendingSalesState>((set, get) => ({
  pendingSales: [],
  isLoading: false,

  fetchPendingSales: async () => {
    set({ isLoading: true });
    try {
      const sales = await getPending();
      // Ensure timestamps from the API (which are strings) are converted to Date objects
      set({ 
        pendingSales: sales.map(s => ({...s, timestamp: new Date(s.timestamp)})), 
        isLoading: false 
      });
    } catch (error) {
      console.error("Failed to fetch pending sales", error);
      set({ isLoading: false });
    }
  },

  holdSale: async (items, customerName) => {
    const response = await holdSaleApi({ items, customerName });
    get().fetchPendingSales(); // Refresh the list from the API after holding a sale
    return response;
  },

  removePendingSale: async (transactionId) => {
    const response = await deletePending(transactionId);
    // After recalling/deleting a sale, we also refresh the list from the API
    get().fetchPendingSales(); 
    return response;
  },
}));