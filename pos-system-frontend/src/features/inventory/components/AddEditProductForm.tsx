import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, FormControlLabel, Switch, Autocomplete } from '@mui/material';
import { useProductStore } from '../../../state/productSlice';
import type { Product } from '../../../types';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';

interface AddEditProductFormProps {
  open: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const AddEditProductForm = ({ open, onClose, productToEdit }: AddEditProductFormProps) => {
  const { products, addProduct, updateProduct } = useProductStore();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    is_bundle: false,
    base_product_id: null as string | null,
    bundle_quantity: 0,
  });

  const nonBundleProducts = useMemo(() => {
    return products.filter(p => !p.is_bundle && p.id !== productToEdit?.id);
  }, [products, productToEdit]);

  useEffect(() => {
    if (productToEdit) {
      // If editing, populate all fields including new ones
      setFormData({
        name: productToEdit.name,
        barcode: productToEdit.barcode || '',
        price: productToEdit.price,
        costPrice: productToEdit.costPrice,
        stock: productToEdit.stock,
        is_bundle: productToEdit.is_bundle === 1,
        base_product_id: productToEdit.base_product_id || null,
        bundle_quantity: productToEdit.bundle_quantity || 0,
      });
    } else {
      // If adding, reset to the default state
      setFormData({
        name: '',
        barcode: '',
        price: 0,
        costPrice: 0,
        stock: 0,
        is_bundle: false,
        base_product_id: null,
        bundle_quantity: 0,
      });
    }
  }, [productToEdit, open]);

  const handleBaseProductChange = (_event: React.SyntheticEvent, value: Product | null) => {
    setFormData(prev => ({ ...prev, base_product_id: value ? value.id : null }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: e.target.type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setFormData(prev => ({
      ...prev,
      is_bundle: isChecked,
      // Reset bundle fields if it's not a bundle anymore
      base_product_id: isChecked ? prev.base_product_id : null,
      bundle_quantity: isChecked ? prev.bundle_quantity : 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // --- 6. PREPARE DATA FOR SUBMISSION ---
      const productData = {
        ...formData,
        // Ensure bundle fields are null if it's not a bundle
        is_bundle: (formData.is_bundle ? 1 : 0) as 0 | 1,
        base_product_id: formData.is_bundle ? formData.base_product_id : null,
        bundle_quantity: formData.is_bundle ? formData.bundle_quantity : null,
        effective_stock: formData.stock,
      };

      if (productToEdit) {
        await updateProduct({ ...productToEdit, ...productData });
        enqueueSnackbar('Product updated successfully!', { variant: 'success' });
      } else {
        await addProduct(productData);
        enqueueSnackbar('Product added successfully!', { variant: 'success' });
      }
      onClose();
    } catch (error) {
      let errorMessage = 'Failed to save product. Please try again.';
      if (error instanceof AxiosError) {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{productToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="name" label="Product Name" value={formData.name} onChange={handleChange} required />
            <TextField name="barcode" label="Barcode" value={formData.barcode} onChange={handleChange} />
            <TextField name="price" label="Selling Price" type="number" value={formData.price} onChange={handleChange} required InputProps={{ inputProps: { step: "0.01" } }} />
            <TextField name="costPrice" label="Cost Price" type="number" value={formData.costPrice} onChange={handleChange} required InputProps={{ inputProps: { step: "0.01" } }} />
            
            {/* If it's a bundle, stock is not directly editable, as it's derived from the base product */}
            {!formData.is_bundle && (
              <TextField name="stock" label="Stock Quantity" type="number" value={formData.stock} onChange={handleChange} required />
            )}
            
            {/* --- 7. ADD THE NEW UI ELEMENTS --- */}
            <FormControlLabel
              control={<Switch checked={formData.is_bundle} onChange={handleSwitchChange} />}
              label="This is a bundled product"
            />
            {/* Conditionally render bundle fields */}
            {formData.is_bundle && (
              <>
                <Autocomplete
                  options={nonBundleProducts}
                  getOptionLabel={(option) => option.name}
                  value={nonBundleProducts.find(p => p.id === formData.base_product_id) || null}
                  onChange={handleBaseProductChange}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  renderInput={(params) => <TextField {...params} label="Base Product (Single Unit)" required={formData.is_bundle} />}
                />
                <TextField
                  name="bundle_quantity"
                  label="Quantity in Bundle"
                  type="number"
                  value={formData.bundle_quantity}
                  onChange={handleChange}
                  required={formData.is_bundle}
                />
              </>
            )}

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">{productToEdit ? 'Save Changes' : 'Add Product'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEditProductForm;