// src/index.ts
require('dotenv').config();
import express, { Express, Request, Response } from 'express';
import cors from 'cors';

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');

const app: Express = express();
const PORT: string | number = process.env.PORT || 3100;

// Use a simple, permissive CORS. The frontend will be on a different port.
app.use(cors());
app.use(express.json());

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);

// A simple root route to confirm the API is running
app.get('/', (req: Request, res: Response) => {
    res.send('POS Backend API is running correctly.');
});

// --- SERVER STARTUP ---
const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to the MariaDB database.');
    connection.release();
    app.listen(PORT, () => {
      console.log(`🚀 Server is listening on port ${PORT}`);
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ FATAL: Could not start server.', err.message);
    process.exit(1);
  }
};

startServer();