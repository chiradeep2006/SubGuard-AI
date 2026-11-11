import { Router } from 'express';
import authRoutes from './authRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import aiRoutes from './aiRoutes.js';
import insightsRoutes from './insightsRoutes.js';
import paypalRoutes from './paypalRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/transactions', transactionRoutes);
router.use('/ai', aiRoutes);
router.use('/assistant', aiRoutes);
router.use('/insights', insightsRoutes);
router.use('/paypal', paypalRoutes);

export default router;

