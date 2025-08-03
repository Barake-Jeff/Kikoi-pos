// src/controllers/transactionController.ts
import { Request, Response } from 'express';
import { RowDataPacket, OkPacket, Pool } from 'mysql2/promise';
const pool: Pool = require('../config/db');
// const { AuthenticatedRequest } = require('../middleware/authMiddleware'); // THIS LINE IS WRONG AND REMOVED

// Re-define the interface here
interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string; };
}

// Define types for payloads and items
interface CartItemPayload {
  id: number; 
  name: string; 
  price: number; 
  costPrice?: number; 
  quantity: number;
}
interface TransactionItem {
  id: number; 
  name: string; 
  quantity: number; 
  price: number; 
  costPrice?: number; 
  barcode?: string; 
  stock?: number;
}

interface PendingItem extends RowDataPacket {
    product_id: number;
    name: string; // We'll need the name for error messages
    quantity: number;
    price_at_sale: number;
    cost_price_at_sale: number;
}

interface PaymentPayload {
  method: 'cash' | 'mpesa' | 'card';
  amount: number;
}

interface Payment {
  method: 'cash' | 'mpesa' | 'card';
  amount: number;
}

const createCompletedTransaction = async (req: AuthenticatedRequest, res: Response) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { items, payments } = req.body as { items: CartItemPayload[], payments: PaymentPayload[] };
        const userId = req.user?.id;

        console.log('\n--- STARTING TRANSACTION DEBUG ---');
        console.log('[BACKEND - CHECKPOINT 1] Raw items payload received:', JSON.stringify(items, null, 2));


        if (!items || items.length === 0 || !payments || payments.length === 0 || !userId) { 
            throw new Error('Missing required transaction data.'); 
        }

        const productIds = items.map(item => item.id);

        console.log('[BACKEND - CHECKPOINT 2] Extracted product IDs for DB query:', productIds);

        const [productRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, name, price, costPrice, is_bundle, base_product_id, bundle_quantity FROM products WHERE id IN (?)',
            [productIds]
        );

        console.log('[BACKEND - CHECKPOINT 3] Rows returned from database:', JSON.stringify(productRows, null, 2));
        
        // --- THE ROBUST FIX: Ensure map keys are STRINGS ---
        const productMap = new Map(productRows.map(p => [String(p.id), p]));

        console.log('[BACKEND - CHECKPOINT 4] Product Map created. Keys:', Array.from(productMap.keys()));

        let totalAmount = 0;
        let totalProfit = 0;
        for (const item of items) {
            // --- THE ROBUST FIX: Ensure the lookup key is also a STRING ---
            const lookupId = String(item.id);
            console.log(`[BACKEND - CHECKPOINT 5] Looping... Attempting to find ID: "${lookupId}" (Type: ${typeof lookupId}) in the map.`);

            const productDetails = productMap.get(String(item.id));

            console.log(`[BACKEND - CHECKPOINT 5] Result from map:`, productDetails ? `Found ${productDetails.name}` : '!!! NOT FOUND !!!');
            
            if (!productDetails) {
                // This error will now only trigger if the product is genuinely not in the DB.
                throw new Error(`Product with ID ${item.id} (${item.name}) not found in database.`);
            }
            const itemTotal = item.price * item.quantity;
            const itemProfit = (item.price - parseFloat(productDetails.costPrice)) * item.quantity;
            totalAmount += itemTotal;
            totalProfit += itemProfit;
        }

        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
        if (Math.abs(totalAmount - totalPaid) > 0.01) {
            throw new Error(`Payment amount mismatch. Cart Total: ${totalAmount}, Amount Paid: ${totalPaid}`);
        }
        
        const [transactionResult] = await connection.query<OkPacket>(
            'INSERT INTO transactions (user_id, total_amount, total_profit, status) VALUES (?, ?, ?, ?)', 
            [userId, totalAmount, totalProfit, 'completed']
        );
        const transactionId = transactionResult.insertId;

        for (const payment of payments) {
            await connection.query(
                'INSERT INTO transaction_payments (transaction_id, method, amount) VALUES (?, ?, ?)',
                [transactionId, payment.method, payment.amount]
            );
        }

        for (const item of items) {
            // Use String() here as well for consistency
            const productDetails = productMap.get(String(item.id));
            
            if (!productDetails) {
                throw new Error(`Consistency error: Product ${item.name} disappeared during transaction.`);
            }

            await connection.query<OkPacket>(
                'INSERT INTO transaction_items (transaction_id, product_id, quantity, price_at_sale, cost_price_at_sale) VALUES (?, ?, ?, ?, ?)',
                [transactionId, item.id, item.quantity, item.price, productDetails.costPrice]
            );

            if (productDetails.is_bundle) {
                if (!productDetails.base_product_id || !productDetails.bundle_quantity) {
                    throw new Error(`Invalid bundle configuration for product: ${productDetails.name}`);
                }
                const stockToDeduct = productDetails.bundle_quantity * item.quantity;
                const [updateResult] = await connection.query<OkPacket>(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [stockToDeduct, productDetails.base_product_id, stockToDeduct]
                );
                if (updateResult.affectedRows === 0) {
                    throw new Error(`Insufficient stock for product: ${productDetails.name}`);
                }
            } else {
                const [updateResult] = await connection.query<OkPacket>(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [item.quantity, item.id, item.quantity]
                );
                if (updateResult.affectedRows === 0) {
                    throw new Error(`Insufficient stock for product: ${productDetails.name}`);
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Transaction created successfully', transactionId });
    } catch (error: unknown) {
        await connection.rollback();
        // Use the new, more specific error messages
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Error in createCompletedTransaction:", errorMessage);
        // Send a 400 Bad Request for user-facing errors like "insufficient stock"
        if (errorMessage.includes('Insufficient stock') || errorMessage.includes('Invalid bundle')) {
             return res.status(400).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Failed to create transaction.', error: errorMessage });
    } finally {
        if (connection) connection.release();
    }
};

const createPendingTransaction = async (req: AuthenticatedRequest, res: Response) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { items, customerName } = req.body as { items: CartItemPayload[], customerName: string };
        const userId = req.user?.id;
        
        if (!items || items.length === 0 || !customerName || !userId) {
            throw new Error('Missing required data for holding a sale.');
        }

        // We must fetch the costPrice from the database to ensure profit is calculated correctly and securely.
        const productIds = items.map(item => item.id);
        const [productRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, costPrice FROM products WHERE id IN (?)',
            [productIds]
        );
        const productMap = new Map(productRows.map(p => [String(p.id), p]));

        const total_amount = items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
        
        const total_profit = items.reduce((acc, item) => {
            const productDetails = productMap.get(String(item.id));
            const costPrice = productDetails ? parseFloat(productDetails.costPrice) : 0;
            return acc + ((item.price || 0) - costPrice) * (item.quantity || 0);
        }, 0);


        // --- THE FIX: The SQL query no longer includes 'payment_method' ---
        const [transactionResult] = await connection.query<OkPacket>(
            'INSERT INTO transactions (user_id, total_amount, total_profit, customer_name, status) VALUES (?, ?, ?, ?, ?)',
            [userId, total_amount, total_profit, customerName, 'pending']
        );
        const transactionId = transactionResult.insertId;

        for (const item of items) {
            const productDetails = productMap.get(String(item.id));
            const costPrice = productDetails ? productDetails.costPrice : 0;
            await connection.query<OkPacket>(
                'INSERT INTO transaction_items (transaction_id, product_id, quantity, price_at_sale, cost_price_at_sale) VALUES (?, ?, ?, ?, ?)',
                [transactionId, item.id, item.quantity, item.price, costPrice]
            );
        }
        
        await connection.commit();
        res.status(201).json({ message: 'Sale held successfully', transactionId });

    } catch (error: unknown) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("[Hold Sale] Error:", errorMessage);
        res.status(500).json({ message: 'Failed to hold sale.', error: errorMessage });
    } finally {
        if (connection) connection.release();
    }
};

