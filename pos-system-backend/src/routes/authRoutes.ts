// src/routes/authRoutes.ts
import { Router } from 'express';
const authController = require('../controllers/authController');

const router = Router();
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;