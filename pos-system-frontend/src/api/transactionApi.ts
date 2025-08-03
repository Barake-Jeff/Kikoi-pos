import apiClient from './apiClient';
import type { CartItem, Transaction, Payment } from '../types';

interface CreateTransactionPayload {
  items: CartItem[];
  payments: Payment[];
}
interface CreateTransactionResponse {
  message: string;
  transactionId: number;
}

interface CancelTransactionResponse {
  message: string;
}

export const createTransaction = async (payload: CreateTransactionPayload): Promise<CreateTransactionResponse> => {
  const response = await apiClient.post<CreateTransactionResponse>('/transactions', payload);
  return response.data;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await apiClient.get<Transaction[]>('/transactions');
  return response.data;
};

export const cancelTransaction = async (transactionId: string | number): Promise<CancelTransactionResponse> => {
  // We use a PUT request to the specific '/cancel' endpoint for this transaction.
  // We don't need to send any data in the body for this request.
  const response = await apiClient.put<CancelTransactionResponse>(`/transactions/${transactionId}/cancel`);
  
  // Return the response data, which should be { message: '...' }
  return response.data;
};
