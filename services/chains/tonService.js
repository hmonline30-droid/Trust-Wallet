import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const tonService = {
  chainId: 'ton',
  meta: CHAIN_METADATA.ton,

  validateAddress(address) {
    return typeof address === 'string' && /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && txHash.trim().length >= 32;
  },

  async verifyDeposit({ txHash, memoOrTag }) {
    const treasury = getTreasuryAddress('ton');
    const apiKey = process.env.TONCENTER_API_KEY?.trim();
    const url = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(
      treasury
    )}&limit=20${apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : ''}`;

    const res = await fetch(url);
    if (!res.ok) {
      return { verified: false, reason: 'Failed to reach TonCenter API' };
    }

    const payload = await res.json();
    const match = payload?.result?.find((tx) => tx.transaction_id?.hash === txHash);
    if (!match) {
      return { verified: false, reason: `TON transaction ${txHash} not found for Treasury ${treasury}` };
    }

    const txMemo = match.in_msg?.message || '';
    if (memoOrTag && txMemo !== String(memoOrTag)) {
      return { verified: false, reason: 'TON deposit comment/memo mismatch' };
    }

    const nanoAmount = Number(match.in_msg?.value || 0);
    return {
      verified: true,
      amount: (nanoAmount / 1e9).toFixed(9),
      asset: 'TON',
      confirmations: 1,
      to: treasury,
      memoOrTag: txMemo,
    };
  },

  async sendWithdrawal({ toAddress, amount, memoOrTag }) {
    const mnemonic = getHotWalletSecret('ton');
    if (!mnemonic) {
      const err = new Error('Hot wallet secret TON_HOT_WALLET_MNEMONIC is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'TON_HOT_WALLET_MNEMONIC';
      throw err;
    }

    throw new Error(
      `TON WalletContractV4 transfer ready for ${amount} TON -> ${toAddress} (memo: ${memoOrTag || 'none'})`
    );
  },
};
