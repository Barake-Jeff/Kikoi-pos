// src/lib/reportingUtils.ts

/**
 * @file This module is responsible for processing a list of transactions
 * and generating structured report data for display, charting, and PDF generation.
 * It is designed to handle various time periods and can create general sales reports
 * or reports filtered down to a single product.
 *
 * "Next Guy" Note: The main complexity here is managing the data source. When a user
 * filters by product, we must ensure ALL calculations (KPIs, payment totals, chart data)
 * use the product-filtered transaction list, not the full list for the time period.
 * This module is designed to be the "single source of truth" for all report calculations.
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { Transaction } from '../types';

// --- Type Definitions ---

export type TimePeriod = 'today' | 'week' | 'month' | 'custom';

export interface ReportOptions {
  period: TimePeriod;
  productId?: string | null;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
}

// This interface is exported so other modules (like the PDF generator) can use it.
export interface ReportData {
  totalSales: number;
  totalProfit: number;
  transactionCount: number;
  topProducts: { name: string; quantity: number }[];
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  };
  salesByMethod: {
    cash: number;
    mpesa: number;
    card: number;
    // This category catches transactions that have a total but are missing payment information.
    // This ensures that the sum of payment methods always equals the total sales.
    unspecified: number; 
  };
}

// --- Helper Functions (Applying Single Responsibility Principle) ---

/**
 * Determines the start and end date for a report based on the selected time period.
 */
function getDateInterval(period: TimePeriod, customStartDate?: Date | null, customEndDate?: Date | null): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'custom': {
      // Wrapped in braces to create a block scope and prevent 'no-case-declarations' error.
      const start = customStartDate ? startOfDay(customStartDate) : startOfDay(now);
      const end = customEndDate ? endOfDay(customEndDate) : endOfDay(now);
      return { start, end };
    }
    case 'today':
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

/**
 * Calculates the total sales and profit from a list of transactions.
 */
function calculateKpis(transactions: Transaction[]): { totalSales: number; totalProfit: number } {
  return transactions.reduce(
    (acc, tx) => {
      acc.totalSales += tx.total;
      acc.totalProfit += tx.profit || 0;
      return acc;
    },
    { totalSales: 0, totalProfit: 0 }
  );
}

/**
 * Calculates the breakdown of sales by payment method, accounting for missing data.
 */
function calculatePaymentBreakdown(transactions: Transaction[]): ReportData['salesByMethod'] {
  // "Next Guy" Note: This function now handles cases where a transaction's total
  // is not fully covered by its payments array. This is a data integrity issue
  // from the source, but the report must still be financially consistent.
  const salesByMethod: ReportData['salesByMethod'] = { cash: 0, mpesa: 0, card: 0, unspecified: 0 };

  for (const tx of transactions) {
    const totalPaidInTx = tx.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    // Add paid amounts to their respective methods
    if (Array.isArray(tx.payments)) {
      for (const payment of tx.payments) {
        if (Object.prototype.hasOwnProperty.call(salesByMethod, payment.method)) {
          salesByMethod[payment.method as keyof typeof salesByMethod] += payment.amount;
        }
      }
    }

    // If the transaction total is greater than the sum of its payments,
    // the difference is attributed to 'unspecified'. This makes the report totals match.
    if (tx.total > totalPaidInTx) {
      salesByMethod.unspecified += tx.total - totalPaidInTx;
    }
  }
  return salesByMethod;
}

/**
 * Generates data formatted for a sales-by-day chart.
 */
function calculateChartData(transactions: Transaction[]): ReportData['chartData'] {
  const salesByDay = new Map<string, number>();

  transactions.forEach(tx => {
    const dayKey = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const currentSales = salesByDay.get(dayKey) || 0;
    salesByDay.set(dayKey, currentSales + tx.total);
  });

  return {
    labels: Array.from(salesByDay.keys()),
    datasets: [{
      label: 'Sales (Ksh)',
      data: Array.from(salesByDay.values()),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
    }]
  };
}

/**
 * Determines the top 5 selling products by quantity.
 */
function calculateTopProducts(transactions: Transaction[]): ReportData['topProducts'] {
  const productQuantities = new Map<string, number>();

  transactions.flatMap(tx => tx.items).forEach(item => {
    const currentQty = productQuantities.get(item.name) || 0;
    productQuantities.set(item.name, currentQty + item.quantity);
  });

  return Array.from(productQuantities.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}


// --- Main Orchestrator Function ---

/**
 * Generates a full sales report based on a list of transactions and specified options.
 * This function acts as an orchestrator, calling helper functions to build the final report.
 * @param transactions The complete list of all transactions from the database.
 * @param options The reporting options, including time period and an optional product filter.
 * @returns An object containing the structured report data and the filtered list of transactions for PDF generation.
 */
export const calculateReport = (transactions: Transaction[], options: ReportOptions) => {
  const { period, productId, customStartDate, customEndDate } = options;

  // 1. Determine the date range for the report.
  const interval = getDateInterval(period, customStartDate, customEndDate);

  // 2. Get all transactions that fall within that date range.
  const transactionsInDateRange = transactions.filter(tx =>
    isWithinInterval(new Date(tx.timestamp), interval)
  );

  // 3. Determine the final set of transactions to be used for all calculations.
  // This is the most critical step for data consistency.
  let transactionsForReport: Transaction[];

  if (productId) {
    // If filtering by a product, the report data should ONLY reflect transactions containing that product.
    transactionsForReport = transactionsInDateRange.filter(tx =>
      tx.items.some(item => String(item.id) === String(productId))
    );
  } else {
    // If not filtering, the report data reflects all transactions in the date range.
    transactionsForReport = transactionsInDateRange;
  }

  // 4. Calculate all report metrics using the consistent transaction list.
  const kpis = calculateKpis(transactionsForReport);
  const salesByMethod = calculatePaymentBreakdown(transactionsForReport);
  const chartData = calculateChartData(transactionsForReport);

  // Special handling for Top Products and Transaction Count, which differ for product-specific reports.
  let topProducts: ReportData['topProducts'];
  let transactionCount: number;

  if (productId) {
    // For a single product report, the "top product" is just that one product.
    const allItemsOfProduct = transactionsForReport
      .flatMap(tx => tx.items)
      .filter(item => String(item.id) === String(productId));
    const totalQuantity = allItemsOfProduct.reduce((sum, item) => sum + item.quantity, 0);
    topProducts = allItemsOfProduct.length > 0 ? [{ name: allItemsOfProduct[0].name, quantity: totalQuantity }] : [];
    
    // For a product report, "transaction count" is better represented as "total units sold".
    transactionCount = totalQuantity;
  } else {
    topProducts = calculateTopProducts(transactionsForReport);
    transactionCount = transactionsForReport.length;
  }
  
  // 5. Assemble the final report object.
  const reportData: ReportData = {
    totalSales: kpis.totalSales,
    totalProfit: kpis.totalProfit,
    salesByMethod,
    chartData,
    topProducts,
    transactionCount,
  };

  // 6. Return both the calculated data and the raw data for other modules (like the PDF generator).
  // The `filteredData` key is what the PDF generator will loop through to display individual transactions.
  return {
    reportData: reportData,
    filteredData: transactionsForReport,
  };
};