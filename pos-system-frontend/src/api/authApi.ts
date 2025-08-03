import apiClient from './apiClient';
import type { UserCredentials, AuthResponse } from '../state/authSlice';

export const loginUser = async (credentials: UserCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
};