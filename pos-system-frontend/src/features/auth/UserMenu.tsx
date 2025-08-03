import { ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { User, LogOut } from 'lucide-react';

const UserMenu = () => {
  return (
    <>
      <Divider />
      <ListItem disablePadding>
        <ListItemButton>
          <ListItemIcon>
            <User size={20} />
          </ListItemIcon>
          <ListItemText primary="Admin User" secondary="Administrator" />
          <LogOut size={20} />
        </ListItemButton>
      </ListItem>
    </>
  );
};

export default UserMenu;