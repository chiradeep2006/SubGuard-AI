import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getTransactions,
  uploadTransactionsCSV
} from '../controllers/transactionController.js';

const router = Router();

router.get('/', requireAuth, getTransactions);
router.post('/csv', requireAuth, uploadTransactionsCSV);

export default router;

