import { Request, Response } from 'express';
import { pharmacyStore } from '../services/pharmacyStore.js';
import { forecastingService } from '../services/forecastingService.js';

export async function getPurchaseRequests(req: Request, res: Response): Promise<void> {
  try {
    const { status, medicineId } = req.query;
    
    // Automatically trigger purchase request generation if recommendations exist
    const recommendations = await forecastingService.getReorderRecommendations();
    for (const rec of recommendations) {
      if (rec.suggestedReorderQuantity > 0) {
        await pharmacyStore.generatePurchaseRequestFromRecommendation({
          medicineId: rec.medicineId,
          medicineName: rec.medicineName,
          currentStock: rec.currentUsableStock,
          forecastDemand: rec.forecastedDemand,
          recommendedQuantity: rec.suggestedReorderQuantity,
          priority: rec.urgency,
          reason: rec.reason,
          forecastExplanation: `Current stock is ${rec.currentUsableStock} units, while projected demand is ${rec.forecastedDemand} units. After accounting for safety stock requirement (${rec.safetyBuffer} units), PharmaSync recommends purchasing ${rec.suggestedReorderQuantity} units.`,
        });
      }
    }

    const requests = await pharmacyStore.getAllPurchaseRequests({
      status: status ? String(status) : undefined,
      medicineId: medicineId ? String(medicineId) : undefined,
    });

    res.status(200).json({ status: 'success', data: requests });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch purchase requests.' });
  }
}

export async function generatePurchaseRequests(_req: Request, res: Response): Promise<void> {
  try {
    const recommendations = await forecastingService.getReorderRecommendations();
    const createdList: any[] = [];
    for (const rec of recommendations) {
      if (rec.suggestedReorderQuantity > 0) {
        const pr = await pharmacyStore.generatePurchaseRequestFromRecommendation({
          medicineId: rec.medicineId,
          medicineName: rec.medicineName,
          currentStock: rec.currentUsableStock,
          forecastDemand: rec.forecastedDemand,
          recommendedQuantity: rec.suggestedReorderQuantity,
          priority: rec.urgency,
          reason: rec.reason,
          forecastExplanation: `Current stock is ${rec.currentUsableStock} units, while projected demand is ${rec.forecastedDemand} units. After accounting for safety stock requirement (${rec.safetyBuffer} units), PharmaSync recommends purchasing ${rec.suggestedReorderQuantity} units.`,
        });
        if (pr) createdList.push(pr);
      }
    }

    res.status(200).json({ status: 'success', data: createdList });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to generate purchase requests.' });
  }
}

export async function approvePurchaseRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const result = await pharmacyStore.approvePurchaseRequest(id, approvedBy);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to approve purchase request.' });
  }
}

export async function rejectPurchaseRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      res.status(400).json({ status: 'error', message: 'Rejection reason is required.' });
      return;
    }
    const result = await pharmacyStore.rejectPurchaseRequest(id, rejectionReason);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to reject purchase request.' });
  }
}

export async function getSupplierConversations(_req: Request, res: Response): Promise<void> {
  try {
    const conversations = await pharmacyStore.getSupplierConversations();
    res.status(200).json({ status: 'success', data: conversations });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch supplier conversations.' });
  }
}

export async function getSupplierConversationById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const conversation = await pharmacyStore.getSupplierConversationById(id);
    if (!conversation) {
      res.status(404).json({ status: 'error', message: 'Conversation not found.' });
      return;
    }
    const messages = await pharmacyStore.getSupplierMessages(conversation.id);
    res.status(200).json({ status: 'success', data: { conversation, messages } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch conversation details.' });
  }
}

export async function sendSupplierMessage(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { message, senderType } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ status: 'error', message: 'Message text is required.' });
      return;
    }
    const result = await pharmacyStore.sendSupplierMessage(id, message, senderType || 'supplier');
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to send supplier message.' });
  }
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const { role } = req.query;
    const notifications = await pharmacyStore.getNotifications(role ? String(role) : undefined);
    res.status(200).json({ status: 'success', data: notifications });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch notifications.' });
  }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const success = await pharmacyStore.markNotificationRead(id);
    res.status(200).json({ status: 'success', data: { success } });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update notification.' });
  }
}

export async function getProcurementSummary(_req: Request, res: Response): Promise<void> {
  try {
    const summary = await pharmacyStore.getProcurementSummary();
    res.status(200).json({ status: 'success', data: summary });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch procurement summary.' });
  }
}
