// src/features/transactions/components/CompletedSalesList.tsx
import { useEffect } from 'react';
import { Box, Paper, CircularProgress, Chip, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTransactionStore } from '../../../state/transactionSlice';
import type { Transaction, CartItem, Payment } from '../../../types';
import { Visibility as ViewIcon } from '@mui/icons-material';

interface CompletedSalesListProps {
  onViewDetails: (transaction: Transaction) => void;
}

const CompletedSalesList = ({ onViewDetails }: CompletedSalesListProps ) => {
  const { completedTransactions, isLoading, fetchCompletedTransactions } = useTransactionStore();

  useEffect(() => {
    // Fetch transactions when the component mounts if the list is empty
    if (completedTransactions.length === 0) {
      fetchCompletedTransactions();
    }
  }, [completedTransactions.length, fetchCompletedTransactions]);

  const columns: GridColDef<Transaction>[] = [
    { field: 'id', headerName: 'Receipt No.', width: 100 },
    {
      field: 'timestamp',
      headerName: 'Date',
      width: 180,
      valueGetter: (value: string | Date) => new Date(value).toLocaleString(),
    },
    {
      field: 'payments',
      headerName: 'Payment Method',
      width: 150,
      sortable: false,
      valueGetter: (value: Payment[]) => 
        value?.map(p => p.method.toUpperCase()).join(', ') || 'N/A',
    },
    {
      field: 'items',
      headerName: 'Items Sold',
      flex: 1,
      minWidth: 250,
      sortable: false,
      // The value here is an array of CartItem objects
      valueGetter: (value: CartItem[]) => 
        value?.map(item => `${item.name} (x${item.quantity})`).join(', ') || '',
    },
    {
      field: 'total',
      headerName: 'Total (Ksh)',
      type: 'number',
      width: 130,
      valueFormatter: (value: number) => value.toFixed(2),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams<Transaction, string>) => {
        const status = params.value;
        let color: "success" | "error" | "warning" = "success";
        if (status === 'cancelled') color = 'error';
        if (status === 'pending') color = 'warning';
        return <Chip label={status?.toUpperCase()} color={color} size="small" />;
      },
    },
    // --- 3. THE NEW ACTIONS COLUMN ---
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Transaction>) => (
        <IconButton 
          onClick={() => onViewDetails(params.row)}
          aria-label="view details"
        >
          <ViewIcon />
        </IconButton>
      ),
    },
  ];

  if (isLoading && completedTransactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3}>
      <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
        <DataGrid
          rows={completedTransactions}
          columns={columns}
          loading={isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'timestamp', sort: 'desc' }] }
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          rowHeight={80} // Increase row height to accommodate multiple item lines
        />
      </Box>
    </Paper>
  );
};

export default CompletedSalesList;