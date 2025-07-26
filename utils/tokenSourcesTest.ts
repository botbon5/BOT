// utils/tokenSourcesTest.ts
// Test fetching Solana tokens from multiple sources in this environment

import fetch from 'node-fetch';

async function testBirdeye() {
  try {
    const res = await fetch('https://public-api.birdeye.so/public/tokenlist?chain=solana');
    const data = await res.json();
    console.log('Birdeye tokens:', Array.isArray(data?.data) ? data.data.length : 'No data');
  } catch (e) {
    console.error('Birdeye error:', e);
  }
}

async function testPumpFun() {
  try {
    const res = await fetch('https://api.pump.fun/api/v2/tokens');
    const data = await res.json();
    console.log('Pump.fun tokens:', Array.isArray(data?.tokens) ? data.tokens.length : 'No data');
  } catch (e) {
    console.error('Pump.fun error:', e);
  }
}

async function testSolscan() {
  try {
    const res = await fetch('https://public-api.solscan.io/token/list');
    const data = await res.json();
    console.log('Solscan tokens:', Array.isArray(data) ? data.length : 'No data');
  } catch (e) {
    console.error('Solscan error:', e);
  }
}

async function testCoinGecko() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true');
    const data = await res.json();
    const solanaTokens = Array.isArray(data)
      ? data.filter((t: any) => t?.platforms?.solana)
      : [];
    console.log('CoinGecko Solana tokens:', solanaTokens.length);
  } catch (e) {
    console.error('CoinGecko error:', e);
  }
}

async function testGitHub() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const data = await res.json();
    console.log('GitHub tokens:', Array.isArray(data?.tokens) ? data.tokens.length : 'No data');
  } catch (e) {
    console.error('GitHub error:', e);
  }
}

(async () => {
  await testBirdeye();
  await testPumpFun();
  await testSolscan();
  await testCoinGecko();
  await testGitHub();
})();
