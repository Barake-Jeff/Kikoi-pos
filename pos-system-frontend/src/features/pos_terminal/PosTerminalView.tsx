// src/features/pos_terminal/PosTerminalView.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Paper, Typography, TextField, Autocomplete, Button, Box, Stack } from '@mui/material';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import CartDisplay from './components/CartDisplay';
import PaymentModal from './components/PaymentModal';
// import type { FinalizePaymentPayload } from './components/PaymentModal';
import SaleCompleteDialog from './components/SaleCompleteDialog';
import HoldSaleDialog from './components/HoldSaleDialog';
import { useCartStore } from '../../state/cartSlice';
import { usePendingSalesStore } from '../../state/pendingSalesSlice';
import { useProductStore } from '../../state/productSlice';
import { useTransactionStore } from '../../state/transactionSlice';
import { createFilterOptions } from '@mui/material/Autocomplete';
// --- 1. FIX THE IMPORT for FilterOptionsState ---
// This is the correct import path for the type.
import type { FilterOptionsState } from '@mui/material';
import type { Product, CartItem, User, Payment, FinalizePaymentPayload } from '../../types';
import { useAuthStore } from '../../state/authSlice';

// This function is used in the JSX, so it is not unused.
const filterOptions = createFilterOptions<Product>();
const customFilterOptions = (options: Product[], state: FilterOptionsState<Product>): Product[] => {
  const filtered = filterOptions(options, state);
  return filtered.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const inputValue = state.inputValue.toLowerCase();
    const aStartsWith = aName.startsWith(inputValue);
    const bStartsWith = bName.startsWith(inputValue);
    if (aStartsWith && !bStartsWith) return -1;
    if (!bStartsWith && aStartsWith) return 1;
    return aName.localeCompare(bName);
  });
};

