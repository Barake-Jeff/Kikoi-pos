import React from 'react';
import type { Payment, User, CartItem } from '../../../types';

import './Receipt.css'; // <-- UNCOMMENTED THIS LINE!

export interface ReceiptProps {
  items: CartItem[];
  total: number;
  payments: Payment[];
  servedBy: User | null;
  transactionId: number | null;
  cashTendered?: number;
  changeDue?: number;
}

const PAYBILL_NUMBER = '522533';
const ACCOUNT_NUMBER = '6314306';

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, total, payments, servedBy, transactionId, cashTendered, changeDue }, ref) => {
    
    // REMOVED THE 'styles' OBJECT ENTIRELY.
    // All styling is now handled via class names in Receipt.css.

    return (
      // The main container class is 'receipt-container'.
      // The 'receipt-print-container' class from before is redundant if 'receipt-container' is the primary class
      // being targeted by @media print. I'll use 'receipt-container' for clarity.
      // If the intent was for 'receipt-print-container' to be *only* for print, and you have
      // a different class for the on-screen modal, you'd apply that here too.
      // Based on your original code, 'receipt-print-container' was on the root, so I'll make it the main class.
      <div ref={ref} className="receipt-container"> {/* Used receipt-container for the primary element */}
        <div className="receipt-header">
          <h3 className="receipt-store-name">Celeb Shop</h3>
          {/* Renamed to receipt-address for clearer mapping */}
          <p className="receipt-address receipt-secondary-info">Apple Tree Apartments, Mombasa Road</p>
          <p className="receipt-meta-info receipt-secondary-info">Date: {new Date().toLocaleString()}</p>
          {transactionId && <p className="receipt-meta-info receipt-secondary-info">Receipt No: {transactionId}</p>}
          {servedBy && <p className="receipt-meta-info receipt-secondary-info">Served by: {servedBy.username}</p>}
        </div>

        <div className="receipt-hr" />

        <table className="receipt-table">
          <thead>
            <tr>
              <th className="receipt-th-item">Item</th>
              <th className="receipt-th-number">Qty</th>
              <th className="receipt-th-number">Price</th>
              <th className="receipt-th-number">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="receipt-td-item">{item.name}</td>
                <td className="receipt-td-number">{item.quantity}</td>
                <td className="receipt-td-number">{item.price.toFixed(2)}</td>
                <td className="receipt-td-number">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-hr" />

        <div className="receipt-totals-section">
          {(payments || []).map((payment, index) => (
            <div className="receipt-total-row" key={index}>
              <span>Paid via {payment.method.toUpperCase()}</span>
              <span>Ksh {payment.amount.toFixed(2)}</span>
            </div>
          ))}
          <div className="receipt-total-row-bold">
            <span>TOTAL</span>
            <span>Ksh {total.toFixed(2)}</span>
          </div>

          {changeDue && changeDue > 0 && cashTendered && cashTendered > 0 && (
            <>
              <div className="receipt-hr" />
              <div className="receipt-total-row">
                <span>TENDERED (CASH)</span>
                <span>Ksh {cashTendered.toFixed(2)}</span>
              </div>
              <div className="receipt-total-row">
                <span>CHANGE</span>
                <span>Ksh {changeDue.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="receipt-payment-details">
          <strong>Payment Options</strong>
          {/* Specific class for this paragraph */}
          <p className="receipt-payment-details-text">Lipa na M-Pesa Paybill: <strong>{PAYBILL_NUMBER}</strong></p>
          <p className="receipt-payment-details-text">Acc. No: <strong>{ACCOUNT_NUMBER}</strong></p>
        </div>

        <div className="receipt-footer">
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    );
  }
);