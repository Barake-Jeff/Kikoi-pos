// src/api/userApi.ts
import apiClient from './apiClient';

// Simplified User type for the list view
export interface User {
    id: number;
    username: string;
    role: 'admin' | 'user' | 'intermediary';
    created_at: string;
}

export const getUsers = async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
};

// The other functions (createUser, updateUser, deleteUser) will be called
// from within the UI components directly using apiClient for simplicity.