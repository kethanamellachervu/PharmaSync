import {
  isTransientGeminiError,
  isPermanentGeminiError,
  formatGeminiErrorMessage,
} from '../services/billOcrService.js';

function runErrorHandlingTests() {
  console.log('==================================================');
  console.log('🧪 Testing Gemini Error Classification & Handling');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [${testName}] PASSED`);
      passed++;
    } else {
      console.error(`❌ [${testName}] FAILED: ${detail || ''}`);
      failed++;
    }
  }

  // 1. Detect 503 UNAVAILABLE & High Demand as Transient
  const err503 = new Error(
    '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}'
  );
  assert(
    isTransientGeminiError(err503),
    'Transient Error: 503 UNAVAILABLE High Demand',
    'Should be marked as transient'
  );
  assert(
    !isPermanentGeminiError(err503),
    'Not Permanent Error: 503 UNAVAILABLE',
    '503 should not be marked as permanent'
  );

  // 2. Detect 429 Rate Limit as Transient
  const err429 = { status: 429, message: 'Resource exhausted: rate limit exceeded' };
  assert(
    isTransientGeminiError(err429),
    'Transient Error: 429 Rate Limit',
    '429 should be marked as transient'
  );

  // 3. Detect 500 / 502 / 504 / Network timeouts as Transient
  const errTimeout = new Error('Client network socket disconnected before secure TLS connection (ETIMEDOUT)');
  assert(
    isTransientGeminiError(errTimeout),
    'Transient Error: Network Timeout / ETIMEDOUT',
    'Network timeout should be marked as transient'
  );

  // 4. Detect Permanent Errors (Invalid Key)
  const errBadKey = new Error('API key not valid. Please pass a valid API key.');
  assert(
    isPermanentGeminiError(errBadKey),
    'Permanent Error: Invalid API Key',
    'Invalid API key should be marked permanent'
  );
  assert(
    !isTransientGeminiError(errBadKey),
    'Not Transient: Invalid API Key',
    'Invalid API key must not be retried'
  );

  // 5. Detect Permanent Errors (Unsupported model / 404)
  const errNotFound = { status: 404, message: 'models/gemini-old-model is not found or unsupported model' };
  assert(
    isPermanentGeminiError(errNotFound),
    'Permanent Error: Model Not Found (404)',
    'Model not found should be marked permanent'
  );

  // 6. Test User-Friendly Formatting for 503 UNAVAILABLE
  const formatted503 = formatGeminiErrorMessage(err503);
  assert(
    formatted503.includes('temporarily experiencing high demand') &&
      formatted503.includes('503 UNAVAILABLE') &&
      formatted503.includes('Retry AI Scan'),
    'Format 503 Message: Explains High Demand and Guides Retry',
    `Formatted: ${formatted503}`
  );

  // 7. Test User-Friendly Formatting for Invalid Key
  const formattedKey = formatGeminiErrorMessage(errBadKey);
  assert(
    formattedKey.includes('configuration error') && formattedKey.includes('GEMINI_API_KEY'),
    'Format Permanent Error: Explains Configuration and Key',
    `Formatted: ${formattedKey}`
  );

  console.log('==================================================');
  console.log(`📊 Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All error classification and formatting tests passed!');
  }
}

runErrorHandlingTests();
