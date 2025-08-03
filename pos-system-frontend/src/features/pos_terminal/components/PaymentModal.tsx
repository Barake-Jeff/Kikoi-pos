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
  const [currentAmount, setCurrentAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = totalAmount - totalPaid;

  const changeDue = (selectedMethod === 'cash' && parseFloat(cashTendered) > remainingBalance)
    ? parseFloat(cashTendered) - remainingBalance
    : 0;

  useEffect(() => {
    if (open) {
      setPayments([]);
      setCurrentAmount(totalAmount.toFixed(2));
      setSelectedMethod('cash');
      setCashTendered('');
    }
  }, [open, totalAmount]);

  const handleAddPayment = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    let amountToAdd = parseFloat(currentAmount);

    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      enqueueSnackbar('Please enter a valid amount.', { variant: 'warning' });
      return;
    }
    
    if (amountToAdd > remainingBalance + 0.01) {
      enqueueSnackbar('Amount cannot be greater than the remaining balance.', { variant: 'warning' });
      return;
    }

    if (selectedMethod === 'cash' && changeDue > 0) {
      amountToAdd = remainingBalance;
    }

    setPayments(prev => [...prev, { method: selectedMethod, amount: amountToAdd }]);
    setCurrentAmount('');
    setCashTendered('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFinalize = () => {
    if (Math.abs(remainingBalance) > 0.01) {
      enqueueSnackbar('The remaining balance must be zero to finalize the sale.', { variant: 'error' });
      return;
    }
    onConfirm({
      payments,
      cashTendered: parseFloat(cashTendered) || 0,
      changeDue,
    });
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
            <Typography>Total Paid:</Typography>
            <Typography>Ksh {totalPaid.toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main', fontWeight: 'bold' }}>
            <Typography variant="h6">Remaining:</Typography>
            <Typography variant="h6">Ksh {remainingBalance.toFixed(2)}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />

        {remainingBalance > 0.01 && (
          <>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <TextField
                label="Amount to Pay"
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                fullWidth
                autoFocus
                onClick={() => { if (selectedMethod !== 'cash' && currentAmount === '') { setCurrentAmount(remainingBalance.toFixed(2)); } }}
                sx={{ flex: 1 }}
              />
              {selectedMethod === 'cash' && (
                <TextField
                  label="Cash Tendered"
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  fullWidth
                  sx={{ flex: 1 }}
                />
              )}
            </Box>
            
            <ButtonGroup fullWidth variant="outlined" sx={{ my: 2 }}>
              <Button onClick={() => { setSelectedMethod('cash'); setCurrentAmount(remainingBalance.toFixed(2)); setCashTendered(''); }} variant={selectedMethod === 'cash' ? 'contained' : 'outlined'}>Cash</Button>
              <Button onClick={() => setSelectedMethod('mpesa')} variant={selectedMethod === 'mpesa' ? 'contained' : 'outlined'}>M-Pesa</Button>
              <Button onClick={() => setSelectedMethod('card')} variant={selectedMethod === 'card' ? 'contained' : 'outlined'}>Card</Button>
            </ButtonGroup>

            <Button fullWidth variant="contained" onClick={handleAddPayment} disabled={!currentAmount} type="button">
              Add Payment
            </Button>
          </>
        )}
        
        {changeDue > 0 && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h6" color="success.dark">
              Change Due: Ksh {changeDue.toFixed(2)}
            </Typography>
          </Box>
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