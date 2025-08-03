// src/features/pos_terminal/components/HoldSaleDialog.tsx
import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

interface HoldSaleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerName: string) => void;
}

const HoldSaleDialog = ({ open, onClose, onConfirm }: HoldSaleDialogProps) => {
  const [customerName, setCustomerName] = useState('');

  const handleConfirm = () => {
    if (customerName.trim()) {
      onConfirm(customerName.trim());
      setCustomerName(''); // Reset for next time
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Hold Sale</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To put this sale on hold for a credit customer, please enter their name.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="customerName"
          label="Customer Name"
          type="text"
          fullWidth
          variant="standard"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!customerName.trim()}>Confirm Hold</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HoldSaleDialog;