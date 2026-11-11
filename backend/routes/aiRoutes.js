import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getAnalysis,
  chatAssistant,
  executeAction,
  getHealth,
  listConversationsEndpoint,
  createConversationEndpoint,
  getConversationEndpoint,
  deleteConversationEndpoint,
  clearConversationEndpoint
} from '../controllers/aiController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/analysis', requireAuth, getAnalysis);
router.post('/chat', requireAuth, chatAssistant);
router.post('/execute-action', requireAuth, executeAction);

// Multi-user Conversation Management
router.get('/conversations', requireAuth, listConversationsEndpoint);
router.post('/conversations', requireAuth, createConversationEndpoint);
router.get('/conversations/:id', requireAuth, getConversationEndpoint);
router.delete('/conversations/:id', requireAuth, deleteConversationEndpoint);
router.post('/conversations/:id/clear', requireAuth, clearConversationEndpoint);

export default router;