const PosTerminalView = () => {
  const { items, addItem, clearCart } = useCartStore();
  const { holdSale } = usePendingSalesStore();
  const { products, fetchProducts } = useProductStore();
  const { addCompletedTransaction } = useTransactionStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  // Use a ref to track the timer to prevent stale closures in the event listener
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isSaleCompleteDialogOpen, setSaleCompleteDialogOpen] = useState(false);
  const [isHoldSaleDialogOpen, setHoldSaleDialogOpen] = useState(false);
  
  // --- 2. FIX FOR 'ReceiptProps' MISMATCH ---
  // Initialize the state with all properties, using `null` to prevent 'undefined' errors.
  const [lastSaleData, setLastSaleData] = useState<{
    items: CartItem[], 
    total: number, 
    payments: Payment[], 
    transactionId: number | null, 
    servedBy: User | null,
    cashTendered: number,
    changeDue: number
  }>({
    items: [], total: 0, payments: [], transactionId: null, servedBy: null,
    cashTendered: 0, changeDue: 0
  });

  const [inputValue, setInputValue] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // All of these functions are now used in the JSX below, fixing the "unused" errors.
  const findAndAddProduct = React.useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      if (addItem(product)) {
        enqueueSnackbar(`${product.name} added to cart`, { variant: 'success' });
        return true;
      } else { 
        enqueueSnackbar(`Cannot add ${product.name}, insufficient stock.`, { variant: 'error' });
        return false;
      }
    } else {
      enqueueSnackbar(`Product with barcode '${barcode}' not found`, { variant: 'error' });
      return false;
    }
  }, [products, addItem, enqueueSnackbar]);

  // --- 3. THE GLOBAL KEYDOWN LISTENER EFFECT ---
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Ignore inputs if a modal is open or if the user is typing in a text field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (event.key === 'Enter') {
        if (barcodeBuffer.trim()) {
          findAndAddProduct(barcodeBuffer.trim());
          setBarcodeBuffer(''); // Clear buffer after processing
        }
      } else if (event.key.length === 1) { // Capture alphanumeric characters
        setBarcodeBuffer(prev => prev + event.key);
      }

      // Barcode scanners type very fast. We reset the buffer if there's a pause.
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      scanTimerRef.current = setTimeout(() => {
        setBarcodeBuffer('');
      }, 100); // Reset after 100ms of inactivity
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, [barcodeBuffer, products, addItem, findAndAddProduct]);

  const handleProductSelect = (_event: React.SyntheticEvent, product: Product | null) => {
    if (product) {
      if (addItem(product)) {
        setInputValue('');
      } else {
        enqueueSnackbar(`Cannot add ${product.name}, insufficient stock.`, { variant: 'error' });
      }
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      if (findAndAddProduct(inputValue.trim())) { 
        setInputValue(''); 
      }
    }
  };
  
  const handlePayment = () => {
    if (items.length > 0) {
      setPaymentModalOpen(true);
    } else {
      enqueueSnackbar('Cart is empty.', { variant: 'warning' });
    }
  };

  const handleConfirmPayment = async (payload: FinalizePaymentPayload) => {
    setPaymentModalOpen(false);
    try {
      const newTransactionResponse = await addCompletedTransaction(items, payload.payments);
      setLastSaleData({ 
        items, 
        total: subtotal, 
        payments: payload.payments,
        transactionId: newTransactionResponse.transactionId,
        servedBy: user
          ? {
              id: user.id,
              username: user.username,
              is_active: user.is_active ?? 1, // Default to active if missing
              role: (user.role as 'admin' | 'user' | 'intermediary'),
            }
          : null,
        cashTendered: payload.cashTendered,
        changeDue: payload.changeDue,
      });
      setSaleCompleteDialogOpen(true);
      setTimeout(() => fetchProducts(), 0);
    } catch (error) {
      let errorMessage = 'Transaction failed.';
      if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleNewSale = () => {
    setSaleCompleteDialogOpen(false);
    clearCart();
  };

  const handleOpenHoldSaleDialog = () => {
    if (items.length === 0) {
      enqueueSnackbar('Cart is empty.', { variant: 'warning' });
      return;
    }
    setHoldSaleDialogOpen(true);
  };

  const handleConfirmHoldSale = async (customerName: string) => {
    try {
        await holdSale(items, customerName);
        enqueueSnackbar(`Sale held for ${customerName}`, { variant: 'info' });
        setHoldSaleDialogOpen(false);
        clearCart();
    } catch (error) {
      console.error('Failed to hold sale:', error);
        enqueueSnackbar('Failed to hold sale.', { variant: 'error' });
    }
  };

  // --- 3. RESTORED JSX THAT USES ALL THE VARIABLES AND FUNCTIONS ---
  return (
    <>
      <PaymentModal open={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} onConfirm={handleConfirmPayment} totalAmount={subtotal} cartItems={items} />
      <SaleCompleteDialog open={isSaleCompleteDialogOpen} onClose={handleNewSale} receiptData={lastSaleData} />
      <HoldSaleDialog open={isHoldSaleDialogOpen} onClose={() => setHoldSaleDialogOpen(false)} onConfirm={handleConfirmHoldSale} />

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: '1 1 60%' }}><CartDisplay /></Box>
        <Box sx={{ flex: '1 1 40%' }}>
          <Stack spacing={3}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Add Product</Typography>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.name} - Ksh ${option.price.toFixed(2)}`}
                onChange={handleProductSelect}
                inputValue={inputValue}
                onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
                filterOptions={customFilterOptions}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {`${option.name} - Ksh ${option.price.toFixed(2)}`}
                  </li>
                )}
                renderInput={(params) => (<TextField {...params} label="Search or Scan Product" variant="outlined" onKeyDown={handleInputKeyDown} />)}
              />
            </Paper>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Payment</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                <Button variant="contained" color="success" size="large" sx={{ py: 2 }} onClick={handlePayment}>
                  PROCEED TO PAYMENT
                </Button>
                <Button variant="outlined" color="warning" onClick={handleOpenHoldSaleDialog}>Hold Sale (Credit)</Button>
                <Button variant="outlined" color="error" onClick={clearCart}>Clear Sale</Button>
              </Box>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </>
  );
};

export default PosTerminalView;