import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionController.js';

const router = Router();

router.get('/', requireAuth, getSubscriptions);
router.post('/', requireAuth, createSubscription);
router.put('/:id', requireAuth, updateSubscription);
router.delete('/:id', requireAuth, deleteSubscription);

export default router;

