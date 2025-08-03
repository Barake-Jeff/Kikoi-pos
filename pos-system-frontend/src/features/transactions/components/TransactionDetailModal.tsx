// src/features/transactions/components/TransactionDetailModal.tsx

import { useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider, List, ListItem, ListItemText } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useTransactionStore } from '../../../state/transactionSlice';
import type { Transaction, Payment } from '../../../types';
import { usePrint } from '../../../hooks/usePrint'; // Assuming your print hook is here
import { Receipt } from '../../pos_terminal/components/Receipt'; // Import your Receipt component

interface TransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
}

const TransactionDetailModal = ({ open, onClose, transaction }: TransactionDetailModalProps) => {
  const { cancelTransaction } = useTransactionStore();
  const { enqueueSnackbar } = useSnackbar();
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint();

  const handleCancelSale = async () => {
    try {
      await cancelTransaction(transaction.id);
      enqueueSnackbar('Transaction successfully cancelled and stock restored.', { variant: 'success' });
      onClose(); // Close the modal on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel transaction.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const isCancelled = transaction.status === 'cancelled';

  return (
    <>
      {/* Hidden Receipt component for printing */}
      <div style={{ display: 'none' }}>
        <Receipt 
          ref={receiptRef}
          items={transaction.items}
          total={transaction.total}
          payments={transaction.payments}
          transactionId={transaction.id as number} // Cast as number for receipt
          servedBy={null} // We don't have this info for past sales yet, so pass null
        />
      </div>

      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Receipt No: <strong>{transaction.id}</strong></Typography>
            <Typography variant="subtitle2">Date: <strong>{new Date(transaction.timestamp).toLocaleString()}</strong></Typography>
            <Typography variant="subtitle2">Status: <strong style={{ color: isCancelled ? 'red' : 'green' }}>{transaction.status.toUpperCase()}</strong></Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>Items Sold</Typography>
          <List dense>
            {transaction.items.map(item => (
              <ListItem key={item.id} disableGutters>
                <ListItemText 
                  primary={`${item.name} (x${item.quantity})`}
                  secondary={`@ Ksh ${item.price.toFixed(2)} each`}
                />
                <Typography variant="body2">
                  Ksh {(item.price * item.quantity).toFixed(2)}
                </Typography>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="h6">TOTAL: Ksh {transaction.total.toFixed(2)}</Typography>
            {transaction.payments.map((payment: Payment, index: number) => (
              <Typography variant="subtitle1" key={index}>
                Paid via {payment.method.toUpperCase()}: Ksh {payment.amount.toFixed(2)}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={() => handlePrint(receiptRef.current)}>Reprint Receipt</Button>
          <Button 
            onClick={handleCancelSale}
            variant="contained" 
            color="error"
            // Disable the button if the sale is already cancelled
            disabled={isCancelled}
          >
            Cancel / Return Sale
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TransactionDetailModal;