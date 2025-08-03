// src/features/users/components/AddEditUserForm.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import apiClient from '../../../api/apiClient';
import type { User } from '../../../api/userApi';

interface AddEditUserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to trigger a data refresh
  userToEdit?: User | null;
}

const AddEditUserForm = ({ open, onClose, onSave, userToEdit }: AddEditUserFormProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
  });

  const isEditing = !!userToEdit;

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username,
        password: '', // Password is not sent for editing, only for creation
        role: userToEdit.role,
      });
    } else {
      setFormData({ username: '', password: '', role: 'user' });
    }
  }, [userToEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRoleChange = (e: SelectChangeEvent<string>) => {
    setFormData(prev => ({ ...prev, role: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEditing && userToEdit) {
        // For editing, we only send username and role
        await apiClient.put(`/users/${userToEdit.id}`, { username: formData.username, role: formData.role });
        enqueueSnackbar('User updated successfully!', { variant: 'success' });
      } else {
        // For creating, we send all fields
        await apiClient.post('/users', formData);
        enqueueSnackbar('User created successfully!', { variant: 'success' });
      }
      onSave(); // Trigger data refresh in the parent
      onClose();
    } catch (error: unknown) {
      let message = 'An error occurred.';
      if (error instanceof AxiosError) {
        message = error.response?.data?.message || message;
      }
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField name="username" label="Username" value={formData.username} onChange={handleChange} required disabled={isSaving}/>
            {!isEditing && (
              <TextField name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required disabled={isSaving}/>
            )}
            <FormControl fullWidth>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                    labelId="role-select-label"
                    id="role-select"
                    name="role"
                    value={formData.role}
                    label="Role"
                    onChange={handleRoleChange}
                    disabled={isSaving}
                >
                    <MenuItem value={'admin'}>Admin</MenuItem>
                    <MenuItem value={'user'}>User</MenuItem>
                    <MenuItem value={'intermediary'}>Intermediary</MenuItem>
                </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSaving}>
            {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add User')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEditUserForm;