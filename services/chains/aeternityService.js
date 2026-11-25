import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const aeternityService = {
  chainId: 'aeternity',
  meta: CHAIN_METADATA.aeternity,

  validateAddress(address) {
    return typeof address === 'string' && /^ak_[1-9A-HJ-NP-Za-km-z]{48,52}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^th_[1-9A-HJ-NP-Za-km-z]{48,52}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash }) {
    const treasury = getTreasuryAddress('aeternity');
    const res = await fetch(`https://mainnet.aeternity.io/mdw/v3/transactions/${encodeURIComponent(txHash)}`);
    if (!res.ok) {
      return { verified: false, reason: 'Transaction not found on Aeternity Middleware' };
    }

    const tx = await res.json();
    if (!tx.block_height || tx.block_height <= 0) {
      return { verified: false, pending: true, reason: 'Aeternity transaction pending inclusion' };
    }

    if (tx.tx?.recipient_id !== treasury) {
      return { verified: false, reason: `Recipient ${tx.tx?.recipient_id} does not match Treasury ${treasury}` };
    }

    return {
      verified: true,
      amount: (Number(tx.tx?.amount || 0) / 1e18).toFixed(8),
      asset: 'AE',
      confirmations: CHAIN_METADATA.aeternity.confirmationsRequired,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount }) {
    const secret = getHotWalletSecret('aeternity');
    if (!secret) {
      const err = new Error('Hot wallet secret AE_HOT_WALLET_SECRET_KEY is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'AE_HOT_WALLET_SECRET_KEY';
      throw err;
    }

    throw new Error(`Aeternity SpendTx signing ready for ${amount} AE -> ${toAddress}`);
  },
};