const getPendingTransactions = async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                t.id, t.total_amount, t.customer_name as customerName, t.status, t.created_at as timestamp, 
                ti.product_id, ti.quantity, ti.price_at_sale, ti.cost_price_at_sale, 
                p.name as productName, p.barcode, p.stock 
            FROM transactions t 
            JOIN transaction_items ti ON t.id = ti.transaction_id 
            JOIN products p ON ti.product_id = p.id 
            WHERE t.status = 'pending' 
            ORDER BY t.created_at DESC;
        `);
        type GroupedPendingTx = { id: number; total: number; customerName: string; status: string; timestamp: Date; items: TransactionItem[] };
        const grouped = rows.reduce((acc, row) => {
            const { id, total_amount, customerName, status, timestamp, ...itemDetails } = row;
            const existing = acc.get(id) || { id, total: parseFloat(total_amount), customerName, status, timestamp, items: [] as TransactionItem[] };
            existing.items.push({ 
                id: itemDetails.product_id, 
                name: itemDetails.productName, 
                quantity: itemDetails.quantity, 
                price: parseFloat(itemDetails.price_at_sale), 
                costPrice: parseFloat(itemDetails.cost_price_at_sale), 
                stock: itemDetails.stock, 
                barcode: itemDetails.barcode 
            });
            acc.set(id, existing);
            return acc;
        }, new Map<number, GroupedPendingTx>());
        res.json(Array.from(grouped.values()));
    } catch (error) { 
        console.error("Error fetching pending transactions:", error);
        res.status(500).json({ message: 'Error fetching pending transactions.' }); 
    }
};

const completePendingTransaction = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params; // The ID of the transaction to complete
    const { payments } = req.body; // e.g., 'cash', 'mpesa'

    if (!payments || payments.length === 0) {
        return res.status(400).json({ message: 'Payment method is required to complete the sale.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Step 1: Fetch all items associated with the pending transaction
        const [items] = await connection.query<PendingItem[]>(
            'SELECT ti.product_id, ti.quantity, ti.price_at_sale, ti.cost_price_at_sale, p.name FROM transaction_items ti JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = ?',
            [id]
        );

        if (items.length === 0) {
            throw new Error('Transaction has no items or does not exist.');
        }

        // Step 2: Use the EXACT same stock deduction logic from createCompletedTransaction
        interface ProductDetails extends RowDataPacket {
            is_bundle: boolean;
            base_product_id: number | null;
            bundle_quantity: number | null;
        }

        const productIds = items.map(item => item.product_id);
        const [productRows] = await connection.query<RowDataPacket[]>(
            'SELECT id, name, is_bundle, base_product_id, bundle_quantity FROM products WHERE id IN (?)',
            [productIds]
        );

        // Ensure the map keys are STRINGS
        const productMap = new Map(productRows.map(p => [String(p.id), p]));
        
        for (const item of items) {
            // Ensure the lookup uses a STRING
            const productDetails = productMap.get(String(item.product_id));

            if (!productDetails) {
                // This will now correctly throw if a product is truly missing
                throw new Error(`Product ${item.name} (ID: ${item.product_id}) not found in database.`);
            }

            if (productDetails.is_bundle) {
                if (!productDetails.base_product_id || !productDetails.bundle_quantity) {
                    throw new Error(`Invalid bundle configuration for product: ${item.name}`);
                }
                const stockToDeduct = productDetails.bundle_quantity * item.quantity;
                const baseProductId = productDetails.base_product_id;
                const [updateResult] = await connection.query<OkPacket>(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [stockToDeduct, baseProductId, stockToDeduct]
                );
                if (updateResult.affectedRows === 0) {
                    throw new Error(`Insufficient stock for product: ${item.name}`);
                }
            } else {
                const [updateResult] = await connection.query<OkPacket>(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [item.quantity, item.product_id, item.quantity]
                );
                if (updateResult.affectedRows === 0) {
                    throw new Error(`Insufficient stock for product: ${item.name}`);
                }
            }
        }

        // Step 3: Update the transaction's status and payment method
        for (const payment of payments) {
            await connection.query(
                'INSERT INTO transaction_payments (transaction_id, method, amount) VALUES (?, ?, ?)',
                [id, payment.method, payment.amount]
            );
        }

        // --- MODIFIED UPDATE: No longer sets payment_method ---
        const [updateTxResult] = await connection.query<OkPacket>(
            "UPDATE transactions SET status = 'completed' WHERE id = ? AND status = 'pending'",
            [id]
        );

        if (updateTxResult.affectedRows === 0) {
            throw new Error('Pending sale could not be found or was already completed.');
        }

        await connection.commit();
        res.status(200).json({ message: 'Sale completed successfully!' });

    } catch (error: unknown) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Error completing pending transaction:", errorMessage);
        if (errorMessage.includes('Insufficient stock') || errorMessage.includes('Invalid bundle')) {
             return res.status(400).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Failed to complete sale.', error: errorMessage });
    } finally {
        if (connection) connection.release();
    }
};

const deletePendingTransaction = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query<OkPacket>('DELETE FROM transactions WHERE id = ? AND status = ?', [id, 'pending']);
        if (result.affectedRows === 0) { return res.status(404).json({ message: 'Pending sale not found.' }); }
        res.json({ message: 'Pending sale successfully recalled and removed.' });
    } catch (error) { 
        console.error("Error deleting pending transaction:", error);
        res.status(500).json({ message: 'Error removing pending sale.' }); 
    }
};

const getCompletedTransactions = async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                t.id, t.total_amount, t.total_profit, t.status, t.created_at as timestamp, 
                ti.product_id, ti.quantity, ti.price_at_sale, ti.cost_price_at_sale, 
                p.name as productName, p.barcode as productBarcode,
                (SELECT GROUP_CONCAT(CONCAT(tp.method, ':', tp.amount) SEPARATOR ';') 
                 FROM transaction_payments tp WHERE tp.transaction_id = t.id) as payments
            FROM transactions t 
            JOIN transaction_items ti ON t.id = ti.transaction_id 
            JOIN products p ON ti.product_id = p.id 
            WHERE t.status IN ('completed', 'cancelled')
            ORDER BY t.created_at DESC;
        `);
        
        type GroupedTx = { 
            id: number; 
            total: number; 
            profit: number; 
            payments: Payment[];
            status: string; 
            timestamp: Date; 
            items: TransactionItem[];
        };
        
        const grouped = rows.reduce((acc, row) => {
            const { id, total_amount, total_profit, payments: paymentsString, status, timestamp, ...itemDetails } = row;
            
            let existing = acc.get(id);

            if (!existing) {
                const parsedPayments: Payment[] = (paymentsString || '').split(';').map((pStr: string) => {
                    const [method, amountStr] = pStr.split(':');
                    return { method: method as Payment['method'], amount: parseFloat(amountStr) };
                })
                // --- THIS IS THE FIX ---
                // We explicitly tell TypeScript that 'p' is of type 'Payment'.
                .filter((p: Payment) => p.method && !isNaN(p.amount));

                existing = { 
                    id, 
                    total: parseFloat(total_amount), 
                    profit: parseFloat(total_profit), 
                    payments: parsedPayments,
                    status, 
                    timestamp, 
                    items: []
                };
            }

            existing.items.push({ 
                id: itemDetails.product_id, 
                name: itemDetails.productName, 
                barcode: itemDetails.productBarcode, 
                quantity: itemDetails.quantity, 
                price: parseFloat(itemDetails.price_at_sale), 
                costPrice: parseFloat(itemDetails.cost_price_at_sale) 
            });

            acc.set(id, existing);
            return acc;
        }, new Map<number, GroupedTx>());
        
        res.json(Array.from(grouped.values()));

    } catch (error) { 
        console.error("Error fetching completed transactions:", error);
        res.status(500).json({ message: 'Error fetching transactions.' }); 
    }
};


