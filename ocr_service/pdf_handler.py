import os
import sys
import time
from datetime import datetime
from typing import List, Tuple
from PIL import Image
import pypdfium2 as pdfium

def _ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

def _log(msg: str):
    print(f"[{_ts()}] [DocLoader] {msg}", file=sys.stderr, flush=True)

def load_document_images(file_path: str) -> List[Image.Image]:
    """
    Loads an uploaded file (JPG, PNG, WebP, or multi-page PDF)
    and converts it into a list of PIL Image objects for OCR processing.
    """
    if not os.path.exists(file_path):
        _log(f"Error: File does not exist: {os.path.basename(file_path)}")
        raise FileNotFoundError(f"Document file does not exist: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    file_size_kb = os.path.getsize(file_path) / 1024.0
    _log(f"Loading document '{os.path.basename(file_path)}' (Format: {ext}, Size: {file_size_kb:.1f} KB)")
    t0 = time.perf_counter()
    images: List[Image.Image] = []

    if ext == '.pdf':
        try:
            pdf = pdfium.PdfDocument(file_path)
            num_pages = len(pdf)
            _log(f"PDF opened successfully. Page count: {num_pages}")
            if num_pages == 0:
                raise ValueError("PDF document contains no pages.")
            
            # Render each page at 200 DPI for high-accuracy OCR
            for i in range(num_pages):
                t_page_start = time.perf_counter()
                page = pdf[i]
                # Scale 2.77 corresponds to ~200 DPI (72 * 2.77 ≈ 200)
                bitmap = page.render(scale=2.77)
                pil_image = bitmap.to_pil()
                images.append(pil_image)
                t_page_ms = (time.perf_counter() - t_page_start) * 1000
                _log(f"Rasterized PDF page {i+1}/{num_pages}: dimensions={pil_image.size[0]}x{pil_image.size[1]} in {t_page_ms:.2f}ms")
            
            total_raster_ms = (time.perf_counter() - t0) * 1000
            _log(f"Completed rasterization of {num_pages} PDF page(s) in {total_raster_ms:.2f}ms")
        except Exception as e:
            _log(f"PDF rasterization error: {str(e)}")
            raise ValueError(f"Could not read or render PDF document: {str(e)}")
    elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']:
        try:
            img = Image.open(file_path)
            img.load()
            orig_mode = img.mode
            orig_size = img.size
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
            t_img_ms = (time.perf_counter() - t0) * 1000
            _log(f"Image preprocessed: dimensions={orig_size[0]}x{orig_size[1]}, mode={orig_mode}->RGB in {t_img_ms:.2f}ms")
        except Exception as e:
            _log(f"Image load error: {str(e)}")
            raise ValueError(f"Invalid or corrupted image file: {str(e)}")
    else:
        _log(f"Unsupported document format: {ext}")
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: JPG, PNG, WEBP, PDF.")

    return images
