// src/App.tsx
import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, CssBaseline, Divider } from '@mui/material';
import { LayoutDashboard, Package, ShoppingCart, BarChart2, LogOut, Users as UsersIcon } from 'lucide-react'; // 1. Import the Users icon
import { useProductStore } from './state/productSlice';
import { useAuthStore } from './state/authSlice';

const drawerWidth = 240;

const StyledNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
    {({ isActive }) => (<ListItemButton selected={isActive}>{children}</ListItemButton>)}
  </NavLink>
);

function App() {
  const { fetchProducts } = useProductStore();
  const { user, logout } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    // This will run when the app loads for a logged-in user
    if(user) {
        fetchProducts();
    }
  }, [fetchProducts, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define all possible menu items with the roles that can see them
  const allMenuItems = [
    { text: 'POS Terminal', icon: <LayoutDashboard size={20} />, path: '/', roles: ['admin', 'user', 'intermediary'] },
    { text: 'Transactions', icon: <ShoppingCart size={20} />, path: '/transactions', roles: ['admin', 'user', 'intermediary'] },
    { text: 'Inventory', icon: <Package size={20} />, path: '/inventory', roles: ['admin', 'intermediary'] },
    { text: 'Reports', icon: <BarChart2 size={20} />, path: '/reports', roles: ['admin', 'intermediary'] },
    // 2. THE FIX IS HERE: Add the User Management link for admins
    { text: 'Users', icon: <UsersIcon size={20} />, path: '/users', roles: ['admin'] }
  ];

  // Filter the menu items based on the current user's role
  const visibleMenuItems = allMenuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        sx={{ width: drawerWidth, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' } }}
      >
        <Toolbar><Typography variant="h6" noWrap>POS System</Typography></Toolbar>
        <Divider />
        <List>
          {visibleMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <StyledNavLink to={item.path}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </StyledNavLink>
            </ListItem>
          ))}
        </List>
        <Box sx={{ marginTop: 'auto' }}>
            <Divider />
            <ListItem disablePadding>
                <ListItemButton onClick={handleLogout}>
                  <ListItemIcon><LogOut size={20} /></ListItemIcon>
                  <ListItemText primary="Logout" secondary={user?.username || 'User'} />
                </ListItemButton>
            </ListItem>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default App;