import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const algorandService = {
  chainId: 'algorand',
  meta: CHAIN_METADATA.algorand,

  validateAddress(address) {
    return typeof address === 'string' && /^[A-Z2-7]{58}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^[A-Z2-7]{52}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash }) {
    const treasury = getTreasuryAddress('algorand');
    const res = await fetch(
      `https://mainnet-idx.algonode.cloud/v2/transactions/${encodeURIComponent(txHash)}`
    );

    if (!res.ok) {
      return { verified: false, reason: 'Algorand transaction not found on AlgoNode Indexer' };
    }

    const data = await res.json();
    const tx = data?.transaction;
    if (!tx || !tx['confirmed-round']) {
      return { verified: false, reason: 'Algorand transaction is unconfirmed' };
    }

    const payment = tx['payment-transaction'];
    if (!payment || payment.receiver !== treasury) {
      return { verified: false, reason: `Payment receiver does not match Treasury ${treasury}` };
    }

    return {
      verified: true,
      amount: (Number(payment.amount || 0) / 1e6).toFixed(6),
      asset: 'ALGO',
      confirmations: 1,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount }) {
    const mnemonic = getHotWalletSecret('algorand');
    if (!mnemonic) {
      const err = new Error('Hot wallet secret ALGO_HOT_WALLET_MNEMONIC is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'ALGO_HOT_WALLET_MNEMONIC';
      throw err;
    }

    throw new Error(`algosdk payment transaction ready for ${amount} ALGO -> ${toAddress}`);
  },
};
