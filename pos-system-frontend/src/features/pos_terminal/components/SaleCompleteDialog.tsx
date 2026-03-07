// src/features/pos_terminal/components/SaleCompleteDialog.tsx

import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Stack } from '@mui/material';
import { usePrintToPrinter } from '../../../hooks/usePrintToPrinter';
import type { ReceiptProps } from './Receipt';

interface SaleCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  receiptData: ReceiptProps; 
}

const SaleCompleteDialog = ({ open, onClose, receiptData }: SaleCompleteDialogProps) => {
  const { printToPrinter } = usePrintToPrinter();

  const handleThermalPrint = async () => {
    try {
      await printToPrinter(receiptData);
    } catch (err) {
      console.error('Thermal print failed:', err);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} aria-labelledby="sale-complete-dialog-title">
        <DialogTitle id="sale-complete-dialog-title">Sale Completed!</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The transaction has been recorded.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button
              onClick={handleThermalPrint}
              variant="contained"
              color="primary"
              fullWidth
              id="print-thermal-default"
            >
              Print Receipt
            </Button>
            <Button onClick={onClose} variant="outlined" fullWidth>
              New Sale
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SaleCompleteDialog;