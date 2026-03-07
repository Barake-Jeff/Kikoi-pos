import { useSnackbar } from 'notistack';
import type { ReceiptProps } from '../features/pos_terminal/components/Receipt';

/**
 * Hook to print receipts directly to a thermal printer using electron-pos-printer
 * Falls back to browser printing if not in Electron
 */
export const usePrintToPrinter = () => {
  const { enqueueSnackbar } = useSnackbar();

  const printToPrinter = async (receiptData: ReceiptProps, printerName?: string) => {
    try {
      // Check if we're in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        console.log('Printing to thermal printer via Electron...');
        console.log('Sending receipt to main (items length):', receiptData?.items?.length);
        console.log('Sending receipt sample:', JSON.stringify({
          transactionId: receiptData.transactionId,
          total: receiptData.total,
          itemsCount: receiptData?.items?.length,
          printerName
        }));
        const payload = printerName ? { ...receiptData, printerName } : receiptData;
        const result = await (window as any).electronAPI.printReceipt(payload);

        if (result.success) {
          enqueueSnackbar(result.message || 'Receipt sent to printer', {
            variant: 'success',
            autoHideDuration: 3000,
          });
          return true;
        } else {
          enqueueSnackbar(`Print error: ${result.error}`, {
            variant: 'error',
            autoHideDuration: 5000,
          });
          return false;
        }
      } else {
        console.log('Not in Electron environment, print functionality unavailable');
        enqueueSnackbar('Thermal printer not available in this environment', {
          variant: 'warning',
          autoHideDuration: 3000,
        });
        return false;
      }
    } catch (error: any) {
      console.error('Print error:', error);
      enqueueSnackbar(
        `Failed to print receipt: ${error.message || 'Unknown error'}`,
        {
          variant: 'error',
          autoHideDuration: 5000,
        }
      );
      return false;
    }
  };

  return { printToPrinter };
};
