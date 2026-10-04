import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { billOcrService } from '../services/billOcrService.js';
import { pharmacyStore } from '../services/pharmacyStore.js';
import { envConfig } from '../config/env.js';
import { ConfirmBillInput } from '../types/pharmacy.js';

// Multer memory storage configuration for in-memory buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpe?g|png|webp|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload a JPG, PNG, WEBP image or PDF document.'));
    }
  },
});

export const billUploadMiddleware = upload.single('billFile');

/**
 * Scan an uploaded purchase bill (image or PDF) and extract structured medicine inventory data.
 */
export async function scanBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let fileName = 'bill-upload';

    // Check if multipart file was uploaded
    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      fileName = req.file.originalname;
    } else if (req.body && req.body.fileData) {
      // Base64 JSON payload
      const rawData = req.body.fileData as string;
      fileName = (req.body.fileName as string) || 'bill-upload.jpg';

      if (rawData.includes(';base64,')) {
        const parts = rawData.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        fileBuffer = Buffer.from(parts[1], 'base64');
      } else {
        mimeType = (req.body.mimeType as string) || 'image/jpeg';
        fileBuffer = Buffer.from(rawData, 'base64');
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'No purchase bill file was provided. Please upload a JPG, PNG, or PDF bill file.',
      });
      return;
    }

    const extractedData = await billOcrService.extractBillData(fileBuffer, mimeType, fileName);

    res.status(200).json({
      status: 'success',
      message: `Bill scanned successfully. Extracted ${extractedData.items.length} medicine item(s).`,
      data: extractedData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(422).json({
      status: 'error',
      message: err.message || 'Failed to scan and extract data from bill.',
    });
  }
}

/**
 * Confirm and commit reviewed bill data to Supabase PostgreSQL database.
 */
export async function confirmBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as ConfirmBillInput;

    if (!data) {
      res.status(400).json({
        status: 'error',
        message: 'Request body cannot be empty.',
      });
      return;
    }

    if (!data.invoiceNumber || !data.invoiceNumber.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'Invoice / Bill number is required.',
      });
      return;
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'At least one medicine item must be confirmed to save the bill.',
      });
      return;
    }

    const result = await pharmacyStore.confirmBillPurchase(data);

    res.status(201).json({
      status: 'success',
      message: `Bill #${data.invoiceNumber} recorded successfully! Added ${result.newMedicinesCreated.length} new medicine(s), ${result.batchesCreated.length} batch(es), and updated inventory.`,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    const isConflict = err.message.includes('already been recorded') || err.message.includes('Duplicate invoice');
    res.status(isConflict ? 409 : 400).json({
      status: 'error',
      message: err.message || 'Failed to confirm and save bill purchase.',
    });
  }
}

/**
 * Returns OCR / AI service status and configuration guide.
 */
export async function getOcrStatus(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: 'success',
    data: {
      isConfigured: envConfig.isAiOcrConfigured,
      geminiConfigured: Boolean(envConfig.geminiApiKey),
      openaiConfigured: Boolean(envConfig.openaiApiKey),
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxFileSizeMb: 15,
      recommendation: envConfig.isAiOcrConfigured
        ? 'AI Vision Document OCR is active and ready.'
        : 'To enable AI Vision for real-world bill camera photos and scanned PDFs, add GEMINI_API_KEY to backend/.env. Built-in testing parser is available.',
    },
  });
}
