// src/state/productSlice.ts

import { create } from 'zustand';
import type { Product, RawProductFromAPI } from '../types';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/productApi';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (updatedProduct: Product) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
}

// Helper function to sanitize raw product data into the clean Product type
const sanitizeProduct = (rawProduct: RawProductFromAPI): Product => {
  return {
    ...rawProduct,
    id: String(rawProduct.id),
    price: parseFloat(String(rawProduct.price || 0)),
    costPrice: parseFloat(String(rawProduct.costPrice || 0)),
    stock: parseInt(String(rawProduct.stock || 0), 10),
    is_active: rawProduct.is_active === 0 ? 0 : 1,
    is_bundle: rawProduct.is_bundle === 1 ? 1 : 0,
    base_product_id: rawProduct.base_product_id ? String(rawProduct.base_product_id) : null,
    bundle_quantity: rawProduct.bundle_quantity ? parseInt(String(rawProduct.bundle_quantity), 10) : null,
    effective_stock: rawProduct.effective_stock ? parseInt(String(rawProduct.effective_stock), 10) : null,
  };
};

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const rawProducts: RawProductFromAPI[] = await getProducts();
      const sanitizedProducts = rawProducts.map(sanitizeProduct);
      set({ products: sanitizedProducts, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      set({ error: 'Failed to fetch products', isLoading: false });
    }
  },
  
  addProduct: async (productData) => {
    const newRawProduct = await createProduct(productData);
    const newProduct = sanitizeProduct(newRawProduct);
    set(state => ({
      products: [...state.products, newProduct].sort((a, b) => a.name.localeCompare(b.name))
    }));
    return newProduct;
  },
  
  updateProduct: async (productToUpdate) => {
    const updatedRawProduct = await updateProduct(productToUpdate.id, productToUpdate);
    const updatedProduct = sanitizeProduct(updatedRawProduct);
    set(state => ({
      products: state.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
    return updatedProduct;
  },
  
  deleteProduct: async (productId: string) => {
    await deleteProduct(productId);
    set(state => ({
      products: state.products.filter(p => String(p.id) !== String(productId))
    }));
  },
}));