import { useCallback } from 'react';

export const usePrint = () => {
  const handlePrint = useCallback((printContent: HTMLElement | null) => {
    if (!printContent) {
      console.error('Print Error: No content to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this site to print receipts.');
      return;
    }
    printWindow.document.write('<html><head><title>Print Receipt</title>');
    Array.from(document.styleSheets).forEach(styleSheet => {
      if (styleSheet.href) {
        const link = printWindow.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleSheet.href;
        printWindow.document.head.appendChild(link);
      } else if (styleSheet.cssRules) {
        const style = printWindow.document.createElement('style');
        style.textContent = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('\n');
        printWindow.document.head.appendChild(style);
      }
    });
    printWindow.document.write('</head><body></body></html>');
    printWindow.document.close();
    printWindow.document.body.innerHTML = printContent.innerHTML;
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  }, []);

  return handlePrint;
};