// src/routes/productRoutes.ts
import { Router } from 'express';
const productController = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

const router = Router();
router.get('/', authenticateToken, productController.getAllProducts);
router.post('/', [authenticateToken, isAdmin], productController.createProduct);
router.put('/:id', [authenticateToken, isAdmin], productController.updateProduct);
router.delete('/:id', [authenticateToken, isAdmin], productController.deleteProduct);

module.exports = router;