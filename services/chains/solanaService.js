import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const solanaService = {
  chainId: 'solana',
  meta: CHAIN_METADATA.solana,

  validateAddress(address) {
    return typeof address === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash }) {
    const treasury = getTreasuryAddress('solana');
    const res = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txHash, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
      }),
    });

    if (!res.ok) {
      return { verified: false, reason: 'Failed to reach Solana Mainnet RPC' };
    }

    const data = await res.json();
    const tx = data?.result;
    if (!tx) {
      return { verified: false, reason: 'Solana signature not found' };
    }

    if (tx.meta?.err) {
      return { verified: false, reason: 'Solana transaction failed on-chain' };
    }

    const keys = tx.transaction?.message?.accountKeys || [];
    const idx = keys.findIndex((k) => (typeof k === 'string' ? k : k.pubkey) === treasury);
    if (idx === -1) {
      return { verified: false, reason: `Treasury ${treasury} not present in Solana transaction accounts` };
    }

    const pre = Number(tx.meta?.preBalances?.[idx] ?? 0);
    const post = Number(tx.meta?.postBalances?.[idx] ?? 0);
    const deltaLamports = post - pre;
    if (deltaLamports <= 0) {
      return { verified: false, reason: 'No positive SOL balance delta for Treasury' };
    }

    return {
      verified: true,
      amount: (deltaLamports / 1e9).toFixed(9),
      asset: 'SOL',
      confirmations: CHAIN_METADATA.solana.confirmationsRequired,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount }) {
    const secret = getHotWalletSecret('solana');
    if (!secret) {
      const err = new Error('Hot wallet secret SOLANA_HOT_WALLET_PRIVATE_KEY is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'SOLANA_HOT_WALLET_PRIVATE_KEY';
      throw err;
    }

    throw new Error(`Solana SystemProgram.transfer ready for ${amount} SOL -> ${toAddress}`);
  },
};
