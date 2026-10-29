import re
import calendar
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

COMMON_DRUG_CATEGORIES = {
    'Antibiotics': ['cillin', 'mycin', 'oxacin', 'cef', 'cyclin', 'amox', 'clav', 'doxy', 'azithro', 'metronidazole'],
    'Analgesics': ['paracetamol', 'ibuprofen', 'diclofenac', 'aspirin', 'tramadol', 'aceclofenac', 'mefenamic', 'pcm'],
    'Antidiabetics': ['metformin', 'glimepiride', 'insulin', 'glipizide', 'vildagliptin', 'dapagliflozin', 'sitagliptin'],
    'Antihistamines': ['cetirizine', 'loratadine', 'fexofenadine', 'chlorpheniramine', 'levocetirizine', 'montelukast'],
    'Cardiovascular': ['amlodipine', 'losartan', 'telmisartan', 'atenolol', 'atorvastatin', 'rosuvastatin', 'ramipril'],
    'Gastrointestinal': ['prazole', 'pantoprazole', 'omeprazole', 'rabeprazole', 'ranitidine', 'antacid', 'domperidone'],
    'Respiratory': ['salbutamol', 'budesonide', 'cough', 'dextromethorphan', 'ambroxol', 'terbutaline'],
    'Vitamins': ['vitamin', 'calcium', 'zinc', 'iron', 'folic', 'b-complex', 'multivitamin', 'd3', 'b12'],
}

DOSAGE_FORMS = {
    'tablets': ['tab', 'tablet', 'tablets'],
    'capsules': ['cap', 'capsule', 'capsules'],
    'syrups': ['syr', 'syrup', 'susp', 'suspension', 'liquid', 'solution'],
    'injections': ['inj', 'injection', 'vial', 'ampoule'],
    'drops': ['drop', 'drops', 'eye drops', 'ear drops'],
    'tubes': ['gel', 'ointment', 'cream', 'tube'],
    'bottles': ['bottle', 'btl', 'spray'],
    'strips': ['strip', 'strips'],
}

def infer_category(medicine_name: str) -> str:
    if not medicine_name:
        return 'General'
    name_lower = medicine_name.lower()
    for cat, keywords in COMMON_DRUG_CATEGORIES.items():
        for kw in keywords:
            if kw in name_lower:
                return cat
    return 'General'

def infer_unit(medicine_name: str) -> str:
    if not medicine_name:
        return 'tablets'
    name_lower = medicine_name.lower()
    for unit, forms in DOSAGE_FORMS.items():
        for f in forms:
            if re.search(r'\b' + re.escape(f) + r'\b', name_lower):
                return unit
    return 'tablets'

