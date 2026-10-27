import { Router } from 'express';
import {
  getPurchaseRequests,
  generatePurchaseRequests,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  getSupplierConversations,
  getSupplierConversationById,
  sendSupplierMessage,
  getNotifications,
  markNotificationRead,
  getProcurementSummary,
} from '../controllers/procurementController.js';

const router = Router();

// Purchase requests endpoints
router.get('/purchase-requests', getPurchaseRequests);
router.post('/purchase-requests/generate', generatePurchaseRequests);
router.post('/purchase-requests/:id/approve', approvePurchaseRequest);
router.post('/purchase-requests/:id/reject', rejectPurchaseRequest);

// Supplier messaging endpoints
router.get('/supplier-conversations', getSupplierConversations);
router.get('/supplier-conversations/:id', getSupplierConversationById);
router.post('/supplier-conversations/:id/messages', sendSupplierMessage);

// Summary & Notification endpoints
router.get('/summary', getProcurementSummary);
router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markNotificationRead);

export default router;
