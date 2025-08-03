// src/controllers/userController.ts
import { Request, Response } from 'express';
import { OkPacket, RowDataPacket, Pool } from 'mysql2/promise';
const pool: Pool = require('../config/db');

// GET /api/users
const getAllUsers = async (req: Request, res: Response) => {
    console.log('[CONTROLLER - getAllUsers] Function called.');
    try {
        // Exclude password_hash from the query for security
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, role, created_at FROM users  WHERE is_active = 1 ORDER BY username ASC');
        console.log(`[CONTROLLER - getAllUsers] Found ${rows.length} users.`);
        res.json(rows);
    } catch (error) {
        console.error("[CONTROLLER - getAllUsers] Error:", error);
        res.status(500).json({ message: "Error fetching users." });
    }
};

// PUT /api/users/:id
const updateUser = async (req: Request, res: Response) => {
    console.log(`[CONTROLLER - updateUser] Function called for user ID: ${req.params.id}`);
    const { id } = req.params;
    const { username, role } = req.body;

    if (!username || !role) {
        return res.status(400).json({ message: "Username and role are required." });
    }
    
    if (!['admin', 'user', 'intermediary'].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified." });
    }

    try {
        const [result] = await pool.query<OkPacket>(
            'UPDATE users SET username = ?, role = ? WHERE id = ?',
            [username, role, id]
        );
        if (result.affectedRows === 0) {
            console.log(`[CONTROLLER - updateUser] Successfully updated user ID: ${id}`);
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User updated successfully.' });
    } catch (error: unknown) {
        const dbError = error as { code?: string };
        if (dbError.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'This username is already taken.' });
        }
        console.error("Error updating user:", error);
        res.status(500).json({ message: 'Error updating user.' });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req: Request, res: Response) => {
    console.log(`[CONTROLLER - deleteUser] Function called for user ID: ${req.params.id}`);
    const { id } = req.params;
    console.log(`[CONTROLLER - deleteUser] Attempting to delete user ID: ${id}`);
    
    // Basic protection to prevent deleting the primary admin (user with id 1)
    if (id === '1') {
        return res.status(403).json({ message: "Cannot delete the primary admin user." });
    }
    try {
        const [result] = await pool.query<OkPacket>('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
        console.log(`[CONTROLLER - deleteUser] Result of deletion query:`, result);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        console.log(`[CONTROLLER - deleteUser] Successfully deleted user ID: ${id}`);
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: 'Error deleting user.' });
    }
};

module.exports = { getAllUsers, updateUser, deleteUser };