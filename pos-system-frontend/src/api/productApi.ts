import apiClient from './apiClient';
import type { Product } from '../types';

interface SuccessResponse { message: string; }
// interface CreateProductResponse extends SuccessResponse { productId: number; }

export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>('/products');
  return response.data;
};

export const createProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
  const response = await apiClient.post<Product>('/products', productData);
  return response.data; // response.data is now known to be a Product
};

export const updateProduct = async (id: string, productData: Product): Promise<Product> => {
  const response = await apiClient.put<Product>(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (productId: string): Promise<SuccessResponse> => {
  const response = await apiClient.delete<SuccessResponse>(`/products/${productId}`);
  return response.data;
};