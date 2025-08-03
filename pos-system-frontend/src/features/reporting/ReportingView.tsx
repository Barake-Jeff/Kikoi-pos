// src/features/reporting/ReportingView.tsx

import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, ButtonGroup, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, TextField, Autocomplete } from '@mui/material';
import { Download as DownloadIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useTransactionStore } from '../../state/transactionSlice';
import { useProductStore } from '../../state/productSlice';
import { calculateReport } from '../../lib/reportingUtils';
import type { TimePeriod, ReportOptions } from '../../lib/reportingUtils';
import { exportSalesToPDF } from '../../lib/pdfGenerator';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import type { Product } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface KpiCardProps { title: string; value: string | number; }

const KpiCard = (props: KpiCardProps) => (
  <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
    <Typography variant="subtitle1" color="text.secondary">{props.title}</Typography>
    <Typography variant="h4" component="p">{props.value}</Typography>
  </Paper>
);

const ReportingView = () => {
  const { completedTransactions, fetchCompletedTransactions } = useTransactionStore();
  const { products, fetchProducts } = useProductStore();
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchCompletedTransactions();
    fetchProducts();
  }, [fetchCompletedTransactions, fetchProducts]);

  const { reportData, filteredData } = useMemo(() => {
    const options: ReportOptions = {
      period: timePeriod,
      productId: selectedProduct?.id,
      customStartDate: startDate ? new Date(startDate) : null,
      customEndDate: endDate ? new Date(endDate) : null,
    };
    return calculateReport(completedTransactions, options);
  }, [completedTransactions, timePeriod, selectedProduct, startDate, endDate]);
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Sales Trend' },
    },
  };
  
  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    if (period !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">
          {selectedProduct ? `Sales Report for ${selectedProduct.name}` : 'Reports & Analytics'}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <ButtonGroup variant="outlined">
                <Button onClick={() => handleTimePeriodChange('today')} variant={timePeriod === 'today' ? 'contained' : 'outlined'}>Today</Button>
                <Button onClick={() => handleTimePeriodChange('week')} variant={timePeriod === 'week' ? 'contained' : 'outlined'}>This Week</Button>
                <Button onClick={() => handleTimePeriodChange('month')} variant={timePeriod === 'month' ? 'contained' : 'outlined'}>This Month</Button>
            </ButtonGroup>
            <Button 
              variant="contained" 
              color="secondary" 
              startIcon={<DownloadIcon />} 
              onClick={() => exportSalesToPDF(reportData, filteredData, timePeriod, selectedProduct?.name)}
              disabled={filteredData.length === 0}
            >
                Download PDF
            </Button>
        </Stack>
      </Box>

      <Paper elevation={2} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Autocomplete
            options={products}
            getOptionLabel={(option) => option.name}
            value={selectedProduct}
            onChange={(_event, newValue) => setSelectedProduct(newValue)}
            sx={{ width: 300 }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                {option.name}
              </li>
            )}
            renderInput={(params) => <TextField {...params} label="Filter by Product" size="small" />}
        />
        <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setTimePeriod('custom'); }}
            InputLabelProps={{ shrink: true }}
        />
        <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setTimePeriod('custom'); }}
            InputLabelProps={{ shrink: true }}
        />
        <Button 
            startIcon={<ClearIcon/>} 
            onClick={() => {
                setSelectedProduct(null);
                setStartDate('');
                setEndDate('');
                setTimePeriod('today');
            }}
        >
            Clear Filters
        </Button>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
        <KpiCard title="Total Sales" value={`Ksh ${reportData.totalSales.toFixed(2)}`} />
        <KpiCard title="Total Profit" value={`Ksh ${reportData.totalProfit.toFixed(2)}`} />
        <KpiCard 
          title={selectedProduct ? "Units Sold" : "Transactions"} 
          value={reportData.transactionCount} 
        />
        {!selectedProduct && (
          <>
            <KpiCard title="Cash Sales" value={`Ksh ${reportData.salesByMethod.cash.toFixed(2)}`} />
            <KpiCard title="M-Pesa Sales" value={`Ksh ${reportData.salesByMethod.mpesa.toFixed(2)}`} />
            <KpiCard title="Card Sales" value={`Ksh ${reportData.salesByMethod.card.toFixed(2)}`} />
          </>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: '1 1 65%' }}>
            <Paper elevation={3} sx={{ p: 2 }}>
                <Bar options={chartOptions} data={reportData.chartData} />
            </Paper>
        </Box>
        <Box sx={{ flex: '1 1 35%' }}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedProduct ? 'Product Sales Breakdown' : 'Top Selling Products'}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="right">Units Sold</TableCell></TableRow></TableHead>
                <TableBody>
                  {reportData.topProducts.map((prod: {name: string, quantity: number}) => (
                    <TableRow key={prod.name}><TableCell>{prod.name}</TableCell><TableCell align="right">{prod.quantity}</TableCell></TableRow>
                  ))}
                   {reportData.topProducts.length === 0 && (
                     <TableRow><TableCell colSpan={2} align="center">No products sold in this period.</TableCell></TableRow>
                   )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Stack>
  );
};

export default ReportingView;