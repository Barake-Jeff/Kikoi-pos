// src/features/users/UserManagementView.tsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add, Delete, Edit } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import apiClient from '../../api/apiClient';
import { getUsers } from '../../api/userApi';
import type { User } from '../../api/userApi';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import AddEditUserForm from './components/AddEditUserForm'; // 1. Import the new form

const UserManagementView = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();
    
    // State for the Add/Edit form
    const [isFormOpen, setFormOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    // State for the Delete confirmation
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            enqueueSnackbar('Failed to fetch users.', { variant: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [enqueueSnackbar]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenAddForm = () => {
        setUserToEdit(null);
        setFormOpen(true);
    };

    const handleOpenEditForm = (user: User) => {
        setUserToEdit(user);
        setFormOpen(true);
    };

    const handleOpenConfirmDialog = (user: User) => {
        setUserToDelete(user);
        setConfirmOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await apiClient.delete(`/users/${userToDelete.id}`);
            enqueueSnackbar('User deleted successfully.', { variant: 'success' });
            fetchUsers();
        } catch (error) {
            let message = "Failed to delete user.";
            if (error instanceof AxiosError) {
                message = error.response?.data?.message || message;
            }
            enqueueSnackbar(message, { variant: 'error' });
        } finally {
            setConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    const columns: GridColDef<User>[] = [
        { field: 'username', headerName: 'Username', flex: 1 },
        { field: 'role', headerName: 'Role', width: 150 },
        { 
            field: 'created_at', 
            headerName: 'Date Created', 
            flex: 1,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams<User, string | undefined>) => {
                if (!params.value) return 'N/A';
                return new Date(params.value).toLocaleString();
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            sortable: false,
            width: 150,
            renderCell: (params: GridRenderCellParams<User>) => (
                <>
                    {/* Enable the Edit button */}
                    <IconButton title="Edit User" onClick={() => handleOpenEditForm(params.row)}>
                        <Edit />
                    </IconButton>
                    <IconButton 
                        title="Delete User"
                        onClick={() => handleOpenConfirmDialog(params.row)} 
                        disabled={params.row.id === 1}
                    >
                        <Delete />
                    </IconButton>
                </>
            )
        }
    ];

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">User Management</Typography>
                {/* Enable the Add User button */}
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAddForm}>
                    Add User
                </Button>
            </Box>
            <DataGrid
                rows={users}
                columns={columns}
                loading={isLoading}
                disableRowSelectionOnClick
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[5, 10, 25]}
            />
            {userToDelete && (
                 <ConfirmationDialog
                    open={isConfirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={handleDeleteUser}
                    title="Delete User"
                    message={`Are you sure you want to delete the user "${userToDelete.username}"? This action cannot be undone.`}
                />
            )}
            {/* Render the new form modal */}
            <AddEditUserForm
                open={isFormOpen}
                onClose={() => setFormOpen(false)}
                onSave={fetchUsers}
                userToEdit={userToEdit}
            />
        </Box>
    );
};

export default UserManagementView;
