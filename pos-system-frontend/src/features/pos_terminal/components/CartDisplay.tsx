// src/features/pos_terminal/components/CartDisplay.tsx
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, DeleteForever } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useCartStore } from '../../../state/cartSlice';
import type { CartItem } from '../../../types';

const CartDisplay = () => {
  const { items, updateQuantity, removeItem } = useCartStore();

  const handleQuantityChange = (id: string, newQuantity: number) => {
    // Ensure quantity is a valid number and not negative
    const quantity = Math.max(0, newQuantity);
    if (quantity === 0) {
      removeItem(id); // Remove item if quantity becomes zero
    } else {
      updateQuantity(id, quantity);
    }
  };
  
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const columns: GridColDef<CartItem>[] = [
    {
      field: 'name',
      headerName: 'Product',
      flex: 1, // This column will take up the remaining space
      minWidth: 150,
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      width: 130,
      sortable: false,
      renderCell: (params: GridRenderCellParams<CartItem>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleQuantityChange(params.row.id, params.row.quantity - 1)}
          >
            <RemoveCircleOutline fontSize="small" />
          </IconButton>
          {/* A small text field can be used for direct quantity input if desired */}
          {/* For now, a simple text display is cleaner */}
          <Typography sx={{ width: '25px', textAlign: 'center' }}>
            {params.row.quantity}
          </Typography>
          <IconButton
            size="small"
            onClick={() => handleQuantityChange(params.row.id, params.row.quantity + 1)}
          >
            <AddCircleOutline fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      type: 'number',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => value.toFixed(2),
    },
    {
      field: 'total',
      headerName: 'Total',
      type: 'number',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      // Calculate the total for the row
      valueGetter: (_: unknown, row) => row.price * row.quantity,
      valueFormatter: (value: number) => value.toFixed(2),
    },
    {
      field: 'actions',
      headerName: 'Remove',
      sortable: false,
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<CartItem>) => (
        <IconButton
          color="error"
          onClick={() => removeItem(params.row.id)}
          aria-label="remove item"
        >
          <DeleteForever />
        </IconButton>
      ),
    },
  ];

  return (
    <Paper elevation={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Current Sale</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <DataGrid
          rows={items}
          columns={columns}
          // --- STYLE PROPS FOR A COMPACT LOOK ---
          density="compact" // Reduces padding
          rowHeight={40}    // Sets a shorter row height
          hideFooter        // We don't need pagination for the cart
          autoHeight={false}  // Allows the grid to fill its container
          // Display a message when the cart is empty
          slots={{
            noRowsOverlay: () => (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">Cart is empty</Typography>
              </Box>
            ),
          }}
        />
      </Box>
      
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
        <Typography variant="h4" component="p" align="right">
          Total: Ksh {subtotal.toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default CartDisplay;