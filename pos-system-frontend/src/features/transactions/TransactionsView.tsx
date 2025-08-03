// src/features/transactions/TransactionsView.tsx

import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import PendingSalesList from './components/PendingSalesList';
import CompletedSalesList from './components/CompletedSalesList';
import TransactionDetailModal from './components/TransactionDetailModal';
import type { Transaction } from '../../types';
import { usePendingSalesStore } from '../../state/pendingSalesSlice';
import { useTransactionStore } from '../../state/transactionSlice';

const TransactionsView = () => {
  console.log('%cTransactionsView is rendering...', 'color: orange; font-weight: bold;');
  const [tabIndex, setTabIndex] = useState(0);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Get stable references to the fetch functions from the stores
  const fetchPendingSales = usePendingSalesStore(state => state.fetchPendingSales);
  const fetchCompletedTransactions = useTransactionStore(state => state.fetchCompletedTransactions);

  // --- THE CORRECTED useEffect ---
  // The dependency array now only contains 'tabIndex'. This is the key to breaking the loop.
  // The effect will now ONLY run when the user physically clicks a different tab.
  useEffect(() => {
    console.log(`%cuseEffect in TransactionsView is RUNNING. Tab index: ${tabIndex}`, 'color: lightblue;');
    if (tabIndex === 0) {
      fetchPendingSales();
    } else {
      fetchCompletedTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIndex]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>Transactions</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="transaction tabs">
          <Tab label="Pending Sales" />
          <Tab label="Completed History" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <Box sx={{ py: 3 }}>
          <PendingSalesList />
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ py: 3 }}>
          <CompletedSalesList onViewDetails={handleViewDetails} />
        </Box>
      )}

      {selectedTransaction && (
        <TransactionDetailModal
          open={isDetailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          transaction={selectedTransaction}
        />
      )}
    </Box>
  );
};

export default TransactionsView;