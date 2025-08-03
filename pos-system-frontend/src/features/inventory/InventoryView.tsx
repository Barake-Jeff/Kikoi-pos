// src/features/inventory/InventoryView.tsx
import { useState, useEffect, useMemo } from 'react'; // 1. Import useMemo
import { Box, Button, Typography, Chip, IconButton, CircularProgress, TextField, InputAdornment} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Edit, Delete, Add, Search } from '@mui/icons-material';
import { useProductStore } from '../../state/productSlice';
import { useAuthStore } from '../../state/authSlice';
import AddEditProductForm from './components/AddEditProductForm';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import { useSnackbar } from 'notistack';
import type { Product } from '../../types';

const LOW_STOCK_THRESHOLD = 10;

const InventoryView = () => {
  const { products, isLoading, fetchProducts, deleteProduct } = useProductStore();
  const { user } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  
  const [isFormOpen, setFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
  // If the search term is empty, return all products
  if (!searchTerm) {
    return products;
  }

  const lowercasedFilter = searchTerm.toLowerCase();

  // Filter products where the name or barcode includes the search term
  return products.filter(product =>
    product.name.toLowerCase().includes(lowercasedFilter) ||
    (product.barcode && product.barcode.toLowerCase().includes(lowercasedFilter))
  );
}, [products, searchTerm]); // Dependencies array for useMemo

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenAddForm = () => {
    setProductToEdit(null);
    setFormOpen(true);
  };

  const handleOpenEditForm = (product: Product) => {
    setProductToEdit(product);
    setFormOpen(true);
  };

  const handleOpenConfirmDialog = (id: string) => {
    setProductIdToDelete(id.toString());
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (productIdToDelete) {
      console.log(`Deleting product with ID: ${productIdToDelete}`);
      await deleteProduct(productIdToDelete);
      enqueueSnackbar('Product deleted successfully', { variant: 'info' });
    }
    setConfirmOpen(false);
    setProductIdToDelete(null);
  };

  // --- START: THE FINAL, CORRECTED COLUMN DEFINITION ---
  const columns = useMemo(() => {
    const baseColumns: GridColDef<Product>[] = [
      { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200 },
      { field: 'barcode', headerName: 'Barcode', width: 150 },
      { 
        field: 'price', 
        headerName: 'Price', 
        type: 'number', 
        width: 120,
        renderCell: (params: GridRenderCellParams<Product, number>) => {
          if (typeof params.value !== 'number') return '';
          return `Ksh ${params.value.toFixed(2)}`;
        }
      },
      { 
        field: 'costPrice', 
        headerName: 'Cost', 
        type: 'number', 
        width: 120,
        renderCell: (params: GridRenderCellParams<Product, number>) => {
          if (typeof params.value !== 'number') return '';
          return `Ksh ${params.value.toFixed(2)}`;
        }
      },
      { 
        field: 'stock', 
        headerName: 'Stock', 
        type: 'number', 
        width: 120,
        renderCell: (params: GridRenderCellParams<Product, number>) => {
          if (typeof params.value !== 'number') return null; 
          return params.value <= LOW_STOCK_THRESHOLD 
            ? <Chip label={params.value} color="error" size="small" />
            : <Chip label={params.value} color="success" size="small" />
        }
      }
    ];

    if (user?.role === 'admin') {
      return [
        ...baseColumns,
        {
          field: 'actions',
          headerName: 'Actions',
          sortable: false,
          width: 150,
          renderCell: (params: GridRenderCellParams<Product>) => (
            <>
              <IconButton onClick={() => handleOpenEditForm(params.row)}><Edit /></IconButton>
              <IconButton onClick={() => handleOpenConfirmDialog(params.row.id)}><Delete /></IconButton>
            </>
          )
        }
      ];
    }

    return baseColumns;
  }, [user]); // The dependency array ensures this recalculates only if the user changes
  // --- END: CORRECTED COLUMN DEFINITION ---

  if (isLoading && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Inventory Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by name or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {user?.role === 'admin' && (
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddForm}>
              Add Product
            </Button>
          )}
        </Box>
      </Box>
      <DataGrid
        rows={filteredProducts}
        columns={columns}
        loading={isLoading}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } }}}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
      />
      <AddEditProductForm open={isFormOpen} onClose={() => setFormOpen(false)} productToEdit={productToEdit} />
      <ConfirmationDialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Product" message="Are you sure you want to delete this product? This action cannot be undone." />
    </Box>
  );
};

export default InventoryView;