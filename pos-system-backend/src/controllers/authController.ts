import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OkPacket, RowDataPacket } from 'mysql2';
import { Pool } from 'mysql2/promise';
const pool: Pool = require('../config/db');

const saltRounds = 10;
const secret = process.env.JWT_SECRET;

const createToken = (payload: object): string => {
    if (!secret) { throw new Error('JWT_SECRET is not defined.'); }
    try{
        const token = jwt.sign(payload, secret as string, { expiresIn: '2d' });
        console.log('Token created successfully');
        return token;
    } catch (error) {
        console.error('Error creating token:', error);
        throw Error;
    }
}

const register = async (req: Request, res: Response) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await pool.query<OkPacket>('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        // Fetch the newly created user
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, role FROM users WHERE id = ?', [result.insertId]);
        const user = rows[0];
        const payload = { id: user.id, username: user.username, role: user.role };
        const token = createToken(payload);
        res.status(201).json({ message: 'User registered!', token, user });
    } catch (error) {
        const dbError = error as { code?: string };
        if (dbError.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        res.status(500).json({ message: 'Error registering user.' });
    }
};

const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = { id: user.id, username: user.username, role: user.role };
        
        // add createToken function call
        const token = createToken(payload);

        res.json({ message: 'Login successful!', token, user: payload });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in.' });
    }
};

module.exports = { register, login };