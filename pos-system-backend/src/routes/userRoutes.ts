// src/routes/userRoutes.ts
import { Router } from 'express';
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const router = Router();

// This middleware will now correctly apply to all routes below
router.use(authenticateToken, isAdmin);

router.get('/', userController.getAllUsers);
router.post('/', authController.register);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;