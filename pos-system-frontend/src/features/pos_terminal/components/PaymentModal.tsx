// src/features/pos_terminal/components/PaymentModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Modal, Box, Typography, Button, Stack, TextField, List, ListItem, ListItemText,
  IconButton, Divider, ButtonGroup
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { PaymentMethod, CartItem, Payment, FinalizePaymentPayload } from '../../../types';
import { useSnackbar } from 'notistack';

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: FinalizePaymentPayload) => void;
  totalAmount: number;
  cartItems: CartItem[];
}

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
} as const;

const PaymentModal = ({ open, onClose, onConfirm, totalAmount }: PaymentModalProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [paymentInput, setPaymentInput] = useState('');
  const [finalCashTendered, setFinalCashTendered] = useState(0);

  // --- START OF LOGIC CHANGES ---

  // 1. This calculates the amount APPLIED to the bill. This remains the same.
  const totalApplied = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = totalAmount - totalApplied;

  // 2. NEW: Calculate the TOTAL money received for DISPLAY purposes.
  // It's the sum of non-cash payments plus the full cash amount tendered by the customer.
  const displayTotalPaid = payments
    .filter(p => p.method !== 'cash')
    .reduce((acc, p) => acc + p.amount, 0) + finalCashTendered;

  // 3. NEW: Calculate the final CHANGE DUE for DISPLAY purposes.
  const displayChangeDue = Math.max(0, displayTotalPaid - totalAmount);

  // --- END OF LOGIC CHANGES ---

  useEffect(() => {
    if (open) {
      setPayments([]);
      setSelectedMethod('cash');
      setPaymentInput('');
      setFinalCashTendered(0);
    }
  }, [open, totalAmount]);

  const handleAddPayment = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const enteredAmount = parseFloat(paymentInput) || 0;
    
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      enqueueSnackbar('Please enter a valid amount.', { variant: 'warning' });
      return;
    }
    
    if (selectedMethod === 'cash') {
      const amountToApply = Math.min(enteredAmount, remainingBalance);
      setPayments(prev => [...prev, { method: 'cash', amount: amountToApply }]);
      setFinalCashTendered(enteredAmount);
    } else {
      if (enteredAmount > remainingBalance + 0.01) {
        enqueueSnackbar('Amount cannot be greater than the remaining balance for this method.', { variant: 'warning' });
        return;
      }
      setPayments(prev => [...prev, { method: selectedMethod, amount: enteredAmount }]);
    }

    setPaymentInput('');
  };

  const handleRemovePayment = (index: number) => {
    if (payments[index].method === 'cash') {
      setFinalCashTendered(0);
    }
    setPayments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFinalize = () => {
    if (Math.abs(remainingBalance) > 0.01) {
      enqueueSnackbar('The remaining balance must be zero to finalize the sale.', { variant: 'error' });
      return;
    }
    onConfirm({
      payments,
      cashTendered: finalCashTendered,
      changeDue: displayChangeDue, // Pass the correct final change
    });
  };
  
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method !== 'cash') {
      setPaymentInput(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
    } else {
      setPaymentInput('');
    }
  };


  return (
    <Modal open={open} onClose={onClose} aria-labelledby="payment-modal-title">
      <Box sx={style}>
        <Typography id="payment-modal-title" variant="h5" component="h2" align="center" gutterBottom>
          Process Payment
        </Typography>

        <Stack spacing={1} sx={{ my: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total Due:</Typography>
            <Typography variant="h6">Ksh {totalAmount.toFixed(2)}</Typography>
          </Box>
          {/* UPDATED: Use displayTotalPaid here */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
            <Typography variant="h6">Total Paid:</Typography>
            <Typography variant="h6">Ksh {displayTotalPaid.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main', fontWeight: 'bold' }}>
            <Typography variant="h6">Remaining:</Typography>
            <Typography variant="h6">Ksh {remainingBalance.toFixed(2)}</Typography>
          </Box>

          {/* NEW: Conditionally rendered Change Due section */}
          {displayChangeDue > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'info.main', fontWeight: 'bold' }}>
              <Typography variant="h6">Change Due:</Typography>
              <Typography variant="h6">Ksh {displayChangeDue.toFixed(2)}</Typography>
            </Box>
          )}
        </Stack>
        <Divider sx={{ my: 2 }} />

        {remainingBalance > 0.01 && (
          <>
            <TextField
              label={selectedMethod === 'cash' ? 'Cash Tendered' : 'Amount to Pay'}
              type="number"
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              fullWidth
              autoFocus
            />
            
            <ButtonGroup fullWidth variant="outlined" sx={{ my: 2 }}>
              <Button onClick={() => handleMethodSelect('cash')} variant={selectedMethod === 'cash' ? 'contained' : 'outlined'}>Cash</Button>
              <Button onClick={() => handleMethodSelect('mpesa')} variant={selectedMethod === 'mpesa' ? 'contained' : 'outlined'}>M-Pesa</Button>
              <Button onClick={() => handleMethodSelect('card')} variant={selectedMethod === 'card' ? 'contained' : 'outlined'}>Card</Button>
            </ButtonGroup>

            <Button fullWidth variant="contained" onClick={handleAddPayment} disabled={!paymentInput} type="button">
              Add Payment
            </Button>
          </>
        )}
        
        {payments.length > 0 && (
          <List dense sx={{ maxHeight: 150, overflow: 'auto', my: 2 }}>
            {payments.map((p, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleRemovePayment(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={p.method.toUpperCase()} secondary={`Ksh ${p.amount.toFixed(2)}`} />
              </ListItem>
            ))}
          </List>
        )}
        
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button variant="outlined" color="error" fullWidth onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            fullWidth 
            onClick={handleFinalize}
            disabled={Math.abs(remainingBalance) > 0.01}
          >
            Finalize Sale
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default PaymentModal;