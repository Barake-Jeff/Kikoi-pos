import { Router } from 'express';
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = Router();
router.post('/', authenticateToken, transactionController.createCompletedTransaction);
router.get('/', authenticateToken, transactionController.getCompletedTransactions);
router.post('/hold', authenticateToken, transactionController.createPendingTransaction);
router.get('/pending', authenticateToken, transactionController.getPendingTransactions);
router.post('/pending/:id/complete', authenticateToken, transactionController.completePendingTransaction);
router.put('/:id/cancel', authenticateToken, transactionController.cancelCompletedTransaction);
router.delete('/pending/:id', authenticateToken, transactionController.deletePendingTransaction);

module.exports = router;