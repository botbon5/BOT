import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Metadata, createCreateMetadataAccountV3Instruction, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';

export async function createTokenMetadata({
  connection,
  mint,
  payer,
  name,
  symbol,
  uri
}: {
  connection: Connection,
  mint: PublicKey,
  payer: Keypair,
  name: string,
  symbol: string,
  uri: string
}) {
  // حساب metadata PDA
  const metadataPDA = await Metadata.getPDA(mint);

  // تعليمات إنشاء metadata
  const instruction = createCreateMetadataAccountV3Instruction({
    metadata: metadataPDA,
    mint,
    mintAuthority: payer.publicKey,
    payer: payer.publicKey,
    updateAuthority: payer.publicKey,
  }, {
    createMetadataAccountArgsV3: {
      data: {
        name,
        symbol,
        uri, // رابط JSON metadata (يفضل رفعه على arweave أو ipfs)
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
      },
      isMutable: true,
      collectionDetails: null
    }
  });

  const tx = new Transaction().add(instruction);
  const txid = await connection.sendTransaction(tx, [payer], { skipPreflight: false });
  return txid;
}
