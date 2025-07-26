// strategyTest.js
// اختبار فلترة العملات حسب الاستراتيجية في الطرفية

const tokens = [
  { symbol: 'BONK', volume: 10, holders: 50, age: 5, address: 'token1' },
  { symbol: 'DOG', volume: 5, holders: 40, age: 4, address: 'token2' },
  { symbol: 'CAT', volume: 8, holders: 35, age: 3, address: 'token3' },
  { symbol: 'FOX', volume: 7, holders: 34, age: 3, address: 'token4' },
  { symbol: 'BIRD', volume: 6, holders: 33, age: 2, address: 'token5' }
];

const strategy = { minVolume: 7, minHolders: 34, minAge: 3, enabled: true };

const filtered = tokens.filter(t =>
  t.volume >= strategy.minVolume &&
  t.holders >= strategy.minHolders &&
  t.age >= strategy.minAge
);

console.log('نتائج العملات المطابقة للاستراتيجية:');
filtered.forEach((t, i) => {
  console.log(`${i+1}. ${t.symbol} | الحجم: ${t.volume} | الحاملين: ${t.holders} | العمر: ${t.age} | العنوان: ${t.address}`);
});
