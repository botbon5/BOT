// tradeSourcesTest.ts
// Test suite for tradeSources.ts
// Language: English only

import { testTradeSource, unifiedBuy, unifiedSell } from './tradeSources';

async function runTests() {
  const testMint = 'So11111111111111111111111111111111111111112'; // SOL (Orca pool always exists)
  const fakeMint = '111111111111111111111111111111111111111111'; // Non-existent token
  const fakeSecret = 'fake_secret';

  console.log('Testing testTradeSource with Orca and SOL...');
  const orcaSol = await testTradeSource('orca', testMint);
  console.log('Orca SOL pool exists:', orcaSol);

  console.log('Testing testTradeSource with Orca and fake token...');
  const orcaFake = await testTradeSource('orca', fakeMint);
  console.log('Orca fake pool exists:', orcaFake);

  // unifiedBuy/unifiedSell tests (will fail without valid secret)
  try {
    console.log('Testing unifiedBuy with fake secret (should fail)...');
    await unifiedBuy(testMint, 0.00001, fakeSecret);
  } catch (e) {
    const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e);
    console.log('unifiedBuy error (expected):', msg);
  }

  try {
    console.log('Testing unifiedSell with fake secret (should fail)...');
    await unifiedSell(testMint, 0.00001, fakeSecret);
  } catch (e) {
    const msg = typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e);
    console.log('unifiedSell error (expected):', msg);
  }
}

runTests();
