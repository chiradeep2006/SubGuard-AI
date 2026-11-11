import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  createOrder,
  captureOrder,
  handleWebhook
} from '../controllers/paypalController.js';

const router = Router();

router.post('/create-order', requireAuth, createOrder);
router.post('/capture-order', requireAuth, captureOrder);
router.post('/webhook', handleWebhook);

export default router;

