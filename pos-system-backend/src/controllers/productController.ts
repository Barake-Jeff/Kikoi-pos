// src/controllers/productController.ts
import { Request, Response } from 'express';
import { OkPacket, RowDataPacket, Pool } from 'mysql2/promise';
const pool: Pool = require('../config/db');

// --- 1. UPDATED INTERFACE to include optional bundle fields ---
interface ProductPayload {
  name: string;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock: number;
  is_bundle?: 0 | 1;
  base_product_id?: string | null;
  bundle_quantity?: number | null;
}

const getAllProducts = async (req: Request, res: Response) => {
  try {
    // --- THE FIX: Add a WHERE clause to only select active products ---
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC');
    
    const products = rows.map(product => ({
      ...product,
      price: parseFloat(product.price),
      costPrice: parseFloat(product.costPrice),
      stock: parseInt(product.stock, 10),
      bundle_quantity: product.bundle_quantity ? parseInt(product.bundle_quantity, 10) : null,
    }));

    res.json(products);
  } catch (error) { 
    console.error("Error fetching products:", error);
    res.status(500).json({ message: 'Error fetching products.' }); 
  }
};

const createProduct = async (req: Request, res: Response) => {
  const { name, barcode, price, costPrice, stock, is_bundle, base_product_id, bundle_quantity }: ProductPayload = req.body;
  
  // Validation logic... (no changes here)
  if (!name || price === undefined || costPrice === undefined || stock === undefined) { 
    return res.status(400).json({ message: 'Missing required fields.' }); 
  }
  if (is_bundle === 1 && (!base_product_id || !bundle_quantity || bundle_quantity <= 0)) {
    return res.status(400).json({ message: 'Bundled products must have a valid base product and a bundle quantity greater than 0.' });
  }

  try {
    const sql = `
      INSERT INTO products (name, barcode, price, costPrice, stock, is_bundle, base_product_id, bundle_quantity) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [name, barcode, price, costPrice, stock, is_bundle || 0, base_product_id, bundle_quantity];
    
    const [result] = await pool.query<OkPacket>(sql, values);
    
    // --- THE FIX: Fetch the newly created product and return it ---
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE id = ?', [result.insertId]);
    const newProduct = {
        ...rows[0],
        price: parseFloat(rows[0].price),
        costPrice: parseFloat(rows[0].costPrice),
    };

    res.status(201).json(newProduct);
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    const dbError = error as { code?: string, sqlMessage?: string };
    if (dbError.code === 'ER_DUP_ENTRY' && dbError.sqlMessage?.includes('barcode')) { 
      return res.status(409).json({ message: 'Error: This barcode is already in use.' }); 
    }
    res.status(500).json({ message: 'Error creating product.' });
  }
};

// Replace the updateProduct function in src/controllers/productController.ts

const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, barcode, price, costPrice, stock, is_bundle, base_product_id, bundle_quantity }: ProductPayload = req.body;
  
  // Validation logic... (no changes here)
  if (!name || price === undefined || costPrice === undefined || stock === undefined) { 
    return res.status(400).json({ message: 'Missing required fields.' }); 
  }
  if (is_bundle === 1 && (!base_product_id || !bundle_quantity || bundle_quantity <= 0)) {
    return res.status(400).json({ message: 'Bundled products must have a valid base product and a bundle quantity greater than 0.' });
  }

  try {
    const sql = `
      UPDATE products SET name = ?, barcode = ?, price = ?, costPrice = ?, stock = ?, 
      is_bundle = ?, base_product_id = ?, bundle_quantity = ? 
      WHERE id = ?
    `;
    const values = [name, barcode, price, costPrice, stock, is_bundle || 0, base_product_id, bundle_quantity, id];
    
    await pool.query<OkPacket>(sql, values);

    // --- THE FIX: Fetch the newly updated product and return it ---
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE id = ?', [id]);
    const updatedProductFromDb = {
        ...rows[0],
        price: parseFloat(rows[0].price),
        costPrice: parseFloat(rows[0].costPrice),
    };

    res.json(updatedProductFromDb);
  } catch (error: unknown) {
    console.error("Error updating product:", error);
    const dbError = error as { code?: string, sqlMessage?: string };
    if (dbError.code === 'ER_DUP_ENTRY' && dbError.sqlMessage?.includes('barcode')) { 
      return res.status(409).json({ message: 'Error: This barcode is already in use.' }); 
    }
    res.status(500).json({ message: 'Error updating product.' });
  }
};

// No changes needed for deleteProduct
const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Instead of DELETE, we now run an UPDATE to set the product as inactive.
    const [result] = await pool.query<OkPacket>(
      'UPDATE products SET is_active = 0 WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) { 
      return res.status(404).json({ message: 'Product not found.' }); 
    }
    
    // The success message is the same from the user's perspective.
    res.json({ message: 'Product deleted successfully.' });

  } catch (error: unknown) {
    // We no longer need to check for the 'ER_ROW_IS_REFERENCED_2' error,
    // as we are not actually deleting the row.
    console.error("Error soft-deleting product:", error);
    res.status(500).json({ message: 'Error deleting product.' });
  }
};

module.exports = { getAllProducts, createProduct, updateProduct, deleteProduct };