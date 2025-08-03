// src/api/pendingSalesApi.ts
import apiClient from './apiClient';
import type { Transaction, CartItem } from '../types';

// The data we send to the backend to hold a sale
interface HoldSalePayload {
  items: CartItem[];
  customerName: string;
}

// The expected success response from the backend
interface HoldSaleResponse {
    message: string;
    transactionId: number;
}
interface DeletePendingResponse {
    message: string;
}

// POST /api/transactions/hold
export const holdSale = async (payload: HoldSalePayload): Promise<HoldSaleResponse> => {
  const response = await apiClient.post<HoldSaleResponse>('/transactions/hold', payload);
  return response.data;
};

// GET /api/transactions/pending
export const getPending = async (): Promise<Transaction[]> => {
  const response = await apiClient.get<Transaction[]>('/transactions/pending');
  return response.data;
};

// DELETE /api/transactions/pending/:id
export const deletePending = async (transactionId: string): Promise<DeletePendingResponse> => {
  const response = await apiClient.delete<DeletePendingResponse>(`/transactions/pending/${transactionId}`);
  return response.data;
};