const cancelCompletedTransaction = async (req: Request, res: Response) => {
    const { id } = req.params; // The ID of the transaction to cancel
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Step 1: Find the transaction and ensure it's 'completed'
        const [transactionRows] = await connection.query<RowDataPacket[]>(
            'SELECT status FROM transactions WHERE id = ? FOR UPDATE', // Lock the row for update
            [id]
        );

        if (transactionRows.length === 0) {
            throw new Error('Transaction not found.');
        }
        if (transactionRows[0].status !== 'completed') {
            throw new Error(`Cannot cancel a transaction with status: ${transactionRows[0].status}`);
        }

        // Step 2: Get all items from the transaction to restore stock
        const [items] = await connection.query<PendingItem[]>(
            'SELECT ti.product_id, ti.quantity, p.name, p.is_bundle, p.base_product_id, p.bundle_quantity FROM transaction_items ti JOIN products p ON ti.product_id = p.id WHERE ti.transaction_id = ?',
            [id]
        );

        // Step 3: Loop through items and RESTORE stock
        for (const item of items) {
            if (item.is_bundle) {
                if (!item.base_product_id || !item.bundle_quantity) {
                    throw new Error(`Cannot restore stock for invalid bundle: ${item.name}`);
                }
                const stockToRestore = item.bundle_quantity * item.quantity;
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [stockToRestore, item.base_product_id]
                );
            } else {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        // Step 4: Update the transaction's status to 'cancelled'
        await connection.query(
            "UPDATE transactions SET status = 'cancelled' WHERE id = ?",
            [id]
        );

        await connection.commit();
        res.status(200).json({ message: 'Transaction cancelled and stock restored successfully.' });

    } catch (error: unknown) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Error cancelling transaction:", errorMessage);
        if (errorMessage.includes('not found') || errorMessage.includes('Cannot cancel')) {
            return res.status(400).json({ message: errorMessage });
        }
        res.status(500).json({ message: 'Failed to cancel transaction.', error: errorMessage });
    } finally {
        if (connection) connection.release();
    }
};

// --- FINALLY, export the new function ---
module.exports = { 
    createCompletedTransaction,
    getCompletedTransactions,
    createPendingTransaction,
    getPendingTransactions,
    completePendingTransaction,
    deletePendingTransaction,
    cancelCompletedTransaction // <-- ADD THIS
};