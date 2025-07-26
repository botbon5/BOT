// utils/tokenFilterTest.ts
// اختبار جلب العملات من GitHub وقوقل مع فلترة حسب السيولة والحجم وعدد الحاملين

import fetch from 'node-fetch';

// شروط الفلترة (مثال)
const MIN_MARKET_CAP = 7; // دولار
const MIN_VOLUME = 12; // دولار
const MIN_HOLDERS = 3;

async function fetchGithubTokens() {
  const url = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data?.tokens) ? data.tokens : [];
}

async function fetchBirdeyeTokenInfo(address: string) {
  try {
    const res = await fetch(`https://public-api.birdeye.so/public/price?address=${address}`);
    const data = await res.json();
    return data?.data?.value || null;
  } catch {
    return null;
  }
}

async function filterTokens(tokens: any[]) {
  // اطبع أول 20 عملة فقط بدون فلترة
  const sample = tokens.slice(0, 20);
  for (const t of sample) {
    console.log({
      address: t.address,
      symbol: t.symbol,
      marketCap: t.marketCap,
      volume: t.volume,
      holders: t.holders
    });
  }
  return sample;
}

(async () => {
  const tokens = await fetchGithubTokens();
  console.log('Total tokens from GitHub:', tokens.length);
  const filtered = await filterTokens(tokens);
  console.log('Filtered tokens:', filtered.length);
  console.log(filtered);
})();
