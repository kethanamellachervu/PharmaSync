import {
  PurchaseRequest,
  SupplierConversation,
  SupplierMessage,
  ExtractedOrderDetails,
} from '../types/pharmacy.js';

export class SupplierAgentService {
  /**
   * Generates initial order request message to supplier for an approved purchase request.
   */
  public generateOrderMessage(request: PurchaseRequest): string {
    return `Hello ${request.supplierName},

PharmaSync would like to place a stock replenishment order for:

${request.medicineName} — ${request.recommendedQuantity} units

Please confirm availability, unit price, and expected delivery date.

— PharmaSync Procurement Assistant`;
  }

  /**
   * Parses text from supplier response to extract structured quantity, price, total, and delivery info.
   */
  public extractOrderDetails(text: string, requestedQuantity: number): ExtractedOrderDetails {
    const textLower = text.toLowerCase();
    const result: ExtractedOrderDetails = {
      missingFields: [],
    };

    // 1. Extract Unit Price (e.g., ₹4.50, rs. 4.50, rs 4.50, 4.50 per unit, @ 4.50)
    const priceRegexes = [
      /(?:₹|rs\.?|inr)\s*([\d]+(?:\.[\d]{1,2})?)/i,
      /([\d]+(?:\.[\d]{1,2})?)\s*(?:per|\/)\s*(?:unit|tablet|strip|capsule|box|pack)/i,
      /@\s*([\d]+(?:\.[\d]{1,2})?)/i,
      /price\s*(?:is|of)?\s*(?:₹|rs\.?|inr)?\s*([\d]+(?:\.[\d]{1,2})?)/i,
    ];

    for (const regex of priceRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const parsedPrice = parseFloat(match[1]);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          result.unitPrice = parsedPrice;
          break;
        }
      }
    }

    // 2. Extract Delivery Time (e.g. in 2 days, 2 days, tomorrow, 24 hours, 1 week)
    const deliveryRegexes = [
      /(?:deliver(?:y|ed)?|dispatch(?:ed)?|ship(?:ped)?|reach(?:es)?|within|in)\s*(?:in\s*)?(\d+\s*(?:days?|hrs?|hours?|weeks?|business days?)|tomorrow|today)/i,
      /(\d+\s*(?:days?|hrs?|hours?|weeks?))\s*(?:delivery|time)/i,
    ];

    for (const regex of deliveryRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        result.expectedDelivery = match[1].trim();
        break;
      }
    }
    if (!result.expectedDelivery) {
      if (textLower.includes('tomorrow')) result.expectedDelivery = 'Tomorrow';
      else if (textLower.includes('today')) result.expectedDelivery = 'Today';
    }

    // 3. Extract Quantity available
    const qtyRegexes = [
      /(\d+)\s*(?:units|tablets|capsules|strips|pcs|boxes|packs)\s*(?:are\s*)?(?:available|in stock|ready)/i,
      /(?:have|stock|available|deliver)\s*(\d+)\s*(?:units|tablets|capsules|strips|pcs|boxes|packs)?/i,
      /(\d+)\s*available/i,
    ];

    let foundQty: number | undefined;
    for (const regex of qtyRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const q = parseInt(match[1], 10);
        if (!isNaN(q) && q > 0) {
          foundQty = q;
          break;
        }
      }
    }

    // Fallback: If supplier says "Yes, available" or similar without stating a lower number, assume requested quantity
    if (foundQty === undefined) {
      if (
        textLower.includes('yes') ||
        textLower.includes('available') ||
        textLower.includes('can supply') ||
        textLower.includes('confirm')
      ) {
        foundQty = requestedQuantity;
      }
    }

    if (foundQty !== undefined) {
      result.availableQuantity = foundQty;
    }

    // Calculate Total Price if quantity and unit price are available
    if (result.unitPrice !== undefined) {
      const qtyToUse = result.availableQuantity || requestedQuantity;
      result.totalPrice = Math.round(qtyToUse * result.unitPrice * 100) / 100;
    }

    const missingFields: string[] = [];
    if (result.availableQuantity === undefined) {
      missingFields.push('available quantity');
    }
    if (result.unitPrice === undefined) {
      missingFields.push('unit price');
    }
    if (!result.expectedDelivery) {
      missingFields.push('expected delivery date');
    }
    result.missingFields = missingFields;

    // Fully confirmed if quantity >= requested, unit price present, and delivery date present
    result.isConfirmed =
      missingFields.length === 0 &&
      (result.availableQuantity || 0) >= requestedQuantity;

    return result;
  }

  /**
   * Generates AI follow-up message when information is missing or stock is partial.
   */
  public generateFollowUp(
    extracted: ExtractedOrderDetails,
    requestedQuantity: number,
    medicineName: string
  ): { followUpMessage: string; requiresFollowUp: boolean } {
    const availableQty = extracted.availableQuantity ?? 0;
    const isPartialStock = availableQty > 0 && availableQty < requestedQuantity;
    const hasMissingInfo = extracted.missingFields && extracted.missingFields.length > 0;

    if (isPartialStock) {
      const remaining = requestedQuantity - availableQty;
      let msg = `The requested quantity is ${requestedQuantity} units. Please confirm whether the remaining ${remaining} units can be supplied later and provide the expected delivery date.`;
      if (!extracted.unitPrice) {
        msg += ` Also, please state the unit price for the ${medicineName}.`;
      }
      return { followUpMessage: msg, requiresFollowUp: true };
    }

    if (hasMissingInfo) {
      const missingList = extracted.missingFields!.join(' and ');
      const msg = `Thank you. Please confirm the ${missingList} for ${requestedQuantity} units of ${medicineName}.`;
      return { followUpMessage: msg, requiresFollowUp: true };
    }

    return { followUpMessage: '', requiresFollowUp: false };
  }

  /**
   * Formats structured ORDER DETAILS block when order is confirmed.
   */
  public formatOrderConfirmationSummary(
    extracted: ExtractedOrderDetails,
    requestedQuantity: number
  ): string {
    const qty = extracted.availableQuantity || requestedQuantity;
    const unitPrice = extracted.unitPrice ? `₹${extracted.unitPrice.toFixed(2)}` : 'N/A';
    const totalPrice = extracted.totalPrice ? `₹${extracted.totalPrice.toFixed(2)}` : 'N/A';
    const delivery = extracted.expectedDelivery || 'Standard Delivery';

    return `ORDER DETAILS

✓ Quantity: ${qty}
✓ Unit Price: ${unitPrice}
✓ Total: ${totalPrice}
✓ Expected Delivery: ${delivery}

Supplier Status: CONFIRMED`;
  }
}

export const supplierAgentService = new SupplierAgentService();