def normalize_date(raw_date: Optional[str]) -> Optional[str]:
    """
    Deterministically normalizes dates to YYYY-MM-DD.
    For MM/YY or MM-YY (e.g. 08/26, 12/28), sets day to the last day of that month.
    """
    if not raw_date:
        return None
    raw = raw_date.strip().replace('.', '/').replace('-', '/')

    # Already YYYY-MM-DD
    iso_match = re.match(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$', raw)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # DD/MM/YYYY or D/M/YY
    dmy_match = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', raw)
    if dmy_match:
        d, m, y_str = int(dmy_match.group(1)), int(dmy_match.group(2)), dmy_match.group(3)
        y = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
        if 1 <= m <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{m:02d}-{d:02d}"

    # MM/YY or MM/YYYY (typical on medicine blister packs and pharma invoices)
    my_match = re.match(r'^(\d{1,2})/(\d{2,4})$', raw)
    if my_match:
        m, y_str = int(my_match.group(1)), my_match.group(2)
        y = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
        if 1 <= m <= 12:
            last_day = calendar.monthrange(y, m)[1]
            return f"{y:04d}-{m:02d}-{last_day:02d}"

    # Mon-YYYY or Mon-YY (e.g. Aug-26, Dec-2028)
    month_names = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    mon_match = re.match(r'^([a-zA-Z]{3})[/ -](\d{2,4})$', raw)
    if mon_match:
        mon_str, y_str = mon_match.group(1).lower(), mon_match.group(2)
        if mon_str in month_names:
            m = month_names[mon_str]
            y = int(y_str) if len(y_str) == 4 else 2000 + int(y_str)
            last_day = calendar.monthrange(y, m)[1]
            return f"{y:04d}-{m:02d}-{last_day:02d}"

    return None

def normalize_box(raw_box: Any) -> List[float]:
    """
    Normalizes any bounding box (polygon [[x,y],...], flat 8-point, or 4-point [x1,y1,x2,y2])
    into [x_min, y_min, x_max, y_max].
    """
    if raw_box is None:
        return [0.0, 0.0, 0.0, 0.0]
    if hasattr(raw_box, 'tolist'):
        raw_box = raw_box.tolist()
    if isinstance(raw_box, (list, tuple)):
        if len(raw_box) == 4:
            if isinstance(raw_box[0], (list, tuple)):
                xs = [float(p[0]) for p in raw_box]
                ys = [float(p[1]) for p in raw_box]
                return [min(xs), min(ys), max(xs), max(ys)]
            return [float(raw_box[0]), float(raw_box[1]), float(raw_box[2]), float(raw_box[3])]
        elif len(raw_box) == 8:
            xs = [float(raw_box[i]) for i in range(0, 8, 2)]
            ys = [float(raw_box[i]) for i in range(1, 8, 2)]
            return [min(xs), min(ys), max(xs), max(ys)]
        elif len(raw_box) > 0 and isinstance(raw_box[0], (list, tuple)):
            xs = [float(p[0]) for p in raw_box]
            ys = [float(p[1]) for p in raw_box]
            return [min(xs), min(ys), max(xs), max(ys)]
    return [0.0, 0.0, 0.0, 0.0]

def is_valid_number(val: Any) -> bool:
    """
    Checks if a value is a valid strictly positive number (int or float).
    Prevents None, bool, or zero/negative values from passing to arithmetic operations.
    """
    if val is None or isinstance(val, bool):
        return False
    if isinstance(val, (int, float)):
        return val > 0
    return False

HEADER_PATTERNS = {
    's_no': [
        r'^s\.?\s*no\.?$', r'^sl\.?\s*no\.?$', r'^sr\.?\s*no\.?$', r'^item\s*no\.?$',
        r'^s\.?\s*n\.?$', r'^#$', r'^sno\.?$', r'^sr\.?$'
    ],
    'medicine_name': [
        r'^medicine(\s*(?:name|desc(?:ription)?))?$', r'^item(\s*(?:name|desc(?:ription)?))?$', r'^product(\s*name)?$',
        r'^description$', r'^particulars$', r'^drug(\s*name)?$', r'^item$', r'^product$'
    ],
    'batch_number': [
        r'^batch(\s*no\.?)?$', r'^b\.?\s*no\.?$', r'^lot(\s*no\.?)?$', r'^batch\s*#$', r'^bno\.?$'
    ],
    'expiry_date': [
        r'^exp(iry)?(\s*date|\s*dt\.?)?$', r'^validity$', r'^exp\.?$', r'^exp\s*dt\.?$'
    ],
    'unit': [
        r'^unit$', r'^uom$', r'^pack(ing)?$', r'^type$'
    ],
    'quantity': [
        r'^q(uan)?t(it)?y\.?$', r'^qnty\.?$', r'^qty$', r'^packs?$', r'^units$', r'^pcs$', r'^bil(led)?\s*qty$'
    ],
    'purchase_price': [
        r'^rate(\s*\/.*)?$', r'^p(ur)?\.?\s*rate$', r'^price$', r'^purchase\s*price$',
        r'^cost$', r'^unit\s*price$', r'^rate\s*\(.*\)$', r'^p\.?\s*price$', r'^pur\s*price$'
    ],
    'line_amount': [
        r'^amount(\s*\(.*\))?$', r'^amt(\s*\(.*\))?$', r'^net\s*amount$', r'^line\s*amount$',
        r'^line\s*total$', r'^total(\s*\(.*\))?$', r'^value$'
    ],
    'mrp': [
        r'^m\.?r\.?p\.?$', r'^max\s*retail\s*price$'
    ],
    'hsn_code': [
        r'^hsn(\s*code|\s*\/sac)?$', r'^sac(\s*code)?$'
    ],
    'discount': [
        r'^disc(\s*%)?$', r'^discount(\s*%)?$', r'^dis(\s*%)?$'
    ],
    'tax': [
        r'^(c|s|i)?gst(\s*%)?$', r'^tax(\s*%)?$', r'^vat(\s*%)?$'
    ],
}

def classify_header_text(text: str) -> Optional[str]:
    cleaned = re.sub(r'[^\w\s.#/\-()]', '', text.strip().lower())
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    if not cleaned:
        return None

    # Check patterns
    for col_type, patterns in HEADER_PATTERNS.items():
        for pat in patterns:
            if re.match(pat, cleaned, re.IGNORECASE):
                return col_type

    return None

VALID_COMPOUND_HEADER_PHRASES = {
    's no', 's.no', 'sl no', 'sl.no', 'sr no', 'sr.no', 'item no',
    'medicine name', 'medicine desc', 'medicine description', 'item name', 'product name', 'item desc', 'item description',
    'batch no', 'batch no.', 'batch number', 'b no', 'b.no', 'lot no',
    'exp date', 'expiry date', 'exp dt', 'expiry dt',
    'unit rate', 'rate unit', 'unit price', 'purchase rate', 'pur rate', 'purchase price',
    'line amount', 'net amount', 'line total', 'total amount', 'total value',
    'billed qty', 'order qty', 'pack qty',
}

FOOTER_SUMMARY_PATTERNS = [
    r'\b(?:sub\s*total|subtotal|sub-total)\b',
    r'\b(?:grand\s*total|total\s*amount|total\s*qty|total\s*items|total\s*value|net\s*amount|amount\s*payable|round\s*off|balance)\b',
    r'\b(?:cgst|sgst|igst|gst|tax\s*amount|taxable\s*value|taxable\s*amount|vat|cess)\b',
    r'\b(?:amount\s+in\s+words|rupees\s+in\s+words|in\s+words)\b',
    r'\b(?:terms?\s*(?:&|and)\s*conditions?|terms?\s*:|conditions?\s*:|t&c)\b',
    r'\b(?:goods\s+once\s+sold|interest\s+@|subject\s+to\s+.*jurisdiction|certified\s+that)\b',
    r'\b(?:declaration|notes?\s*:|remarks?\s*:|e\.?&o\.?e\.?)\b',
    r'\b(?:authorized\s+signator(?:y|ies)|authorised\s+signator(?:y|ies)|signature|receiver\'?s?\s*signature)\b',
    r'\b(?:bank\s+details|bank\s+name|a\/c\s+no|ifsc\s+code|account\s+no)\b',
    r'^(?:\d+[.)]\s*)?(?:goods\s+once\s+sold|subject\s+to|interest\s+@|payment\s+terms|all\s+disputes)',
    r'\bfor\s+[a-z0-9\s.,]+(?:ltd|pvt|distributors|agencies|pharma)',
]

def is_footer_or_summary_text(text: str) -> bool:
    """Detects if text belongs to invoice footer, summary, GST, terms, bank details, or signatures."""
    if not text:
        return False
    cleaned = text.strip().lower()
    for pat in FOOTER_SUMMARY_PATTERNS:
        if re.search(pat, cleaned):
            return True
    return False

BATCH_STOP_WORDS = {
    'NOT', 'WILL', 'BE', 'TAKEN', 'BACK', 'SOLD', 'ONCE', 'GOODS', 'TERMS', 'CONDITIONS',
    'TOTAL', 'SUBTOTAL', 'AMOUNT', 'PRICE', 'RATE', 'UNIT', 'STRIPS', 'TABLETS', 'CAPSULES',
    'DAYS', 'INTEREST', 'SUBJECT', 'DATE', 'EXPIRY', 'BATCH', 'SIGNATURE', 'FOR', 'RUPEES',
    'WORDS', 'ONLY', 'PAID', 'DUE', 'BANK', 'CHECK', 'RETURNED', 'EXCHANGED', 'TAX', 'GST'
}

def is_valid_batch_code(text: str) -> bool:
    """
    Validates pharmaceutical batch number.
    Rejects English words, phrases with spaces, dates, pure numbers, and invoice boilerplate.
    """
    if not text:
        return False
    clean = text.strip().upper()
    if ' ' in clean or len(clean) < 2 or len(clean) > 20:
        return False
    if re.match(r'^\d+$', clean):
        return False
    if normalize_date(clean):
        return False
    if clean in BATCH_STOP_WORDS:
        return False
    if not re.match(r'^[A-Z0-9\-_/]+$', clean):
        return False
    return True

class InvoiceParser:
    """
    Deterministic rule-based pharmaceutical invoice parser that converts
    PaddleOCR text lines and bounding boxes into structured bill fields.
    Uses robust column boundary mapping and layout geometry to prevent
    S.No. or Rate from corrupting Quantity or Amount.
    """

    def __init__(self, ocr_items: List[Dict[str, Any]]):
        """
        ocr_items: list of dicts with 'text', 'confidence', 'box'
        """
        self.raw_items = []
        for it in ocr_items:
            norm_b = normalize_box(it.get('box'))
            self.raw_items.append({
                'text': str(it.get('text', '')).strip(),
                'confidence': float(it.get('confidence', 0.8)),
                'box': norm_b,
                'page': it.get('page', 1)
            })

        # Sort items primarily top-to-bottom (y_min), then left-to-right (x_min)
        self.sorted_items = sorted(self.raw_items, key=lambda it: (it['box'][1], it['box'][0]))

    def parse(self) -> Dict[str, Any]:
        self.supplier_name = self._extract_supplier()
        self.invoice_number = self._extract_invoice_number()
        invoice_date = self._extract_invoice_date()
        total_amount = self._extract_total_amount()
        items = self._extract_items()

        # Compute line items subtotal
        computed_totals = []
        for it in items:
            line_amt = it.get('lineAmount')
            if is_valid_number(line_amt):
                computed_totals.append(float(line_amt))
            else:
                qty = it.get('quantity')
                price = it.get('purchasePrice')
                if is_valid_number(qty) and is_valid_number(price):
                    computed_totals.append(round(float(qty) * float(price), 2))
        computed_subtotal = round(sum(computed_totals), 2) if computed_totals else 0.0

        # If total amount wasn't explicitly found, compute from line items safely
        if total_amount is None and computed_totals:
            total_amount = computed_subtotal

        # Audit overall confidence
        confidence = 'high'
        missing_count = sum(len(it.get('missingFields', [])) for it in items)
        unverified_count = sum(1 for it in items if it.get('needsVerification', False))

        if not items:
            confidence = 'low'
        elif unverified_count > 0 or missing_count > len(items):
            confidence = 'medium'
        elif missing_count > 0:
            confidence = 'medium'

        warnings = []
        if not items:
            warnings.append('No medicine line items could be detected on the document.')

        # Separately verify invoice totals vs line items (Requirement 8)
        if total_amount is not None and computed_subtotal > 0:
            diff = abs(total_amount - computed_subtotal)
            if diff > max(1.0, 0.01 * total_amount):
                # Check if difference is explained by typical tax rates (e.g. 5%, 12%, 18%, 28%)
                is_gst_diff = any(
                    abs(round(computed_subtotal * (1 + rate), 2) - total_amount) <= max(1.0, 0.02 * total_amount)
                    for rate in [0.05, 0.12, 0.18, 0.28]
                )
                if not is_gst_diff:
                    warnings.append(
                        f"Invoice total check: Sum of medicine line items (₹{computed_subtotal:.2f}) differs from printed invoice total (₹{total_amount:.2f})."
                    )

        for it in items:
            if it.get('needsVerification') and it.get('verificationReason'):
                warnings.append(f"Item '{it.get('rawName')}': {it.get('verificationReason')}")

        return {
            'supplierName': self.supplier_name,
            'invoiceNumber': self.invoice_number,
            'invoiceDate': invoice_date,
            'totalAmount': total_amount,
            'items': items,
            'confidence': confidence,
            'aiProviderUsed': 'paddleocr-local',
            'warnings': warnings,
        }

    def _extract_supplier(self) -> Optional[str]:
        """Detect distributor / wholesaler name from header lines."""
        ignored_keywords = [
            'tax invoice', 'cash memo', 'invoice', 'original for buyer', 'duplicate',
            'bill of supply', 'retail invoice', 'gstin', 'dl no', 'phone', 'email',
            'challan', 'delivery', 'receipt', 'date', 'page', 's.no', 'medicine',
            'batch', 'expiry', 'quantity', 'rate', 'amount', 'subtotal', 'total'
        ]

        candidate_lines = []
        for it in self.sorted_items[:15]:
            text = it['text'].strip()
            text_lower = text.lower()
            if any(ign in text_lower for ign in ignored_keywords):
                continue
            if len(text) < 4:
                continue
            # Never pick a medicine candidate as a supplier
            has_strength = bool(re.search(r'\d+\s*(?:mg|ml|mcg|gm|g|iu|%)\b', text_lower))
            has_form = any(re.search(r'\b' + f + r'\b', text_lower) for forms in DOSAGE_FORMS.values() for f in forms)
            if has_strength or has_form:
                continue

            if any(term in text_lower for term in ['distributor', 'distributors', 'healthcare', 'pharma', 'pharmaceuticals', 'laboratories', 'agency', 'agencies', 'enterprises', 'medical', 'druggist', 'pvt', 'ltd', 'wholesaler']):
                return text
            candidate_lines.append(text)

        if candidate_lines and any(kw in candidate_lines[0].lower() for kw in ['distributor', 'pharma', 'healthcare', 'laboratories', 'agency', 'pvt', 'ltd', 'enterprises', 'medical', 'wholesaler']):
            return candidate_lines[0]

        return None

    def _extract_invoice_number(self) -> Optional[str]:
        """Extract invoice number using keyword and pattern recognition."""
        for it in self.sorted_items:
            text = it['text'].strip()
            match = re.search(r'(?:inv(?:oice)?|bill|memo|challan|doc)[\s\w]*[:#\-\s]+([A-Z0-9\-\/]{3,30})', text, re.IGNORECASE)
            if match:
                inv = match.group(1).strip()
                if not re.match(r'^(date|to|no|dt)$', inv, re.IGNORECASE):
                    return inv
            standalone = re.search(r'\b(INV[-/][A-Z0-9\-_]{3,20})\b', text, re.IGNORECASE)
            if standalone:
                return standalone.group(1).strip()

        return None

    def _extract_invoice_date(self) -> Optional[str]:
        """Extract invoice date and normalize to YYYY-MM-DD."""
        for it in self.sorted_items:
            text = it['text'].strip()
            match = re.search(r'(?:date|dt|dated)[\s:#\-\.]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|[a-zA-Z]{3}[-/\s]\d{2,4})', text, re.IGNORECASE)
            if match:
                norm = normalize_date(match.group(1))
                if norm:
                    return norm

        for it in self.sorted_items[:15]:
            text = it['text'].strip()
            match = re.search(r'\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b', text)
            if match:
                norm = normalize_date(match.group(1))
                if norm:
                    return norm

        return None

    def _extract_total_amount(self) -> Optional[float]:
        """Extract bill total amount."""
        # First pass: Look for Grand Total / Net Amount / Amount Payable explicitly
        for it in reversed(self.sorted_items):
            text = it['text'].strip()
            if re.search(r'\btotal\s*(?:qty|items|packs|quantity|strip|strips|pcs)\b', text, re.IGNORECASE):
                continue
            match = re.search(r'(?:grand\s*total|net\s*amount|total\s*amount|amount\s*payable)[^\d\n]*?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
            if match:
                cleaned = match.group(1).replace(',', '')
                try:
                    val = float(cleaned)
                    if val > 0:
                        return val
                except ValueError:
                    pass

        # Second pass: Fallback to general 'total' or 'subtotal'
        for it in reversed(self.sorted_items):
            text = it['text'].strip()
            if re.search(r'\btotal\s*(?:qty|items|packs|quantity|strip|strips|pcs)\b', text, re.IGNORECASE):
                continue
            match = re.search(r'(?:sub\s*total|subtotal|total)[^\d\n]*?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
            if match:
                cleaned = match.group(1).replace(',', '')
                try:
                    val = float(cleaned)
                    if val > 0:
                        return val
                except ValueError:
                    pass

        return None

    def _detect_table_headers(self, rows: List[List[Dict[str, Any]]]) -> Tuple[Optional[int], Dict[str, Dict[str, Any]]]:
        """
        Scans rows to find the table header row and extracts horizontal column bounds.
        Supports merging adjacent sub-tokens (e.g. 'S.' + 'No.', 'Medicine' + 'Name', 'Batch' + 'No.').
        Returns (header_row_index, columns_dict).
        """
        best_row_idx = None
        best_col_map = {}
        max_matched_cols = 0

        for r_idx, row in enumerate(rows):
            col_candidates: Dict[str, Dict[str, Any]] = {}
            n_tokens = len(row)

            # Check individual tokens & merged pairs of horizontally adjacent tokens
            i = 0
            while i < n_tokens:
                token = row[i]
                text = token['text']
                box = token['box']
                matched_type = classify_header_text(text)

                # Try merging with next token if this forms a recognized compound header
                if i + 1 < n_tokens:
                    next_token = row[i + 1]
                    if next_token['box'][0] - box[2] < 50:
                        merged_text = f"{text} {next_token['text']}".strip().lower()
                        clean_merged = re.sub(r'[^\w\s]', '', merged_text).strip()
                        if clean_merged in VALID_COMPOUND_HEADER_PHRASES or text.lower() in ['s.', 'sl.', 'sr.', 'b.']:
                            merged_type = classify_header_text(merged_text)
                            if merged_type:
                                matched_type = merged_type
                                box = [min(box[0], next_token['box'][0]), min(box[1], next_token['box'][1]),
                                       max(box[2], next_token['box'][2]), max(box[3], next_token['box'][3])]
                                i += 1  # Skip next token since merged

                if matched_type:
                    center_x = (box[0] + box[2]) / 2.0
                    col_candidates[matched_type] = {
                        'type': matched_type,
                        'box': box,
                        'center_x': center_x,
                        'x_min': box[0],
                        'x_max': box[2]
                    }
                i += 1

            # A valid table header row typically has at least 3 distinct recognized column headers
            if len(col_candidates) >= 3 and len(col_candidates) > max_matched_cols:
                max_matched_cols = len(col_candidates)
                best_row_idx = r_idx
                best_col_map = col_candidates

        # If best row found, check if immediate next or previous row contains multi-line header continuations
        # e.g., 'Name' under 'Medicine' or 'Date' under 'Expiry'
        if best_row_idx is not None:
            header_y = rows[best_row_idx][0]['box'][1]
            for offset in [-1, 1]:
                check_idx = best_row_idx + offset
                if 0 <= check_idx < len(rows):
                    adj_row = rows[check_idx]
                    adj_y = adj_row[0]['box'][1]
                    if abs(adj_y - header_y) <= 35:
                        for token in adj_row:
                            t_type = classify_header_text(token['text'])
                            if t_type and t_type not in best_col_map:
                                box = token['box']
                                best_col_map[t_type] = {
                                    'type': t_type,
                                    'box': box,
                                    'center_x': (box[0] + box[2]) / 2.0,
                                    'x_min': box[0],
                                    'x_max': box[2]
                                }

        return best_row_idx, best_col_map

    def _compute_column_intervals(self, columns_map: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sorts detected columns horizontally and establishes boundary intervals [left, right]
        for each column to cleanly partition table cells.
        """
        sorted_cols = sorted(columns_map.values(), key=lambda c: c['center_x'])
        num_cols = len(sorted_cols)

        intervals = []
        for i in range(num_cols):
            curr = sorted_cols[i]
            col_left = 0.0 if i == 0 else (sorted_cols[i - 1]['x_max'] + curr['x_min']) / 2.0
            col_right = float('inf') if i == num_cols - 1 else (curr['x_max'] + sorted_cols[i + 1]['x_min']) / 2.0

            intervals.append({
                'type': curr['type'],
                'center_x': curr['center_x'],
                'x_min': curr['x_min'],
                'x_max': curr['x_max'],
                'left_bound': col_left,
                'right_bound': col_right,
            })

        return intervals

    def _extract_items(self) -> List[Dict[str, Any]]:
        """
        Extracts structured medicine line items from OCR table rows using
        PaddleOCR text tokens and precise bounding-box column mapping.
        """
        # Step 1: Cluster all OCR items into horizontal rows based on vertical Y coordinates
        y_threshold = 18.0
        grouped_rows: List[List[Dict[str, Any]]] = []

        # Sort items by Y midpoint
        sorted_by_y = sorted(self.raw_items, key=lambda it: (it['box'][1] + it['box'][3]) / 2.0)

        current_row: List[Dict[str, Any]] = []
        current_y: Optional[float] = None

        for it in sorted_by_y:
            y_mid = (it['box'][1] + it['box'][3]) / 2.0
            if current_y is None or abs(y_mid - current_y) <= y_threshold:
                current_row.append(it)
                current_y = y_mid if current_y is None else (current_y + y_mid) / 2.0
            else:
                if current_row:
                    grouped_rows.append(sorted(current_row, key=lambda x: x['box'][0]))
                current_row = [it]
                current_y = y_mid

        if current_row:
            grouped_rows.append(sorted(current_row, key=lambda x: x['box'][0]))

        # Step 2: Detect Table Header Row and Column Intervals
        header_row_idx, columns_map = self._detect_table_headers(grouped_rows)
        column_intervals = self._compute_column_intervals(columns_map) if columns_map else []

        header_y_max = 0.0
        if header_row_idx is not None:
            header_y_max = max(token['box'][3] for token in grouped_rows[header_row_idx])
            # If adjacent row had multi-line header tokens, take max
            if header_row_idx + 1 < len(grouped_rows):
                next_row_text = " ".join(t['text'].lower() for t in grouped_rows[header_row_idx + 1])
                if classify_header_text(next_row_text):
                    header_y_max = max(header_y_max, max(token['box'][3] for token in grouped_rows[header_row_idx + 1]))

        # Step 3: Determine Table Boundaries and Filter Data Rows
        # Find the vertical bottom boundary of the table by locating the first summary/footer row below header
        table_bottom_y = float('inf')
        start_idx = (header_row_idx + 1) if header_row_idx is not None else 0

        for r_idx in range(start_idx, len(grouped_rows)):
            row = grouped_rows[r_idx]
            row_y_min = min(t['box'][1] for t in row)
            if header_y_max > 0 and row_y_min < header_y_max - 5:
                continue

            row_text = " ".join(t['text'].strip() for t in row)
            if is_footer_or_summary_text(row_text):
                table_bottom_y = min(table_bottom_y, row_y_min)
                break

        data_rows: List[List[Dict[str, Any]]] = []
        for r_idx in range(start_idx, len(grouped_rows)):
            row = grouped_rows[r_idx]
            row_y_min = min(t['box'][1] for t in row)

            if header_y_max > 0 and row_y_min < header_y_max - 5:
                continue

            # Stop medicine-row parsing strictly at the end of the item table
            if row_y_min >= table_bottom_y - 2:
                break

            row_text = " ".join(t['text'].strip() for t in row)

            # Skip repeated header row
            if classify_header_text(row_text.lower()) and len(row) >= 3:
                continue

            # If individual row matches footer/summary text, stop immediately
            if is_footer_or_summary_text(row_text):
                break

            data_rows.append(row)

        # Step 4: Handle Wrapped Multi-Line Medicine Names
        # If a row has only alphabetic text in the medicine column and no numeric/batch/date data,
        # merge it with the adjacent medicine row.
        merged_rows: List[Dict[str, Any]] = []

        for row in data_rows:
            # Check row properties
            has_prices = any(re.search(r'^\d+\.\d{2}$', t['text'].replace('₹', '').replace('Rs.', '').replace(',', '').strip()) for t in row)
            has_dates = any(normalize_date(t['text']) for t in row)
            has_batches = any(is_valid_batch_code(t['text']) for t in row)
            all_text = " ".join(t['text'].strip() for t in row)

            is_continuation = False
            # A continuation row never has prices, dates, or batch codes
            if not has_prices and not has_dates and not has_batches and len(row) <= 3:
                first_text = row[0]['text'].strip()
                # If first token is not a serial number
                if not re.match(r'^\d+[.)]?$', first_text) and len(all_text) >= 2:
                    if column_intervals:
                        med_interval = next((c for c in column_intervals if c['type'] == 'medicine_name'), None)
                        row_center = (row[0]['box'][0] + row[-1]['box'][2]) / 2.0
                        if med_interval:
                            if med_interval['left_bound'] <= row_center <= med_interval['right_bound'] + 80:
                                is_continuation = True
                        elif row_center < 380:
                            is_continuation = True
                    else:
                        is_continuation = True

            if is_continuation and merged_rows:
                merged_rows[-1]['tokens'].extend(row)
                merged_rows[-1]['continuation_text'] += " " + all_text
            else:
                merged_rows.append({
                    'tokens': row,
                    'continuation_text': ''
                })

        extracted_items: List[Dict[str, Any]] = []

        # Step 5: Process each row using column intervals or robust layout mapping
        for row_entry in merged_rows:
            row = sorted(row_entry['tokens'], key=lambda x: x['box'][0])
            continuation_text = row_entry['continuation_text']

            # Cells by column type
            assigned_cells: Dict[str, List[Dict[str, Any]]] = {
                's_no': [],
                'medicine_name': [],
                'batch_number': [],
                'expiry_date': [],
                'quantity': [],
                'unit': [],
                'purchase_price': [],
                'line_amount': [],
                'mrp': [],
                'hsn_code': [],
                'discount': [],
                'tax': [],
                'unassigned': []
            }

            if column_intervals:
                # Map each token based on which column interval contains its center_x
                for token in row:
                    center_x = (token['box'][0] + token['box'][2]) / 2.0
                    matched_col = None
                    for col in column_intervals:
                        if col['left_bound'] <= center_x < col['right_bound']:
                            matched_col = col['type']
                            break

                    if matched_col:
                        assigned_cells[matched_col].append(token)
                    else:
                        # Fallback to closest column center
                        closest = min(column_intervals, key=lambda c: abs(c['center_x'] - center_x))
                        assigned_cells[closest['type']].append(token)
            else:
                # Fallback: No table headers detected on document
                self._fallback_row_partition(row, assigned_cells)

            # Build Item Fields from Assigned Cells
            # 1. Serial Number (audit only, NEVER quantity)
            s_no = None
            if assigned_cells['s_no']:
                sno_text = assigned_cells['s_no'][0]['text'].strip()
                sno_match = re.search(r'\b(\d{1,4})\b', sno_text)
                if sno_match:
                    s_no = int(sno_match.group(1))

            # 2. Medicine Name
            med_tokens = assigned_cells['medicine_name']
            med_name_parts = [t['text'].strip() for t in med_tokens]
            if continuation_text:
                med_name_parts.append(continuation_text.strip())
            medicine_name = " ".join(med_name_parts).strip()

            # Clean off leading serial numbers from medicine name if present (Requirement 5)
            sno_match = re.match(r'^(\d{1,4})[.)\s\-]+(.*)$', medicine_name)
            if sno_match:
                candidate_sno = int(sno_match.group(1))
                candidate_name = sno_match.group(2).strip()
                if len(candidate_name) >= 2:
                    if s_no is None:
                        s_no = candidate_sno
                    medicine_name = candidate_name

            # If medicine name is empty or was misassigned
            if not medicine_name or re.match(r'^[\d.,]+$', medicine_name):
                # Search unassigned tokens or entire row for best drug candidate
                for t in row:
                    text_cand = t['text'].strip()
                    if len(text_cand) >= 4 and not re.match(r'^[\d.,/-]+$', text_cand) and not is_footer_or_summary_text(text_cand):
                        if any(kw in text_cand.lower() for kws in COMMON_DRUG_CATEGORIES.values() for kw in kws) or \
                           any(re.search(r'\b' + f + r'\b', text_cand.lower()) for forms in DOSAGE_FORMS.values() for f in forms) or \
                           re.search(r'\d+\s*(?:mg|ml|mcg|gm|g)\b', text_cand.lower()):
                            medicine_name = text_cand
                            break

            if not medicine_name and len(row) >= 2:
                # Fallback to first multi-character non-numeric token
                for t in row:
                    tc = t['text'].strip()
                    if len(tc) >= 3 and not re.match(r'^[\d.,/\-]+$', tc) and not normalize_date(tc) and not is_footer_or_summary_text(tc):
                        medicine_name = tc
                        break

            # If still no valid medicine name or it looks like metadata / footer, skip row
            if not medicine_name or len(medicine_name) < 2 or is_footer_or_summary_text(medicine_name):
                continue

            med_lower = medicine_name.lower()
            if any(ign in med_lower for ign in ['invoice', 'tax invoice', 'cash memo', 'gstin', 'dl no', 'subtotal', 'grand total', 'authorized', 'date:']):
                continue
            if self.supplier_name and self.supplier_name.lower().strip() == med_lower.strip():
                continue
            if self.invoice_number and self.invoice_number.lower().strip() == med_lower.strip():
                continue

            # 3. Batch Number
            batch_num = None
            if assigned_cells['batch_number']:
                for t in assigned_cells['batch_number']:
                    clean_b = t['text'].strip().upper()
                    if is_valid_batch_code(clean_b):
                        batch_num = clean_b
                        break

            # If missing from batch column, check unassigned or other cells
            if not batch_num:
                for t in row:
                    clean_b = t['text'].strip().upper()
                    if clean_b != medicine_name.upper() and is_valid_batch_code(clean_b):
                        batch_num = clean_b
                        break

            # 4. Expiry Date
            expiry_date = None
            if assigned_cells['expiry_date']:
                for t in assigned_cells['expiry_date']:
                    norm_d = normalize_date(t['text'])
                    if norm_d:
                        expiry_date = norm_d
                        break

            if not expiry_date:
                for t in row:
                    norm_d = normalize_date(t['text'])
                    if norm_d:
                        expiry_date = norm_d
                        break

            # 5. Quantity & Unit
            quantity = None
            unit = None

            if assigned_cells['unit']:
                unit = assigned_cells['unit'][0]['text'].strip()

            if assigned_cells['quantity']:
                qty_text = assigned_cells['quantity'][0]['text'].strip()
                cleaned_qty = re.sub(r'^(?:qty|qnty|nos?|pcs?|packs?)[:\s.-]*', '', qty_text, flags=re.IGNORECASE)
                qty_match = re.search(r'\b(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\b', cleaned_qty)
                if qty_match:
                    try:
                        num_val = float(qty_match.group(1))
                        if num_val > 0 and 1 <= round(num_val) <= 1000000:
                            quantity = int(round(num_val))
                        if qty_match.group(2) and not unit:
                            unit = qty_match.group(2)
                    except (ValueError, OverflowError):
                        pass

            # 6. Purchase Price (Rate)
            purchase_price = None
            if assigned_cells['purchase_price']:
                for t in assigned_cells['purchase_price']:
                    c_num = t['text'].replace('₹', '').replace('Rs.', '').replace('rs.', '').replace(',', '').strip()
                    c_num = re.sub(r'[^\d.]', '', c_num)
                    if c_num and c_num != '.':
                        try:
                            val = float(c_num)
                            if val > 0:
                                purchase_price = val
                                break
                        except (ValueError, OverflowError):
                            pass

            # 7. Line Amount
            line_amount = None
            if assigned_cells['line_amount']:
                for t in assigned_cells['line_amount']:
                    c_num = t['text'].replace('₹', '').replace('Rs.', '').replace('rs.', '').replace(',', '').strip()
                    c_num = re.sub(r'[^\d.]', '', c_num)
                    if c_num and c_num != '.':
                        try:
                            val = float(c_num)
                            if val > 0:
                                line_amount = val
                                break
                        except (ValueError, OverflowError):
                            pass

            # Cross-Column Arithmetic Validation & Sanity Corrections
            # CRITICAL: Never use S.No. as quantity!
            if quantity is not None and s_no is not None and quantity == s_no:
                # Check if this was accidentally assigned from S.No. column or if quantity column was missing
                if not assigned_cells['quantity'] or (assigned_cells['s_no'] and assigned_cells['s_no'][0]['text'].strip() == str(quantity)):
                    if is_valid_number(purchase_price) and is_valid_number(line_amount):
                        if abs(quantity * purchase_price - line_amount) > 0.05:
                            quantity = None
                    else:
                        quantity = None

            # If quantity is still missing, but line_amount and purchase_price are known and valid:
            # Check if line_amount / purchase_price is an integer
            if quantity is None and is_valid_number(line_amount) and is_valid_number(purchase_price):
                calc_qty = line_amount / purchase_price
                if abs(calc_qty - round(calc_qty)) < 0.001 and 1 <= round(calc_qty) <= 100000:
                    quantity = int(round(calc_qty))

            # Arithmetic Validation: expected = quantity * purchasePrice
            needs_verification = False
            verification_reason = None

            has_valid_qty = is_valid_number(quantity)
            has_valid_price = is_valid_number(purchase_price)
            has_valid_line_amount = is_valid_number(line_amount)

            if has_valid_qty and has_valid_price:
                expected_line_amount = round(float(quantity) * float(purchase_price), 2)
                if has_valid_line_amount:
                    diff = abs(expected_line_amount - float(line_amount))
                    max_allowed_diff = max(0.05, 0.02 * float(line_amount))  # Allow small rounding or discount/tax
                    if diff > max_allowed_diff:
                        needs_verification = True
                        verification_reason = f"Line amount mismatch: extracted ₹{float(line_amount):.2f}, calculated ₹{expected_line_amount:.2f} ({quantity} × ₹{float(purchase_price):.2f})"
                else:
                    # Calculate line subtotal only when quantity and purchase price are valid
                    line_amount = expected_line_amount
            else:
                needs_verification = True
                if not has_valid_qty and not has_valid_price:
                    verification_reason = "Quantity and purchase price could not be determined from invoice"
                elif not has_valid_qty:
                    verification_reason = "Quantity could not be confidently determined from invoice"
                elif not has_valid_price:
                    verification_reason = "Purchase price (Rate) could not be determined from invoice"

            # 8. Calculate Selling Price: strictly purchasePrice * 1.15 only when purchasePrice is valid
            selling_price = None
            if has_valid_price:
                selling_price = round(round(float(purchase_price) * 1.15, 4), 2)

            # Determine Unit
            if not unit:
                unit = infer_unit(medicine_name)

            # Missing fields audit
            missing_fields: List[str] = []
            if not batch_num:
                missing_fields.append('batchNumber')
            if not expiry_date:
                missing_fields.append('expiryDate')
            if not has_valid_qty:
                missing_fields.append('quantity')
            if not has_valid_price:
                missing_fields.append('purchasePrice')

            scores = [it['confidence'] for it in row]
            avg_conf = sum(scores) / len(scores) if scores else 0.9

            item_confidence = 'high'
            if needs_verification or len(missing_fields) >= 2 or avg_conf < 0.75:
                item_confidence = 'low' if (len(missing_fields) >= 2 or avg_conf < 0.75) else 'medium'
            elif len(missing_fields) == 1 or avg_conf < 0.88:
                item_confidence = 'medium'

            # Strict row qualification: Serial numbers or numbered terms are not sufficient evidence of a medicine!
            has_pharma_pattern = (
                any(kw in med_lower for kws in COMMON_DRUG_CATEGORIES.values() for kw in kws) or
                any(re.search(r'\b' + f + r'\b', med_lower) for forms in DOSAGE_FORMS.values() for f in forms) or
                bool(re.search(r'\d+\s*(?:mg|ml|mcg|gm|g|iu|%)\b', med_lower))
            )

            has_transaction_data = has_valid_price or has_valid_line_amount or (has_valid_qty and (bool(batch_num) or bool(expiry_date)))
            if not has_transaction_data and not has_pharma_pattern:
                continue

            # If all 4 key fields missing and no recognized medicine pattern, skip
            if len(missing_fields) == 4 and not has_pharma_pattern:
                continue

            extracted_items.append({
                'id': f"item-{len(extracted_items) + 1}-{int(datetime.now().timestamp() * 1000)}",
                'rawName': medicine_name,
                'batchNumber': batch_num,
                'quantity': quantity,
                'unit': unit,
                'purchasePrice': purchase_price,
                'sellingPrice': selling_price,
                'lineAmount': line_amount,
                'mfgDate': None,
                'expiryDate': expiry_date,
                'category': infer_category(medicine_name),
                'confidence': item_confidence,
                'missingFields': missing_fields,
                'needsVerification': needs_verification,
                'verificationReason': verification_reason,
                'sNo': s_no,
            })

        return extracted_items

    def _fallback_row_partition(self, row: List[Dict[str, Any]], assigned: Dict[str, List[Dict[str, Any]]]) -> None:
        """
        Fallback column partition when no explicit table headers were detected.
        Uses horizontal ordering, text typing, and arithmetic invariants (Qty * Rate ≈ Amount)
        to strictly isolate S.No. and prevent it from being assigned to Quantity.
        """
        # 1. Identify S.No. (first token if standalone small integer)
        tokens_to_process = list(row)
        if tokens_to_process:
            first_t = tokens_to_process[0]['text'].strip()
            if re.match(r'^\d{1,3}$', first_t):
                # Assign to s_no and remove from candidate pool
                assigned['s_no'].append(tokens_to_process.pop(0))

        # 2. Identify Dates -> Expiry
        remaining = []
        for t in tokens_to_process:
            norm_d = normalize_date(t['text'])
            if norm_d and not assigned['expiry_date']:
                assigned['expiry_date'].append(t)
            else:
                remaining.append(t)
        tokens_to_process = remaining

        # 3. Identify Batch Number (alphanumeric pattern)
        remaining = []
        for t in tokens_to_process:
            clean = t['text'].strip().upper()
            if not assigned['batch_number'] and is_valid_batch_code(clean):
                assigned['batch_number'].append(t)
                continue
            remaining.append(t)
        tokens_to_process = remaining

        # 4. Identify Unit
        remaining = []
        for t in tokens_to_process:
            t_lower = t['text'].strip().lower()
            if not assigned['unit'] and any(t_lower == u or t_lower.rstrip('s') == u.rstrip('s') for u in DOSAGE_FORMS):
                assigned['unit'].append(t)
            else:
                remaining.append(t)
        tokens_to_process = remaining

        # 5. Extract Numbers: Qty, Rate, Amount
        numbers = []
        text_tokens = []
        for t in tokens_to_process:
            cleaned = t['text'].replace('₹', '').replace('Rs.', '').replace(',', '').strip()
            try:
                val = float(cleaned)
                numbers.append((val, t))
            except ValueError:
                text_tokens.append(t)

        assigned['medicine_name'].extend(text_tokens)

        # Distinguish Qty, Rate, Amount mathematically
        if len(numbers) >= 3:
            # Check if any n1 * n2 ≈ n3
            matched_triplet = False
            for i in range(len(numbers)):
                for j in range(len(numbers)):
                    if i == j:
                        continue
                    for k in range(len(numbers)):
                        if k == i or k == j:
                            continue
                        n_qty, t_qty = numbers[i]
                        n_rate, t_rate = numbers[j]
                        n_amt, t_amt = numbers[k]
                        if n_qty.is_integer() and 1 <= n_qty <= 100000 and n_rate > 0:
                            if abs(n_qty * n_rate - n_amt) <= max(0.05, 0.02 * n_amt):
                                assigned['quantity'].append(t_qty)
                                assigned['purchase_price'].append(t_rate)
                                assigned['line_amount'].append(t_amt)
                                matched_triplet = True
                                break
                    if matched_triplet:
                        break
                if matched_triplet:
                    break

            if not matched_triplet:
                # Order by X coordinate
                sorted_by_x = sorted(numbers, key=lambda pair: pair[1]['box'][0])
                # Leftmost is usually quantity if integer, next is rate, last is amount
                assigned['quantity'].append(sorted_by_x[0][1])
                assigned['purchase_price'].append(sorted_by_x[1][1])
                assigned['line_amount'].append(sorted_by_x[2][1])
        elif len(numbers) == 2:
            sorted_by_x = sorted(numbers, key=lambda pair: pair[1]['box'][0])
            n1, t1 = sorted_by_x[0]
            n2, t2 = sorted_by_x[1]
            if n1.is_integer() and 1 <= n1 <= 10000:
                assigned['quantity'].append(t1)
                assigned['purchase_price'].append(t2)
            else:
                assigned['purchase_price'].append(t1)
                assigned['line_amount'].append(t2)
        elif len(numbers) == 1:
            n, t = numbers[0]
            if n.is_integer() and 1 <= n <= 10000:
                assigned['quantity'].append(t)
            else:
                assigned['purchase_price'].append(t)
