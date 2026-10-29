import unittest
from ocr_service.parser import InvoiceParser, normalize_date

class TestInvoiceParser(unittest.TestCase):
    def test_sample_invoice_column_mapping_and_quantities(self):
        """
        1. Tests the exact sample invoice from the user requirement:
        | S.No. | Medicine | Batch No. | Expiry | Quantity | Unit | Rate | Amount |
        | 1 | Paracetamol 500mg Tablets | PCM2601 | 12/2028 | 20 | Strips | 25.00 | 500.00 |
        | 2 | Cetirizine 10mg Tablets | CTZ2602 | 10/2028 | 10 | Strips | 18.00 | 180.00 |
        | 3 | Amoxicillin 500mg Capsules | AMX2603 | 08/2028 | 10 | Strips | 65.00 | 650.00 |
        | 4 | Pantoprazole 40mg Tablets | PAN2604 | 11/2028 | 10 | Strips | 22.00 | 220.00 |
        | 5 | Ibuprofen 400mg Tablets | IBU2605 | 09/2028 | 10 | Strips | 19.00 | 190.00 |
        """
        tokens = [
            # Supplier header
            {'text': 'APEX HEALTHCARE DISTRIBUTORS PVT LTD', 'confidence': 0.99, 'box': [100, 20, 500, 45]},
            {'text': 'Tax Invoice: INV-2026-8812', 'confidence': 0.98, 'box': [100, 55, 300, 75]},
            {'text': 'Date: 29/10/2026', 'confidence': 0.99, 'box': [550, 55, 700, 75]},
            
            # Table Header Row (Y: 100 to 125)
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 100, 65, 125]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [80, 100, 250, 125]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 100, 370, 125]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 100, 460, 125]},
            {'text': 'Quantity', 'confidence': 0.98, 'box': [490, 100, 550, 125]},
            {'text': 'Unit', 'confidence': 0.95, 'box': [570, 100, 615, 125]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [640, 100, 685, 125]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [720, 100, 785, 125]},

            # Row 1 (Y: 140 to 165)
            {'text': '1', 'confidence': 0.99, 'box': [40, 140, 55, 165]},
            {'text': 'Paracetamol 500mg Tablets', 'confidence': 0.98, 'box': [80, 140, 280, 165]},
            {'text': 'PCM2601', 'confidence': 0.96, 'box': [300, 140, 370, 165]},
            {'text': '12/2028', 'confidence': 0.97, 'box': [400, 140, 465, 165]},
            {'text': '20', 'confidence': 0.99, 'box': [510, 140, 535, 165]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 140, 615, 165]},
            {'text': '25.00', 'confidence': 0.98, 'box': [645, 140, 685, 165]},
            {'text': '500.00', 'confidence': 0.99, 'box': [725, 140, 780, 165]},

            # Row 2 (Y: 175 to 200)
            {'text': '2', 'confidence': 0.99, 'box': [40, 175, 55, 200]},
            {'text': 'Cetirizine 10mg Tablets', 'confidence': 0.98, 'box': [80, 175, 270, 200]},
            {'text': 'CTZ2602', 'confidence': 0.96, 'box': [300, 175, 370, 200]},
            {'text': '10/2028', 'confidence': 0.97, 'box': [400, 175, 465, 200]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 175, 535, 200]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 175, 615, 200]},
            {'text': '18.00', 'confidence': 0.98, 'box': [645, 175, 685, 200]},
            {'text': '180.00', 'confidence': 0.99, 'box': [725, 175, 780, 200]},

            # Row 3 (Y: 210 to 235)
            {'text': '3', 'confidence': 0.99, 'box': [40, 210, 55, 235]},
            {'text': 'Amoxicillin 500mg Capsules', 'confidence': 0.98, 'box': [80, 210, 290, 235]},
            {'text': 'AMX2603', 'confidence': 0.96, 'box': [300, 210, 370, 235]},
            {'text': '08/2028', 'confidence': 0.97, 'box': [400, 210, 465, 235]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 210, 535, 235]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 210, 615, 235]},
            {'text': '65.00', 'confidence': 0.98, 'box': [645, 210, 685, 235]},
            {'text': '650.00', 'confidence': 0.99, 'box': [725, 210, 780, 235]},

            # Row 4 (Y: 245 to 270)
            {'text': '4', 'confidence': 0.99, 'box': [40, 245, 55, 270]},
            {'text': 'Pantoprazole 40mg Tablets', 'confidence': 0.98, 'box': [80, 245, 280, 270]},
            {'text': 'PAN2604', 'confidence': 0.96, 'box': [300, 245, 370, 270]},
            {'text': '11/2028', 'confidence': 0.97, 'box': [400, 245, 465, 270]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 245, 535, 270]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 245, 615, 270]},
            {'text': '22.00', 'confidence': 0.98, 'box': [645, 245, 685, 270]},
            {'text': '220.00', 'confidence': 0.99, 'box': [725, 245, 780, 270]},

            # Row 5 (Y: 280 to 305)
            {'text': '5', 'confidence': 0.99, 'box': [40, 280, 55, 305]},
            {'text': 'Ibuprofen 400mg Tablets', 'confidence': 0.98, 'box': [80, 280, 270, 305]},
            {'text': 'IBU2605', 'confidence': 0.96, 'box': [300, 280, 370, 305]},
            {'text': '09/2028', 'confidence': 0.97, 'box': [400, 280, 465, 305]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 280, 535, 305]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 280, 615, 305]},
            {'text': '19.00', 'confidence': 0.98, 'box': [645, 280, 685, 305]},
            {'text': '190.00', 'confidence': 0.99, 'box': [725, 280, 780, 305]},

            # Total row (Y: 330)
            {'text': 'Grand Total: 1740.00', 'confidence': 0.98, 'box': [600, 330, 780, 355]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 5, f"Expected 5 items, got {len(items)}")

        # 1. Verify Quantities: MUST BE [20, 10, 10, 10, 10], NOT [1, 2, 3, 4, 5]
        expected_quantities = [20, 10, 10, 10, 10]
        actual_quantities = [it['quantity'] for it in items]
        self.assertEqual(actual_quantities, expected_quantities, f"Quantities mismatch! Got {actual_quantities}")

        # 2. Verify Purchase Prices: [25.0, 18.0, 65.0, 22.0, 19.0]
        expected_prices = [25.0, 18.0, 65.0, 22.0, 19.0]
        actual_prices = [it['purchasePrice'] for it in items]
        self.assertEqual(actual_prices, expected_prices, f"Purchase prices mismatch! Got {actual_prices}")

        # 3. Verify Line Amounts: [500.0, 180.0, 650.0, 220.0, 190.0]
        expected_amounts = [500.0, 180.0, 650.0, 220.0, 190.0]
        actual_amounts = [it.get('lineAmount') for it in items]
        self.assertEqual(actual_amounts, expected_amounts, f"Line amounts mismatch! Got {actual_amounts}")

        # 4. Verify Selling Prices (purchasePrice * 1.15 rounded to 2 decimal places):
        # [28.75, 20.70, 74.75, 25.30, 21.85]
        expected_selling = [28.75, 20.70, 74.75, 25.30, 21.85]
        actual_selling = [it['sellingPrice'] for it in items]
        self.assertEqual(actual_selling, expected_selling, f"Selling prices mismatch! Got {actual_selling}")

        # 5. Verify Units: ['Strips', 'Strips', 'Strips', 'Strips', 'Strips']
        for it in items:
            self.assertEqual(it['unit'].lower(), 'strips')

        # 6. Verify Batch Numbers
        expected_batches = ['PCM2601', 'CTZ2602', 'AMX2603', 'PAN2604', 'IBU2605']
        actual_batches = [it['batchNumber'] for it in items]
        self.assertEqual(actual_batches, expected_batches)

        # 7. Verify Arithmetic Validation (all lines should match and NOT require verification)
        for it in items:
            self.assertFalse(it['needsVerification'], f"Item {it['rawName']} was flagged for verification unexpectedly")

    def test_different_column_orders(self):
        """
        Tests invoice layout with a completely different column ordering:
        S.No. | Description | Qty | Rate | Amount | Batch | Expiry
        """
        tokens = [
            # Headers: S.No (30), Description (90), Qty (300), Rate (380), Amount (460), Batch (560), Expiry (660)
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Description', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [300, 50, 350, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [380, 50, 430, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [460, 50, 520, 70]},
            {'text': 'Batch', 'confidence': 0.96, 'box': [560, 50, 620, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [660, 50, 720, 70]},

            # Row 1
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Azithromycin 500mg Tablets', 'confidence': 0.98, 'box': [90, 90, 280, 110]},
            {'text': '50', 'confidence': 0.99, 'box': [310, 90, 340, 110]},
            {'text': '40.00', 'confidence': 0.98, 'box': [390, 90, 430, 110]},
            {'text': '2000.00', 'confidence': 0.99, 'box': [465, 90, 520, 110]},
            {'text': 'AZI992', 'confidence': 0.96, 'box': [565, 90, 620, 110]},
            {'text': '06/2029', 'confidence': 0.97, 'box': [665, 90, 720, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['quantity'], 50, "Quantity should be 50, not serial number 1")
        self.assertEqual(it['purchasePrice'], 40.0)
        self.assertEqual(it['lineAmount'], 2000.0)
        self.assertEqual(it['batchNumber'], 'AZI992')
        self.assertEqual(it['expiryDate'], '2029-06-30')
        # Selling price: 40.0 * 1.15 = 46.00
        self.assertEqual(it['sellingPrice'], 46.00)

    def test_wrapped_medicine_names(self):
        """
        Tests medicine names wrapped onto two lines:
        Line 1: Paracetamol 500mg
        Line 2: Dispersible Tablets
        """
        tokens = [
            # Headers
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},
            {'text': 'Quantity', 'confidence': 0.98, 'box': [490, 50, 550, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [580, 50, 630, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [660, 50, 720, 70]},

            # Row 1 Part A (Y: 90)
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 108]},
            {'text': 'Paracetamol 500mg', 'confidence': 0.98, 'box': [90, 90, 260, 108]},
            {'text': 'PCM8801', 'confidence': 0.96, 'box': [305, 90, 365, 108]},
            {'text': '11/2028', 'confidence': 0.97, 'box': [405, 90, 455, 108]},
            {'text': '30', 'confidence': 0.99, 'box': [505, 90, 530, 108]},
            {'text': '15.00', 'confidence': 0.98, 'box': [585, 90, 625, 108]},
            {'text': '450.00', 'confidence': 0.99, 'box': [665, 90, 715, 108]},

            # Row 1 Part B (Wrapped line: Y: 112)
            {'text': 'Dispersible Tablets', 'confidence': 0.97, 'box': [90, 112, 230, 130]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertIn('Paracetamol 500mg', it['rawName'])
        self.assertIn('Dispersible Tablets', it['rawName'])
        self.assertEqual(it['quantity'], 30)
        self.assertEqual(it['purchasePrice'], 15.00)
        self.assertEqual(it['lineAmount'], 450.00)
        # 15.00 * 1.15 = 17.25
        self.assertEqual(it['sellingPrice'], 17.25)

    def test_multi_digit_quantities_vs_serial_number(self):
        """
        Tests bills with high multi-digit quantities (e.g. 100, 500, 1200) vs small serial numbers (1, 2, 3)
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [490, 50, 540, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [570, 50, 620, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [650, 50, 720, 70]},

            # Row 1
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Metformin 500mg Tablets', 'confidence': 0.98, 'box': [90, 90, 260, 110]},
            {'text': 'MET901', 'confidence': 0.96, 'box': [305, 90, 365, 110]},
            {'text': '05/2027', 'confidence': 0.97, 'box': [405, 90, 455, 110]},
            {'text': '500', 'confidence': 0.99, 'box': [495, 90, 530, 110]},
            {'text': '2.50', 'confidence': 0.98, 'box': [575, 90, 615, 110]},
            {'text': '1250.00', 'confidence': 0.99, 'box': [655, 90, 715, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['quantity'], 500, "Quantity must be 500, never serial number 1")
        self.assertEqual(it['purchasePrice'], 2.50)
        self.assertEqual(it['lineAmount'], 1250.00)
        # 2.50 * 1.15 = 2.875 -> 2.88
        self.assertEqual(it['sellingPrice'], 2.88)

    def test_arithmetic_validation_mismatch(self):
        """
        Tests that when calculated amount (Qty * Price) doesn't match invoice Amount,
        the line is flagged for verification instead of silently altering values.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Item', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch', 'confidence': 0.96, 'box': [300, 50, 360, 70]},
            {'text': 'Exp', 'confidence': 0.97, 'box': [390, 50, 440, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [470, 50, 510, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [540, 50, 580, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [620, 50, 680, 70]},

            # Row 1: Qty 20, Rate 25.00 -> calculated is 500.00, but Amount says 400.00 (mismatch)
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Dolo 650mg Tablets', 'confidence': 0.98, 'box': [90, 90, 240, 110]},
            {'text': 'DL650', 'confidence': 0.96, 'box': [305, 90, 355, 110]},
            {'text': '12/2028', 'confidence': 0.97, 'box': [395, 90, 445, 110]},
            {'text': '20', 'confidence': 0.99, 'box': [475, 90, 505, 110]},
            {'text': '25.00', 'confidence': 0.98, 'box': [545, 90, 580, 110]},
            {'text': '400.00', 'confidence': 0.99, 'box': [625, 90, 675, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        # Preserves actual extracted values
        self.assertEqual(it['quantity'], 20)
        self.assertEqual(it['purchasePrice'], 25.00)
        self.assertEqual(it['lineAmount'], 400.00)
        # Flags verification
        self.assertTrue(it['needsVerification'], "Row with line amount mismatch must be flagged for verification")
        self.assertIn("Line amount mismatch", it['verificationReason'])

    def test_fallback_without_headers(self):
        """
        Tests invoice where table headers are absent or unreadable,
        verifying that S.No. is never chosen as quantity.
        """
        tokens = [
            # Row 1 without any header row preceding it
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Paracetamol 500mg Tablets', 'confidence': 0.98, 'box': [80, 90, 280, 110]},
            {'text': 'PCM2601', 'confidence': 0.96, 'box': [300, 90, 370, 110]},
            {'text': '12/2028', 'confidence': 0.97, 'box': [400, 90, 465, 110]},
            {'text': '20', 'confidence': 0.99, 'box': [510, 90, 535, 110]},
            {'text': '25.00', 'confidence': 0.98, 'box': [645, 90, 685, 110]},
            {'text': '500.00', 'confidence': 0.99, 'box': [725, 90, 780, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['quantity'], 20, "Quantity must be 20, never S.No 1")
        self.assertEqual(it['purchasePrice'], 25.00)
        self.assertEqual(it['lineAmount'], 500.00)
        self.assertEqual(it['sellingPrice'], 28.75)

    def test_missing_quantity_does_not_crash(self):
        """
        Tests invoice where quantity column is missing or blank.
        Pipeline must not crash with TypeError, must preserve lineAmount,
        must set quantity to None, and must flag verification.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [490, 50, 540, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [570, 50, 640, 70]},

            # Row 1: No quantity column on invoice
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Telmisartan 40mg Tablets', 'confidence': 0.98, 'box': [90, 90, 260, 110]},
            {'text': 'TEL401', 'confidence': 0.96, 'box': [305, 90, 365, 110]},
            {'text': '03/2028', 'confidence': 0.97, 'box': [405, 90, 455, 110]},
            {'text': '35.00', 'confidence': 0.98, 'box': [495, 90, 535, 110]},
            {'text': '350.00', 'confidence': 0.99, 'box': [575, 90, 635, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        # Deduced or left None safely without crashing
        self.assertEqual(it['purchasePrice'], 35.00)
        self.assertEqual(it['lineAmount'], 350.00)
        # 35.00 * 1.15 = 40.25
        self.assertEqual(it['sellingPrice'], 40.25)

    def test_missing_price_does_not_crash(self):
        """
        Tests invoice where purchase price (Rate) is missing.
        Must not crash, sellingPrice must be None, and line flagged for verification.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},
            {'text': 'Quantity', 'confidence': 0.98, 'box': [490, 50, 550, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [580, 50, 650, 70]},

            # Row 1: Rate missing
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Omeprazole 20mg Capsules', 'confidence': 0.98, 'box': [90, 90, 260, 110]},
            {'text': 'OMP201', 'confidence': 0.96, 'box': [305, 90, 365, 110]},
            {'text': '04/2028', 'confidence': 0.97, 'box': [405, 90, 455, 110]},
            {'text': '15', 'confidence': 0.99, 'box': [500, 90, 525, 110]},
            {'text': '300.00', 'confidence': 0.99, 'box': [590, 90, 640, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['quantity'], 15)
        self.assertIsNone(it['purchasePrice'])
        self.assertIsNone(it['sellingPrice'])
        self.assertEqual(it['lineAmount'], 300.00)
        self.assertTrue(it['needsVerification'])
        self.assertIn('purchasePrice', it['missingFields'])

    def test_invalid_numeric_ocr_text(self):
        """
        Tests noisy OCR tokens (e.g. Rate = 'N/A', Qty = '---')
        Pipeline should safely ignore invalid numeric text without throwing ValueError or TypeError.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [490, 50, 540, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [570, 50, 620, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [650, 50, 720, 70]},

            # Row 1 with OCR noise in numbers
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Vitamin C 500mg Chewable', 'confidence': 0.98, 'box': [90, 90, 260, 110]},
            {'text': 'VTC902', 'confidence': 0.96, 'box': [305, 90, 365, 110]},
            {'text': '01/2028', 'confidence': 0.97, 'box': [405, 90, 455, 110]},
            {'text': 'INVALID', 'confidence': 0.50, 'box': [495, 90, 535, 110]},
            {'text': 'Rs. 12.50/-', 'confidence': 0.95, 'box': [575, 90, 630, 110]},
            {'text': 'N/A', 'confidence': 0.50, 'box': [655, 90, 690, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        # Rate parsed successfully despite currency symbols
        self.assertEqual(it['purchasePrice'], 12.50)
        # 12.50 * 1.15 = 14.375 -> 14.38
        self.assertEqual(it['sellingPrice'], 14.38)
        # Invalid Qty safely left as None
        self.assertIsNone(it['quantity'])
        self.assertTrue(it['needsVerification'])
        self.assertIn('quantity', it['missingFields'])

    def test_missing_line_amount_computes_subtotal(self):
        """
        Tests row with valid Qty and Rate, but missing printed Amount column.
        Subtotal must be computed correctly as Qty * Rate.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Item', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch', 'confidence': 0.96, 'box': [300, 50, 360, 70]},
            {'text': 'Exp', 'confidence': 0.97, 'box': [390, 50, 440, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [470, 50, 510, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [540, 50, 580, 70]},

            # Row without Amount column
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Salbutamol 2mg Inhaler', 'confidence': 0.98, 'box': [90, 90, 240, 110]},
            {'text': 'SLB20', 'confidence': 0.96, 'box': [305, 90, 355, 110]},
            {'text': '07/2028', 'confidence': 0.97, 'box': [395, 90, 445, 110]},
            {'text': '15', 'confidence': 0.99, 'box': [475, 90, 505, 110]},
            {'text': '20.00', 'confidence': 0.98, 'box': [545, 90, 580, 110]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertEqual(it['quantity'], 15)
        self.assertEqual(it['purchasePrice'], 20.00)
        # Expected subtotal: 15 * 20.00 = 300.00
        self.assertEqual(it['lineAmount'], 300.00)
        # 20.00 * 1.15 = 23.00
        self.assertEqual(it['sellingPrice'], 23.00)
        self.assertFalse(it['needsVerification'])
        self.assertEqual(res['totalAmount'], 300.00)

    def test_all_numeric_fields_missing_does_not_crash_total_amount(self):
        """
        Tests invoice where an item has None for quantity, purchasePrice, and lineAmount.
        Proves fix for: TypeError: unsupported operand type(s) for *: 'NoneType' and 'NoneType'
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 50, 370, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 50, 460, 70]},

            # Row with only medicine name, batch, expiry - no numbers at all
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Ranitidine 150mg Tablets', 'confidence': 0.98, 'box': [90, 90, 260, 110]},
            {'text': 'RNT150', 'confidence': 0.96, 'box': [305, 90, 365, 110]},
            {'text': '10/2028', 'confidence': 0.97, 'box': [405, 90, 455, 110]},
        ]

        parser = InvoiceParser(tokens)
        # This call previously raised TypeError: unsupported operand type(s) for *: 'NoneType' and 'NoneType'
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        it = items[0]
        self.assertIsNone(it['quantity'])
        self.assertIsNone(it['purchasePrice'])
        self.assertIsNone(it['lineAmount'])
        self.assertIsNone(it['sellingPrice'])
        self.assertTrue(it['needsVerification'])
        self.assertIn('quantity', it['missingFields'])
        self.assertIn('purchasePrice', it['missingFields'])
        # Document warnings should contain the structured validation warning
        self.assertTrue(any("Ranitidine 150mg Tablets" in w for w in res['warnings']))

    def test_five_medicine_supplier_invoice_with_terms_and_footer(self):
        """
        Regression Test (Requirement 9):
        Exact 5-medicine supplier invoice followed by Subtotal, CGST, SGST, Grand Total,
        Amount in Words, Terms & Conditions ("1. Goods once sold will not be taken back"),
        and Authorized Signatory.
        
        Asserts:
        - Exactly 5 medicine items extracted (NEVER a 6th row).
        - '1. Goods once sold will' is NEVER returned as a medicine.
        - Quantities are strictly [20, 10, 10, 10, 10], never serial numbers.
        - Totals and taxes verified separately and not included as items.
        """
        tokens = [
            # Header
            {'text': 'APEX HEALTHCARE DISTRIBUTORS PVT LTD', 'confidence': 0.99, 'box': [100, 20, 500, 45]},
            {'text': 'Tax Invoice: INV-2026-8812', 'confidence': 0.98, 'box': [100, 55, 300, 75]},
            {'text': 'Date: 29/10/2026', 'confidence': 0.99, 'box': [550, 55, 700, 75]},

            # Table Header Row (Y: 100 to 125)
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 100, 65, 125]},
            {'text': 'Medicine Name', 'confidence': 0.97, 'box': [80, 100, 250, 125]},
            {'text': 'Batch No.', 'confidence': 0.96, 'box': [300, 100, 370, 125]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [400, 100, 460, 125]},
            {'text': 'Quantity', 'confidence': 0.98, 'box': [490, 100, 550, 125]},
            {'text': 'Unit', 'confidence': 0.95, 'box': [570, 100, 615, 125]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [640, 100, 685, 125]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [720, 100, 785, 125]},

            # Row 1 (Y: 140 to 165)
            {'text': '1', 'confidence': 0.99, 'box': [40, 140, 55, 165]},
            {'text': 'Paracetamol 500mg Tablets', 'confidence': 0.98, 'box': [80, 140, 280, 165]},
            {'text': 'PCM2601', 'confidence': 0.96, 'box': [300, 140, 370, 165]},
            {'text': '12/2028', 'confidence': 0.97, 'box': [400, 140, 465, 165]},
            {'text': '20', 'confidence': 0.99, 'box': [510, 140, 535, 165]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 140, 615, 165]},
            {'text': '25.00', 'confidence': 0.98, 'box': [645, 140, 685, 165]},
            {'text': '500.00', 'confidence': 0.99, 'box': [725, 140, 780, 165]},

            # Row 2 (Y: 175 to 200)
            {'text': '2', 'confidence': 0.99, 'box': [40, 175, 55, 200]},
            {'text': 'Cetirizine 10mg Tablets', 'confidence': 0.98, 'box': [80, 175, 270, 200]},
            {'text': 'CTZ2602', 'confidence': 0.96, 'box': [300, 175, 370, 200]},
            {'text': '10/2028', 'confidence': 0.97, 'box': [400, 175, 465, 200]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 175, 535, 200]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 175, 615, 200]},
            {'text': '18.00', 'confidence': 0.98, 'box': [645, 175, 685, 200]},
            {'text': '180.00', 'confidence': 0.99, 'box': [725, 175, 780, 200]},

            # Row 3 (Y: 210 to 235)
            {'text': '3', 'confidence': 0.99, 'box': [40, 210, 55, 235]},
            {'text': 'Amoxicillin 500mg Capsules', 'confidence': 0.98, 'box': [80, 210, 290, 235]},
            {'text': 'AMX2603', 'confidence': 0.96, 'box': [300, 210, 370, 235]},
            {'text': '08/2028', 'confidence': 0.97, 'box': [400, 210, 465, 235]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 210, 535, 235]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 210, 615, 235]},
            {'text': '65.00', 'confidence': 0.98, 'box': [645, 210, 685, 235]},
            {'text': '650.00', 'confidence': 0.99, 'box': [725, 210, 780, 235]},

            # Row 4 (Y: 245 to 270)
            {'text': '4', 'confidence': 0.99, 'box': [40, 245, 55, 270]},
            {'text': 'Pantoprazole 40mg Tablets', 'confidence': 0.98, 'box': [80, 245, 280, 270]},
            {'text': 'PAN2604', 'confidence': 0.96, 'box': [300, 245, 370, 270]},
            {'text': '11/2028', 'confidence': 0.97, 'box': [400, 245, 465, 270]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 245, 535, 270]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 245, 615, 270]},
            {'text': '22.00', 'confidence': 0.98, 'box': [645, 245, 685, 270]},
            {'text': '220.00', 'confidence': 0.99, 'box': [725, 245, 780, 270]},

            # Row 5 (Y: 280 to 305)
            {'text': '5', 'confidence': 0.99, 'box': [40, 280, 55, 305]},
            {'text': 'Ibuprofen 400mg Tablets', 'confidence': 0.98, 'box': [80, 280, 270, 305]},
            {'text': 'IBU2605', 'confidence': 0.96, 'box': [300, 280, 370, 305]},
            {'text': '09/2028', 'confidence': 0.97, 'box': [400, 280, 465, 305]},
            {'text': '10', 'confidence': 0.99, 'box': [510, 280, 535, 305]},
            {'text': 'Strips', 'confidence': 0.95, 'box': [570, 280, 615, 305]},
            {'text': '19.00', 'confidence': 0.98, 'box': [645, 280, 685, 305]},
            {'text': '190.00', 'confidence': 0.99, 'box': [725, 280, 780, 305]},

            # Invoice Summary / Totals (Y: 320 to 390)
            {'text': 'Subtotal: 1740.00', 'confidence': 0.98, 'box': [580, 320, 780, 340]},
            {'text': 'CGST @ 6%: 104.40', 'confidence': 0.97, 'box': [580, 345, 780, 365]},
            {'text': 'SGST @ 6%: 104.40', 'confidence': 0.97, 'box': [580, 370, 780, 390]},
            {'text': 'Grand Total: 1948.80', 'confidence': 0.99, 'box': [580, 400, 780, 425]},
            {'text': 'Amount in Words: Rupees One Thousand Nine Hundred Forty Eight Only', 'confidence': 0.96, 'box': [50, 435, 550, 455]},

            # Terms & Conditions & Signatures (Y: 470 to 560)
            {'text': 'Terms & Conditions:', 'confidence': 0.98, 'box': [50, 470, 200, 490]},
            {'text': '1.', 'confidence': 0.99, 'box': [50, 495, 65, 515]},
            {'text': 'Goods once sold will not be taken back or exchanged.', 'confidence': 0.97, 'box': [75, 495, 450, 515]},
            {'text': '2.', 'confidence': 0.99, 'box': [50, 520, 65, 540]},
            {'text': 'Interest @ 18% p.a. will be charged after 15 days.', 'confidence': 0.97, 'box': [75, 520, 420, 540]},
            {'text': 'Subject to Mumbai Jurisdiction', 'confidence': 0.96, 'box': [50, 545, 260, 565]},
            {'text': 'For APEX HEALTHCARE DISTRIBUTORS PVT LTD', 'confidence': 0.97, 'box': [500, 530, 780, 550]},
            {'text': 'Authorized Signatory', 'confidence': 0.98, 'box': [550, 570, 730, 590]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        # CRITICAL ASSERTION: Must return EXACTLY 5 items!
        self.assertEqual(len(items), 5, f"Expected exactly 5 medicine items, but got {len(items)}")

        # CRITICAL ASSERTION: 'Goods once sold will' must NEVER appear as a medicine
        extracted_names = [it['rawName'] for it in items]
        for name in extracted_names:
            self.assertNotIn("goods once sold", name.lower())
            self.assertNotIn("terms", name.lower())
            self.assertNotIn("authorized", name.lower())
            self.assertNotIn("subtotal", name.lower())
            self.assertNotIn("grand total", name.lower())

        # Verify quantities are strictly [20, 10, 10, 10, 10], NOT serial numbers [1, 2, 3, 4, 5]
        self.assertEqual([it['quantity'] for it in items], [20, 10, 10, 10, 10])
        # Verify purchase prices
        self.assertEqual([it['purchasePrice'] for it in items], [25.00, 18.00, 65.00, 22.00, 19.00])
        # Verify line amounts
        self.assertEqual([it['lineAmount'] for it in items], [500.00, 180.00, 650.00, 220.00, 190.00])
        # Verify selling prices (15% markup)
        self.assertEqual([it['sellingPrice'] for it in items], [28.75, 20.70, 74.75, 25.30, 21.85])
        # Verify total amount
        self.assertEqual(res['totalAmount'], 1948.80)

    def test_wrapped_multiline_medicine_names(self):
        """
        Tests table rows where medicine descriptions wrap across multiple lines:
        Row 1a: Amoxicillin & Potassium Clavulanate (line 1)
        Row 1b: 625mg Tablets (10x10 Strips) (continuation line)
        Row 2a: Paracetamol & Ibuprofen Susp. (line 1)
        Row 2b: 100ml Syrup Oral Suspension (continuation line)
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Medicine Description', 'confidence': 0.97, 'box': [90, 50, 280, 70]},
            {'text': 'Batch', 'confidence': 0.96, 'box': [320, 50, 380, 70]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [410, 50, 470, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [500, 50, 540, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [570, 50, 620, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [660, 50, 730, 70]},

            # Item 1, line 1 (Y: 90 to 110)
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 55, 110]},
            {'text': 'Amoxicillin & Potassium Clavulanate', 'confidence': 0.98, 'box': [90, 90, 310, 110]},
            {'text': 'AMX881', 'confidence': 0.96, 'box': [325, 90, 375, 110]},
            {'text': '12/2028', 'confidence': 0.97, 'box': [415, 90, 465, 110]},
            {'text': '30', 'confidence': 0.99, 'box': [505, 90, 530, 110]},
            {'text': '110.00', 'confidence': 0.98, 'box': [575, 90, 615, 110]},
            {'text': '3300.00', 'confidence': 0.99, 'box': [665, 90, 725, 110]},
            # Item 1, wrapped line 2 (Y: 115 to 135) - strictly text in medicine column
            {'text': '625mg Tablets (10x10 Strips)', 'confidence': 0.96, 'box': [90, 115, 270, 135]},

            # Item 2, line 1 (Y: 150 to 170)
            {'text': '2', 'confidence': 0.99, 'box': [40, 150, 55, 170]},
            {'text': 'Paracetamol & Ibuprofen Susp.', 'confidence': 0.98, 'box': [90, 150, 280, 170]},
            {'text': 'PAR992', 'confidence': 0.96, 'box': [325, 150, 375, 170]},
            {'text': '06/2027', 'confidence': 0.97, 'box': [415, 150, 465, 170]},
            {'text': '20', 'confidence': 0.99, 'box': [505, 150, 530, 170]},
            {'text': '45.00', 'confidence': 0.98, 'box': [575, 150, 615, 170]},
            {'text': '900.00', 'confidence': 0.99, 'box': [665, 150, 725, 170]},
            # Item 2, wrapped line 2 (Y: 175 to 195)
            {'text': '100ml Syrup Oral Suspension', 'confidence': 0.96, 'box': [90, 175, 260, 195]},

            # Total
            {'text': 'Total Amount: 4200.00', 'confidence': 0.99, 'box': [550, 220, 730, 240]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 2)
        # Check merged multi-line names
        self.assertIn("625mg Tablets", items[0]['rawName'])
        self.assertIn("Amoxicillin", items[0]['rawName'])
        self.assertEqual(items[0]['quantity'], 30)
        self.assertEqual(items[0]['purchasePrice'], 110.00)

        self.assertIn("100ml Syrup", items[1]['rawName'])
        self.assertIn("Paracetamol", items[1]['rawName'])
        self.assertEqual(items[1]['quantity'], 20)
        self.assertEqual(items[1]['purchasePrice'], 45.00)

    def test_diverse_table_layout_with_extensive_footer(self):
        """
        Tests layout with column order: Description | Qty | Rate | Amount | Batch | Expiry
        with extensive footer containing Bank details, Declaration, Terms, and Signature.
        """
        tokens = [
            # Headers
            {'text': 'Description', 'confidence': 0.97, 'box': [50, 40, 220, 60]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [250, 40, 290, 60]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [330, 40, 380, 60]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [420, 40, 480, 60]},
            {'text': 'Batch', 'confidence': 0.96, 'box': [510, 40, 560, 60]},
            {'text': 'Expiry', 'confidence': 0.97, 'box': [600, 40, 660, 60]},

            # Medicine row
            {'text': 'Dolo 650mg Tablets', 'confidence': 0.98, 'box': [50, 80, 210, 100]},
            {'text': '50', 'confidence': 0.99, 'box': [255, 80, 280, 100]},
            {'text': '30.00', 'confidence': 0.98, 'box': [335, 80, 375, 100]},
            {'text': '1500.00', 'confidence': 0.99, 'box': [425, 80, 475, 100]},
            {'text': 'DLO881', 'confidence': 0.96, 'box': [515, 80, 555, 100]},
            {'text': '05/2028', 'confidence': 0.97, 'box': [605, 80, 655, 100]},

            # Footer sections
            {'text': 'Sub Total: 1500.00', 'confidence': 0.98, 'box': [330, 130, 480, 150]},
            {'text': 'GST (12%): 180.00', 'confidence': 0.98, 'box': [330, 155, 480, 175]},
            {'text': 'Grand Total: 1680.00', 'confidence': 0.99, 'box': [330, 180, 480, 200]},
            {'text': 'Bank Details: HDFC Bank A/c No 502000998877 IFSC: HDFC0000123', 'confidence': 0.95, 'box': [50, 215, 500, 235]},
            {'text': '1. Goods once sold will not be accepted back under any circumstances.', 'confidence': 0.96, 'box': [50, 245, 550, 265]},
            {'text': '2. Certified that particulars given above are true and correct.', 'confidence': 0.96, 'box': [50, 270, 480, 290]},
            {'text': 'Authorized Signatory', 'confidence': 0.98, 'box': [500, 290, 660, 310]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['rawName'], 'Dolo 650mg Tablets')
        self.assertEqual(items[0]['batchNumber'], 'DLO881')
        self.assertEqual(items[0]['quantity'], 50)
        self.assertEqual(items[0]['purchasePrice'], 30.00)
        self.assertEqual(items[0]['sellingPrice'], 34.50)
        self.assertEqual(res['totalAmount'], 1680.00)

    def test_numbered_disclaimers_never_created_as_medicines(self):
        """
        Tests that lines starting with numbers like "1. Goods once sold...", "2. All payments..."
        are NEVER classified as medicines even in documents with noisy headers or footers.
        """
        tokens = [
            {'text': 'S.No.', 'confidence': 0.95, 'box': [30, 50, 70, 70]},
            {'text': 'Particulars', 'confidence': 0.97, 'box': [90, 50, 250, 70]},
            {'text': 'Qty', 'confidence': 0.98, 'box': [300, 50, 350, 70]},
            {'text': 'Rate', 'confidence': 0.98, 'box': [400, 50, 450, 70]},
            {'text': 'Amount', 'confidence': 0.98, 'box': [500, 50, 560, 70]},

            # Row 1: Real medicine
            {'text': '1', 'confidence': 0.99, 'box': [40, 90, 60, 110]},
            {'text': 'Metformin 500mg Tablets', 'confidence': 0.98, 'box': [90, 90, 250, 110]},
            {'text': '100', 'confidence': 0.99, 'box': [310, 90, 340, 110]},
            {'text': '15.00', 'confidence': 0.98, 'box': [410, 90, 440, 110]},
            {'text': '1500.00', 'confidence': 0.99, 'box': [510, 90, 550, 110]},

            # Numbered Terms & Conditions
            {'text': '1.', 'confidence': 0.99, 'box': [40, 150, 60, 170]},
            {'text': 'Goods once sold will not be returned under any condition', 'confidence': 0.96, 'box': [90, 150, 400, 170]},
            {'text': '2.', 'confidence': 0.99, 'box': [40, 180, 60, 200]},
            {'text': 'Interest @ 24% p.a. will be levied after 30 days', 'confidence': 0.96, 'box': [90, 180, 380, 200]},
        ]

        parser = InvoiceParser(tokens)
        res = parser.parse()
        items = res['items']

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['rawName'], 'Metformin 500mg Tablets')
        self.assertEqual(items[0]['quantity'], 100)
        self.assertEqual(items[0]['purchasePrice'], 15.00)

if __name__ == '__main__':
    unittest.main()

