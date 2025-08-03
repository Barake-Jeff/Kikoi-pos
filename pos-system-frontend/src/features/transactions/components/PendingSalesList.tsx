// src/features/transactions/components/PendingSalesList.tsx
import { useNavigate } from 'react-router-dom';
import { usePendingSalesStore } from '../../../state/pendingSalesSlice';
import { useCartStore } from '../../../state/cartSlice';
import { Box, Typography, List, ListItem, ListItemText, Button, Paper, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import type { CartItem } from '../../../types'; // Import CartItem type

const PendingSalesList = () => {
  const { pendingSales, isLoading, removePendingSale } = usePendingSalesStore();
  const { setCart } = useCartStore(); // Use the corrected setCart action
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleRecallSale = async (saleId: string) => {
    const saleToRecall = pendingSales.find(sale => String(sale.id) === String(saleId));
    if (saleToRecall) {
      try {
        // THE FIX IS HERE: We now map over the items to create a complete CartItem object.
        // The backend's getPendingTransactions now provides all the necessary fields.
        const cartItems: CartItem[] = saleToRecall.items.map((item: CartItem) => ({
          ...item,
          id: String(item.id),
          name: item.name,
          price: item.price,
          costPrice: item.costPrice || 0, // Default to 0 if undefined
          barcode: item.barcode || '',
          stock: item.stock || 0,
          quantity: item.quantity,
        }));

        await removePendingSale(saleId);
        setCart(cartItems); // Load the fully-formed items into the cart
        enqueueSnackbar('Sale recalled and loaded into the POS terminal.', { variant: 'info' });
        navigate('/');
      } catch (error) {
        console.error('Error recalling sale:', error);
        enqueueSnackbar('Failed to recall sale.', { variant: 'error' });
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Pending Sales (On Credit)</Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
      ) : pendingSales.length === 0 ? (
        <Typography>No sales are currently on hold.</Typography>
      ) : (
        <List>
          {pendingSales.map(sale => (
            <ListItem key={sale.id} secondaryAction={<Button variant="contained" onClick={() => handleRecallSale(String(sale.id))}>Recall</Button>} divider>
              <ListItemText primary={`Customer: ${sale.customerName}`} secondary={`Total: Ksh ${sale.total.toFixed(2)} - On: ${new Date(sale.timestamp).toLocaleDateString()}`} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default PendingSalesList;