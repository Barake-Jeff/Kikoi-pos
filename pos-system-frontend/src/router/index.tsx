// src/router/index.tsx
import { createHashRouter } from 'react-router-dom';
import App from '../App';
import PosTerminalView from '../features/pos_terminal/PosTerminalView';
import InventoryView from '../features/inventory/InventoryView';
import TransactionsView from '../features/transactions/TransactionsView';
import ReportingView from '../features/reporting/ReportingView';
import LoginView from '../features/auth/LoginView';
import ProtectedRoute from './ProtectedRoute'; // 1. Import the component
import UserManagementView from '../features/users/UserManagementView';


export const router = createHashRouter([
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PosTerminalView /> },
      { path: 'inventory', element: <InventoryView /> },
      { path: 'transactions', element: <TransactionsView /> },
      { path: 'reports', element: <ReportingView /> },
      { path: 'users', element: <UserManagementView /> }
    ],
  },
]);