import os
import sys
import time
from datetime import datetime
import json
import logging
import numpy as np

# Suppress verbose paddle logging
os.environ['GLOG_minloglevel'] = '2'
os.environ['FLAGS_call_stack_level'] = '0'

def _ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

def _log(msg: str):
    print(f"[{_ts()}] [PaddleOCR] {msg}", file=sys.stderr, flush=True)

# Patch oneDNN CPU runtime bug in PaddlePaddle 3.3.1 before importing PaddleOCR
import paddle.inference as paddle_inf
_orig_create_predictor = paddle_inf.create_predictor

def _patched_create_predictor(cfg):
    if hasattr(cfg, 'disable_onednn'):
        cfg.disable_onednn()
    if hasattr(cfg, 'disable_mkldnn'):
        cfg.disable_mkldnn()
    return _orig_create_predictor(cfg)

paddle_inf.create_predictor = _patched_create_predictor

from paddleocr import PaddleOCR
from ocr_service.pdf_handler import load_document_images
from ocr_service.parser import InvoiceParser, normalize_box

_OCR_INSTANCE = None

def get_ocr_instance() -> PaddleOCR:
    global _OCR_INSTANCE
    if _OCR_INSTANCE is None:
        _log("Initializing PaddleOCR instance & checking local models...")
        t0 = time.perf_counter()
        _OCR_INSTANCE = PaddleOCR()
        t_init_ms = (time.perf_counter() - t0) * 1000
        _log(f"PaddleOCR initialized successfully in {t_init_ms:.2f}ms")

        # Instrument internal pipeline models to log detection and recognition durations
        try:
            pipeline = _OCR_INSTANCE.paddlex_pipeline._pipeline
            orig_det = pipeline.text_det_model
            orig_rec = pipeline.text_rec_model

            def timed_det(*args, **kwargs):
                t_det_start = time.perf_counter()
                det_out = orig_det(*args, **kwargs)
                res_list = list(det_out)
                t_det_ms = (time.perf_counter() - t_det_start) * 1000
                total_polys = sum(len(item.get("dt_polys", [])) for item in res_list)
                _log(f"Text detection completed: {total_polys} bounding box(es) detected in {t_det_ms:.2f}ms ({t_det_ms/1000:.2f}s)")
                return res_list

            def timed_rec(*args, **kwargs):
                t_rec_start = time.perf_counter()
                rec_out = orig_rec(*args, **kwargs)
                res_list = list(rec_out)
                t_rec_ms = (time.perf_counter() - t_rec_start) * 1000
                _log(f"Text recognition completed: {len(res_list)} text line(s) recognized in {t_rec_ms:.2f}ms ({t_rec_ms/1000:.2f}s)")
                return res_list

            pipeline.text_det_model = timed_det
            pipeline.text_rec_model = timed_rec
        except Exception as e:
            _log(f"Notice: Could not instrument internal pipeline hooks: {e}")

    return _OCR_INSTANCE

def process_document(file_path: str) -> dict:
    """
    Processes an image or PDF pharmacy bill using PaddleOCR
    and deterministically parses extracted text into structured fields.
    """
    t_req_start = time.perf_counter()
    _log(f"OCR service request received for document: '{os.path.basename(file_path)}'")

    if not os.path.exists(file_path):
        _log(f"Error: File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")

    # 1. Load document page images
    images = load_document_images(file_path)
    if not images:
        _log("Error: Document loader returned 0 images")
        raise ValueError("Could not extract any image pages from document.")

    _log(f"Document contains {len(images)} page(s) ready for inference")

    ocr = get_ocr_instance()
    all_extracted_items = []

    # 2. Run OCR on each page
    for page_idx, img in enumerate(images):
        _log(f"Processing page {page_idx + 1}/{len(images)} (Dimensions: {img.size[0]}x{img.size[1]}, Mode: {img.mode})")
        t_page_start = time.perf_counter()
        np_img = np.array(img)
        
        # PaddleOCR predict accepts numpy ndarray (RGB/BGR)
        results = list(ocr.predict(np_img))
        t_page_ms = (time.perf_counter() - t_page_start) * 1000
        
        page_items = 0
        for res in results:
            texts = res.get('rec_texts', [])
            scores = res.get('rec_scores', [])
            boxes = res.get('rec_boxes', [])
            if boxes is None or len(boxes) == 0:
                boxes = res.get('dt_polys', [])

            for i in range(len(texts)):
                text = str(texts[i]).strip()
                if not text:
                    continue
                
                score = float(scores[i]) if i < len(scores) else 0.8
                
                raw_box = boxes[i] if i < len(boxes) else [0, 0, 0, 0]
                box = normalize_box(raw_box)

                all_extracted_items.append({
                    'text': text,
                    'confidence': score,
                    'box': box,
                    'page': page_idx + 1
                })
                page_items += 1

        _log(f"Page {page_idx + 1} inference finished in {t_page_ms:.2f}ms ({t_page_ms/1000:.2f}s) - Extracted {page_items} text tokens")

    _log(f"All {len(images)} page(s) processed. Total extracted tokens: {len(all_extracted_items)}")

    if not all_extracted_items:
        _log("Warning: No readable text detected on document")
        return {
            'supplierName': None,
            'invoiceNumber': None,
            'invoiceDate': None,
            'totalAmount': None,
            'items': [],
            'confidence': 'low',
            'aiProviderUsed': 'paddleocr-local',
            'warnings': ['OCR could not detect any readable text on the uploaded document.'],
        }

    # 3. Deterministic parsing
    t_parse_start = time.perf_counter()
    _log(f"Starting deterministic invoice parser on {len(all_extracted_items)} tokens...")
    parser = InvoiceParser(all_extracted_items)
    parsed_invoice = parser.parse()
    t_parse_ms = (time.perf_counter() - t_parse_start) * 1000
    _log(f"Invoice parser completed in {t_parse_ms:.2f}ms (Identified {len(parsed_invoice.get('items', []))} invoice line item(s))")

    total_proc_ms = (time.perf_counter() - t_req_start) * 1000
    _log(f"Full document processing pipeline finished in {total_proc_ms:.2f}ms ({total_proc_ms/1000:.2f}s)")
    return parsed_invoice

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python -m ocr_service.engine <file_path>",
            "success": False
        }), file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    _log(f"OCR engine CLI invoked (PID: {os.getpid()})")

    try:
        result = process_document(file_path)
        
        # Serialize JSON
        t_ser_start = time.perf_counter()
        json_output = json.dumps(result, indent=2)
        t_ser_ms = (time.perf_counter() - t_ser_start) * 1000
        _log(f"OCR result serialization completed in {t_ser_ms:.2f}ms (Payload size: {len(json_output)} bytes)")
        
        # Print valid JSON to stdout for Node.js caller
        print(json_output)
        sys.exit(0)
    except Exception as e:
        _log(f"Fatal error during document processing: {str(e)}")
        error_payload = {
            "error": str(e),
            "success": False
        }
        print(json.dumps(error_payload), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
