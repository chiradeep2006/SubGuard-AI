import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getFinancialSummary,
  getAnomalies,
  getRecommendations,
  refreshInsights
} from '../controllers/insightsController.js';

const router = Router();

router.get('/summary', requireAuth, getFinancialSummary);
router.get('/anomalies', requireAuth, getAnomalies);
router.get('/recommendations', requireAuth, getRecommendations);
router.post('/refresh', requireAuth, refreshInsights);

export default router;

