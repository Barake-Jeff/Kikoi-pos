// src/state/cartSlice.ts (The complete, corrected version)

import { create } from 'zustand';
import type { Product, CartItem } from '../types';
import { useProductStore } from './productSlice';

interface CartState {
  items: CartItem[];
  addItem: (productToAdd: Product) => boolean;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => boolean; // Now returns boolean
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

// --- HELPER FUNCTION: The single source of truth for stock checks ---
const canAffordStock = (
  product: Product, // The product being added or updated
  newQuantity: number, // The new TOTAL quantity for this item in the cart
  currentCart: CartItem[]
): boolean => {
  const allProducts = useProductStore.getState().products;

  // --- THE CORE FIX IS HERE: Explicitly check `=== 1` ---
  const isBundle = product.is_bundle === 1;

  // 1. Identify the base product and its available stock
  const baseProduct = isBundle
    ? allProducts.find(p => p.id === product.base_product_id)
    : product;

  if (!baseProduct) {
    console.error(`CRITICAL: Base product not found for bundle: ${product.name}`);
    return false;
  }
  // We ALWAYS check against the base product's real stock
  const availableStock = baseProduct.stock;

  // 2. Calculate the total demand from OTHER items in the cart
  const demandFromOtherItems = currentCart.reduce((total, item) => {
    // Exclude the item we are currently checking
    if (item.id === product.id) return total;

    // Check other items based on the same base product ID
    if (item.id === baseProduct.id) return total + item.quantity;
    if (item.is_bundle === 1 && item.base_product_id === baseProduct.id) {
      return total + (item.bundle_quantity || 0) * item.quantity;
    }
    return total;
  }, 0);
  
  // 3. Calculate the demand for the item we are trying to add/update
  const demandFromThisItem = isBundle
    ? (product.bundle_quantity || 1) * newQuantity
    : newQuantity;

  // 4. The Final Check with Debugging Logs
  const totalDemand = demandFromOtherItems + demandFromThisItem;
  const canAfford = totalDemand <= availableStock;

  console.log(`--- Stock Check for: ${product.name} (Qty: ${newQuantity}) ---`);
  console.log(`Base Product: ${baseProduct.name}, Available Stock: ${availableStock}`);
  console.log(`Is this a bundle? ${isBundle}`);
  console.log(`Demand from this item (in base units): ${demandFromThisItem}`);
  console.log(`Demand from OTHER cart items (in base units): ${demandFromOtherItems}`);
  console.log(`Total Projected Demand: ${totalDemand}`);
  console.log(`Can afford? ${canAfford}`);
  console.log('------------------------------------');

  return canAfford;
};


export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  // --- REWRITTEN addItem ---
  addItem: (productToAdd: Product) => {
    const existingItem = get().items.find((item) => item.id === productToAdd.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + 1;

    // Use our new central stock checker
    if (!canAffordStock(productToAdd, newQuantity, get().items)) {
      return false; // Signal failure
    }

    if (existingItem) {
      set(state => ({
        items: state.items.map(item =>
          item.id === productToAdd.id ? { ...item, quantity: newQuantity } : item
        ),
      }));
    } else {
      set(state => ({ items: [...state.items, { ...productToAdd, quantity: 1 }] }));
    }
    return true; // Signal success
  },
  
// --- REWRITTEN updateQuantity ---
updateQuantity: (productId: string, newQuantity: number) => {
  let success = false;
  set(state => {
    const updatedItems = state.items.map(item =>
      item.id === productId ? { ...item, quantity: Math.max(0, newQuantity) } : item
    ).filter(item => item.quantity > 0);

    const itemToUpdate = updatedItems.find(item => item.id === productId);
    if (itemToUpdate && !canAffordStock(itemToUpdate, itemToUpdate.quantity, updatedItems)) {
      console.warn(`Stock check failed for ${itemToUpdate.name} on quantity update.`);
      success = false;
      return { items: state.items };
    }

    success = true;
    return { items: updatedItems };
  });
  return success;
},

  // --- No changes needed for removeItem and clearCart ---
  removeItem: (productId: string) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    })),
  
  clearCart: () => set({ items: [] }),

  setCart: (items: CartItem[]) => set({ items }),
}));