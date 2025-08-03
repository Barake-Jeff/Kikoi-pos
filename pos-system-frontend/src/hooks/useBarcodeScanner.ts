// src/hooks/useBarcodeScanner.ts
import { useState, useEffect, useCallback } from 'react';

// Increased timeout to be more forgiving for manual testing
const SCANNER_INPUT_TIMEOUT = 300; // 300ms

export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  const [buffer, setBuffer] = useState<string[]>([]);
  const [lastInputTime, setLastInputTime] = useState<number>(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // If an input field is focused, don't interfere.
    // This allows normal typing in text fields.
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
    }

    const currentTime = Date.now();
    
    if (event.key.length > 1 && event.key !== 'Enter') {
      return;
    }

    if (event.key === 'Enter') {
      if (buffer.length > 0) {
        event.preventDefault();
        const barcode = buffer.join('');
        console.log('--- Scanner Hook: Firing onScan with barcode:', barcode); // DEBUG
        onScan(barcode);
        setBuffer([]);
      }
      return;
    }

    if (currentTime - lastInputTime > SCANNER_INPUT_TIMEOUT) {
      console.log('--- Scanner Hook: Timeout exceeded. Resetting buffer.'); // DEBUG
      setBuffer([event.key]);
    } else {
      setBuffer((prevBuffer) => [...prevBuffer, event.key]);
    }

    setLastInputTime(currentTime);

  }, [buffer, lastInputTime, onScan]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};