// utils/tokenCoingeckoFilterTest.ts
// اختبار جلب أول 20 عملة سولانا من CoinGecko وفلترتها بالقيم المطلوبة

import fetch from 'node-fetch';

const MIN_MARKET_CAP = 7;
const MIN_VOLUME = 42;
const MIN_HOLDERS = 2;

async function fetchCoinGeckoTokens() {
  const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
  const res = await fetch(url);
  const data = await res.json();
  // فلترة العملات التي لها عنوان سولانا
  return Array.isArray(data) ? data.filter((t: any) => t?.platforms?.solana) : [];
}

async function fetchSolscanMeta(address: string) {
  try {
    const res = await fetch(`https://public-api.solscan.io/token/meta?tokenAddress=${address}`);
    const meta = await res.json();
    return meta;
  } catch {
    return null;
  }
}

(async () => {
  const tokens = await fetchCoinGeckoTokens();
  console.log('Total Solana tokens from CoinGecko:', tokens.length);
  // نجرب أول 20 عملة فقط
  const sample = tokens.slice(0, 20);
  const filtered: any[] = [];
  for (const t of sample) {
    const meta = await fetchSolscanMeta(t.platforms.solana);
    if (
      meta &&
      (meta.marketCap || 0) >= MIN_MARKET_CAP &&
      (meta.volume24h || 0) >= MIN_VOLUME &&
      (meta.holderCount || 0) >= MIN_HOLDERS
    ) {
      filtered.push({
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        solanaAddress: t.platforms.solana,
        marketCap: meta.marketCap,
        volume: meta.volume24h,
        holders: meta.holderCount,
        price: meta.priceUsdt
      });
    }
  }
  console.log('Filtered tokens:', filtered.length);
  console.log(filtered);
})();
