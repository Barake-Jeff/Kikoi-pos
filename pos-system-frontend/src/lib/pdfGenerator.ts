// src/lib/pdfGenerator.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type { Transaction, CartItem, ReportData } from '../types'; // Import ReportData

// The function now accepts the ReportData object
export const exportSalesToPDF = (reportData: ReportData, transactions: Transaction[], period: string, productName?: string | null) => {
  const doc = new jsPDF(); 

  const reportTitle = productName ? `Sales Report for ${productName}` : `Sales Report`;
  const periodTitle = productName ? '' : ` - ${period.charAt(0).toUpperCase() + period.slice(1)}`;

  doc.setFontSize(18);
  doc.text(`${reportTitle}${periodTitle}`, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const tableColumn = productName 
    ? ["Date", "Payment Method", "Units Sold", "Value (Ksh)"] 
    : ["Date", "Payment Method", "Items", "Total (Ksh)"];
  const tableRows: (string | number)[][] = [];

  transactions.forEach(tx => {
    const paymentMethods = (tx.payments || []).map(p => p.method.toUpperCase()).join(', ');
    let rowData;
    if (productName) {
      const relevantItems = tx.items.filter((item: CartItem) => item.name === productName);
      const unitsSold = relevantItems.reduce((sum, item) => sum + item.quantity, 0);
      const valueOfItems = relevantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      rowData = [ new Date(tx.timestamp).toLocaleDateString(), paymentMethods, unitsSold, valueOfItems.toFixed(2) ];
    } else {
      rowData = [ new Date(tx.timestamp).toLocaleDateString(), paymentMethods, tx.items.map((item: CartItem) => `${item.name} (x${item.quantity})`).join('\n'), tx.total.toFixed(2) ];
    }
    tableRows.push(rowData);
  });
  
  const tableOptions: UserOptions = {
    startY: 40,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    styles: { cellPadding: 3, fontSize: 8, valign: 'middle' },
    headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold' },
    
    didDrawPage: (data) => {
      const tableBottomY = data.cursor?.y ?? 0;
      const leftMargin = data.settings.margin.left;
      let currentY = tableBottomY + 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL SALES: Ksh ${reportData.totalSales.toFixed(2)}`, leftMargin, currentY);
      currentY += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cash Total: Ksh ${reportData.salesByMethod.cash.toFixed(2)}`, leftMargin + 5, currentY);
      currentY += 5;
      doc.text(`M-Pesa Total: Ksh ${reportData.salesByMethod.mpesa.toFixed(2)}`, leftMargin + 5, currentY);
      currentY += 5;
      doc.text(`Card Total: Ksh ${reportData.salesByMethod.card.toFixed(2)}`, leftMargin + 5, currentY);

      if (productName) {
        currentY += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL UNITS SOLD: ${reportData.transactionCount}`, leftMargin, currentY);
      }
    }
  };

  autoTable(doc, tableOptions);

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const fileName = productName
    ? `sales_report_${productName.replace(/\s+/g, '_')}_${dateSuffix}.pdf`
    : `sales_report_${period}_${dateSuffix}.pdf`;

  doc.save(fileName);
};