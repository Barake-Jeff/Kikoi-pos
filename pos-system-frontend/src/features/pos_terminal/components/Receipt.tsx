// src/features/pos_terminal/components/Receipt.tsx

import React from 'react';
import type { Payment, User, CartItem } from '../../../types';

import './Receipt.css';

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
    
    // These inline styles are now primarily for the ON-SCREEN display inside modals.
    // The print styles in Receipt.css will override them when printing.
    const styles = {
      receipt: { 
        fontFamily: '"Lucida Console", "Courier New", monospace', 
        width: '280px', 
        padding: '10px', 
        fontSize: '10px',
        color: '#000',
        lineHeight: '1.4',
      },
      header: { textAlign: 'center' as const, marginBottom: '10px' },
      storeName: { fontSize: '14px', fontWeight: 'bold', margin: '0' },
      address: { margin: '5px 0', fontSize: '9px' },
      metaInfo: { fontSize: '9px', margin: '2px 0' },
      hr: { border: 'none', borderTop: '1px dashed #000', margin: '10px 0' },
      table: { width: '100%', borderCollapse: 'collapse' as const },
      thItem: { textAlign: 'left' as const, paddingBottom: '4px', width: '100%', },
      thNumber: { textAlign: 'right' as const, paddingBottom: '4px', paddingLeft: '10px',},
      tdItem: { textAlign: 'left' as const, padding: '3px 0', wordBreak: 'break-all' as const,},
      tdNumber: { textAlign: 'right' as const, padding: '3px 0', paddingLeft: '10px', whiteSpace: 'nowrap' as const,},
      totalsSection: { marginTop: '15px' },
      totalRow: { display: 'flex', justifyContent: 'space-between', margin: '3px 0',},
      totalRowBold: { display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontWeight: 'bold' as const,},
      footer: { textAlign: 'center' as const, marginTop: '20px', fontSize: '9px' },
      paymentDetails: { marginTop: '15px', border: '1px solid #000', padding: '8px', textAlign: 'center' as const },
    };

    return (
      // --- 2. ADD THE PRINT-SPECIFIC CLASS NAME ---
      <div ref={ref} style={styles.receipt} className="receipt-print-container">
        <div style={styles.header}>
          <h3 style={styles.storeName} className="receipt-store-name">Celeb Shop</h3>
          <p style={styles.address} className="receipt-secondary-info">Apple Tree Apartments, Mombasa Road</p>
          <p style={styles.metaInfo} className="receipt-secondary-info">Date: {new Date().toLocaleString()}</p>
          {transactionId && <p style={styles.metaInfo} className="receipt-secondary-info">Receipt No: {transactionId}</p>}
          {servedBy && <p style={styles.metaInfo} className="receipt-secondary-info">Served by: {servedBy.username}</p>}
        </div>


        <div style={styles.hr} />

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thItem}>Item</th>
              <th style={styles.thNumber}>Qty</th>
              <th style={styles.thNumber}>Price</th>
              <th style={styles.thNumber}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={styles.tdItem}>{item.name}</td>
                <td style={styles.tdNumber}>{item.quantity}</td>
                <td style={styles.tdNumber}>{item.price.toFixed(2)}</td>
                <td style={styles.tdNumber}>{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.hr} />

        <div style={styles.totalsSection}>
          {(payments || []).map((payment, index) => (
            <div style={styles.totalRow} key={index}>
              <span>Paid via {payment.method.toUpperCase()}</span>
              <span>Ksh {payment.amount.toFixed(2)}</span>
            </div>
          ))}
          <div style={styles.totalRowBold}>
            <span>TOTAL</span>
            <span>Ksh {total.toFixed(2)}</span>
          </div>

          {changeDue && changeDue > 0 && cashTendered && cashTendered > 0 && (
            <>
              <div style={styles.hr} />
              <div style={styles.totalRow}>
                <span>TENDERED (CASH)</span>
                <span>Ksh {cashTendered.toFixed(2)}</span>
              </div>
              <div style={styles.totalRow}>
                <span>CHANGE</span>
                <span>Ksh {changeDue.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        
        <div style={styles.paymentDetails}>
          <strong>Payment Options</strong>
          <p style={{margin: '5px 0'}}>Lipa na M-Pesa Paybill: <strong>{PAYBILL_NUMBER}</strong></p>
          <p style={{margin: '5px 0'}}>Acc. No: <strong>{ACCOUNT_NUMBER}</strong></p>
        </div>

        <div style={styles.footer}>
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    );
  }
);