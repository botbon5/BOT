// utils/tokenCoingeckoTest.ts
// اختبار جلب أول 20 عملة سولانا من CoinGecko وطباعة بياناتها

import fetch from 'node-fetch';

async function fetchCoinGeckoTokens() {
  const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
  const res = await fetch(url);
  const data = await res.json();
  // فلترة العملات التي لها عنوان سولانا
  return Array.isArray(data) ? data.filter((t: any) => t?.platforms?.solana) : [];
}

(async () => {
  const tokens = await fetchCoinGeckoTokens();
  console.log('Total Solana tokens from CoinGecko:', tokens.length);
  // اطبع أول 20 عملة فقط
  for (const t of tokens.slice(0, 20)) {
    console.log({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      solanaAddress: t.platforms?.solana
    });
  }
})();
