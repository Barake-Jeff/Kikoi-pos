// src/types/index.ts
import type { ChartData } from "chart.js";
// No "Raw" types are needed for transactions anymore, simplifying the file.

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock: number;
  is_bundle: 0 | 1;
  base_product_id: string | null;
  bundle_quantity: number | null;
  effective_stock: number | null;
  is_active?: 0 | 1;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: number;
  username: string;
  is_active: 0 | 1;
  role: 'admin' | 'user' | 'intermediary';
}

export type PaymentMethod = 'cash' | 'mpesa' | 'card';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface FinalizePaymentPayload {
  payments: Payment[];
  cashTendered: number;
  changeDue: number;
}

export interface ReportData {
  totalSales: number;
  totalProfit: number;
  transactionCount: number;
  topProducts: { name: string; quantity: number; }[];
  chartData: ChartData<'bar', number[]>; 
  salesByMethod: {
    cash: number;
    mpesa: number;
    card: number;
  };
}

export interface RawProductFromAPI {
  id: string | number;
  name: string;
  barcode: string | null;
  price: string | number;
  costPrice: string | number;
  stock: string | number;
  is_bundle?: 0 | 1;
  base_product_id?: string | null | number;
  bundle_quantity?: string | number | null;
  effective_stock?: string | number | null;
  created_at?: string;
  updated_at?: string;
  is_active?: 0 | 1;
}

// This is the clean, grouped transaction object our app will receive and use.
export interface Transaction {
  id: number;
  items: CartItem[];
  total: number;
  profit: number;
  payments: Payment[];
  status: 'completed' | 'pending' | 'cancelled';
  timestamp: string | Date; // API sends string, slice converts to Date
  customerName?: string | null;
  servedBy?: User | null;
}