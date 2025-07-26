// جلب العملات من Pump.fun وتطبيق الاستراتيجية
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const strategy = { minVolume: 7, minHolders: 34, minAge: 3, enabled: true };
async function main() {
  console.log('مصدر Pump.fun:');
  try {
    const res = await fetch('https://api.pump.fun/api/v2/tokens?sort=volume_24h&order=desc&limit=50');
    const data = await res.json();
    const tokens = Array.isArray(data?.tokens) ? data.tokens : [];
    const filtered = tokens.filter(t =>
      t.volume_24h >= strategy.minVolume &&
      t.holders >= strategy.minHolders &&
      t.age >= strategy.minAge
    );
    filtered.forEach((t, i) => {
      console.log(`${i+1}. ${t.symbol || '-'} | الحجم: ${t.volume_24h} | الحاملين: ${t.holders} | العمر: ${t.age} | العنوان: ${t.address}`);
    });
    if (filtered.length === 0) console.log('لا توجد عملات مطابقة للشروط حالياً.');
  } catch (e) {
    console.error('خطأ Pump.fun:', e);
  }
}
main();
