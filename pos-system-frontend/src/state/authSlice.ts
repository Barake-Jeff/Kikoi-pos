// src/state/authSlice.ts
import { create } from 'zustand';
import { loginUser as loginUserApi } from '../api/authApi';

export interface UserCredentials {
    username: string;
    password: string;
}

export interface UserPayload {
    id: number;
    username: string;
    is_active: 0 | 1;
    role: 'admin' | 'user' | 'intermediary';
}

export interface AuthResponse {
    message: string;
    token: string;
    user: UserPayload;
}

interface AuthState {
    user: UserPayload | null;
    token: string | null;
    isLoading: boolean;
    login: (credentials: UserCredentials) => Promise<void>;
    logout: () => void;
}

const getInitialState = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');
    return {
        token: token || null,
        user: user ? JSON.parse(user) : null,
    };
};

export const useAuthStore = create<AuthState>((set) => ({
    ...getInitialState(),
    isLoading: false,
    
    login: async (credentials) => {
        set({ isLoading: true });
        try {
            const { token, user } = await loginUserApi(credentials);
            localStorage.setItem('authToken', token);
            localStorage.setItem('authUser', JSON.stringify(user));
            set({ user, token, isLoading: false });
        } catch (error) {
            // THE FIX: Log the original error for debugging purposes.
            console.error("Login API failed:", error); 
            
            const errorMessage = 'Login failed. Please check your credentials.';
            set({ isLoading: false, user: null, token: null });
            throw new Error(errorMessage);
        }
    },
    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        set({ user: null, token: null });
    },
}));