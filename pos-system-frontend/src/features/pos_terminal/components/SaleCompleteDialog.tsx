// src/features/pos_terminal/components/SaleCompleteDialog.tsx

import React from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Stack } from '@mui/material';
import { usePrint } from '../../../hooks/usePrint';
import { usePrintToPrinter } from '../../../hooks/usePrintToPrinter';
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
  const { printToPrinter } = usePrintToPrinter();
  const { user } = useAuthStore();

  return (
    <>
      <div style={{ display: 'none' }}>
        <Receipt ref={componentRef} {...receiptData} servedBy={user} />
      </div>
      <Dialog open={open} onClose={onClose} aria-labelledby="sale-complete-dialog-title">
        <DialogTitle id="sale-complete-dialog-title">Sale Completed!</DialogTitle>
        <DialogContent>
          {/* {receiptData.changeDue && receiptData.changeDue > 0 && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Change Due:</Typography>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
                Ksh {receiptData.changeDue.toFixed(2)}
              </Typography>
            </Box>
          )} */}
          <DialogContentText>
            You can now print a receipt or start a new sale.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button onClick={() => printToPrinter(receiptData)} variant="outlined" color="primary">
              Print to Thermal Printer
            </Button>
            <Button onClick={() => handlePrint(componentRef.current)} variant="outlined">
              Print Receipt
            </Button>
            <Button onClick={onClose} variant="contained" autoFocus>
              New Sale
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaleCompleteDialog;