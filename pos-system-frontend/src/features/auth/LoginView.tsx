// src/features/auth/LoginView.tsx
import React, { useState, useEffect } from 'react'; // 1. Import useEffect
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authSlice';
import { Container, Box, TextField, Button, Typography, Paper, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';

const LoginView = () => {
  const navigate = useNavigate();
  const { login, isLoading, user } = useAuthStore(); // 2. Get the current user from the store
  const { enqueueSnackbar } = useSnackbar();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 3. Add the useEffect hook for redirection
  useEffect(() => {
    // If a user is already logged in, redirect to the main page
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      enqueueSnackbar('Username and password are required', { variant: 'warning' });
      return;
    }
    try {
      await login({ username, password });
      navigate('/');
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  return (
    // ... JSX remains the same ...
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4 }}>
        <Typography component="h1" variant="h5">
          POS System Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth id="username" label="Username" name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginView;