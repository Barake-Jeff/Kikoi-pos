// src/state/transactionSlice.ts

import { create } from 'zustand';
import type { Transaction, CartItem, Payment } from '../types';
import { createTransaction as createTransactionApi, getTransactions, cancelTransaction as cancelTransactionApi } from '../api/transactionApi';

interface CreateTransactionResponse {
  message: string;
  transactionId: number;
}

interface TransactionState {
  completedTransactions: Transaction[];
  isLoading: boolean;
  fetchCompletedTransactions: () => Promise<void>;
  addCompletedTransaction: (items: CartItem[], payments: Payment[]) => Promise<CreateTransactionResponse>;
  cancelTransaction: (transactionId: string | number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  completedTransactions: [],
  isLoading: false,
  fetchCompletedTransactions: async () => {
    set({ isLoading: true });
    try {
      // getTransactions now returns a clean Transaction[] array from the API
      const transactionsFromApi = await getTransactions();
      
      // We just need to convert the timestamp string to a Date object
      const transactionsWithDateObjects = transactionsFromApi.map(tx => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }));
      
      set({ completedTransactions: transactionsWithDateObjects, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch transactions", error);
      set({ isLoading: false });
    }
  },
  addCompletedTransaction: async (items, payments) => {
    try {
      const response = await createTransactionApi({ items, payments });
      get().fetchCompletedTransactions(); // Refetch to get the latest list
      return response;
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  },
  cancelTransaction: async (transactionId) => {
    try {
      await cancelTransactionApi(transactionId);
      // Optimistically update the status in the local state
      set(state => ({
        completedTransactions: state.completedTransactions.map(tx =>
          String(tx.id) === String(transactionId) ? { ...tx, status: 'cancelled' } : tx
        )
      }));
    } catch (error) {
      console.error(`Failed to cancel transaction ${transactionId}:`, error);
      throw error;
    }
  },
}));