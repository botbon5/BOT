// utils/tokenSolscanTest.ts
// اختبار جلب أول 20 عملة من Solscan وطباعة بياناتها

import fetch from 'node-fetch';

async function fetchSolscanTokens() {
  const url = 'https://public-api.solscan.io/token/list';
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

(async () => {
  const tokens = await fetchSolscanTokens();
  console.log('Total tokens from Solscan:', tokens.length);
  // اطبع أول 20 عملة فقط
  for (const t of tokens.slice(0, 20)) {
    console.log({
      address: t.tokenAddress,
      symbol: t.symbol,
      marketCap: t.marketCap,
      volume: t.volume24h,
      holders: t.holderCount,
      price: t.priceUsdt
    });
  }
})();
