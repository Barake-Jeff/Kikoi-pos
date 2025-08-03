// src/features/pos_terminal/components/SaleCompleteDialog.tsx

import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Typography, Box } from '@mui/material';
import { usePrint } from '../../../hooks/usePrint';
import type { ReceiptProps } from './Receipt';
import { Receipt } from './Receipt';
import { useAuthStore } from '../../../state/authSlice';

interface SaleCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptProps; 
}

const SaleCompleteDialog = ({ open, onClose, receiptData }: SaleCompleteDialogProps) => {
  const componentRef = React.useRef<HTMLDivElement>(null);
  const handlePrint = usePrint();
  const { user } = useAuthStore();

  return (
    <>
      <div style={{ display: 'none' }}>
        <Receipt ref={componentRef} {...receiptData} servedBy={user} />
      </div>
      <Dialog open={open} onClose={onClose} aria-labelledby="sale-complete-dialog-title">
        <DialogTitle id="sale-complete-dialog-title">Sale Completed!</DialogTitle>
        <DialogContent>
          {receiptData.changeDue && receiptData.changeDue > 0 && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Change Due:</Typography>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                Ksh {receiptData.changeDue.toFixed(2)}
              </Typography>
            </Box>
          )}
          <DialogContentText>
            You can now print a receipt or start a new sale.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handlePrint(componentRef.current)}>Print Receipt</Button>
          <Button onClick={onClose} variant="contained" autoFocus>New Sale</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaleCompleteDialog;