import { getConnection, loadKeypair } from '../wallet';
import { PublicKey } from '@solana/web3.js';
import { Network, getOrca, OrcaPoolConfig } from '@orca-so/sdk';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getAssociatedTokenAddress, getTokenAccount } from './tokenUtils';
import Decimal from 'decimal.js';

// شراء تلقائي للتوكن عبر Orca
export async function autoBuy(tokenMint: string, solAmount: number): Promise<string> {
  const connection = getConnection();
  const wallet = loadKeypair(JSON.parse(process.env.PRIVATE_KEY!));
  const network = process.env.NETWORK === 'devnet' ? Network.DEVNET : Network.MAINNET;
  const orca = getOrca(connection, network);
  // اكتشاف الـ pool المناسب تلقائياً (SOL/tokenMint)
  let pool = null;
  let foundConfig = null;
  for (const [key, value] of Object.entries(OrcaPoolConfig)) {
    try {
      const p = orca.getPool(value);
      const tokenAMint = p.getTokenA().mint.toBase58();
      const tokenBMint = p.getTokenB().mint.toBase58();
      if (
        (tokenAMint === tokenMint || tokenBMint === tokenMint) &&
        (tokenAMint === 'So11111111111111111111111111111111111111112' || tokenBMint === 'So11111111111111111111111111111111111111112')
      ) {
        pool = p;
        foundConfig = value;
        break;
      }
    } catch (e) { continue; }
  }
  if (!pool) {
    // محاولة إنشاء pool تلقائياً (ملاحظة: Orca SDK لا يدعم ذلك مباشرة)
    const orcaUiUrl = `https://www.orca.so/create-pool?baseMint=${tokenMint}&quoteMint=So11111111111111111111111111111111111111112`;
    console.error('🚫 لم يتم العثور على زوج تداول لهذا التوكن على Orca.');
    console.error('🔗 يمكنك إنشاء pool يدوياً عبر الرابط التالي:');
    console.error(orcaUiUrl);
    throw new Error('يجب إنشاء pool لهذا التوكن على Orca قبل التداول.');
  }
  const amount = new Decimal((solAmount * 1e9).toString()); // SOL إلى lamports
  const slippage = new Decimal(process.env.SLIPPAGE || '0.1');
  const swapPayload = await pool.swap(wallet, pool.getTokenB(), amount, slippage);
  const tx = await swapPayload.execute();
  return tx;
}

// جلب كمية التوكن المملوكة بعد الشراء
export async function getBoughtAmount(tokenMint: string, owner: string): Promise<number> {
  const connection = getConnection();
  const token = new PublicKey(tokenMint);
  const ownerPk = new PublicKey(owner);
  const tokenAccountAddress = await getAssociatedTokenAddress(
    token,
    ownerPk
  );
  const tokenAmount = await getTokenAccount(
    connection,
    tokenAccountAddress
  );
  return Number(tokenAmount.amount);
}
