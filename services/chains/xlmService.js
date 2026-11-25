import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const xlmService = {
  chainId: 'xlm',
  meta: CHAIN_METADATA.xlm,

  validateAddress(address) {
    return typeof address === 'string' && /^G[A-Z2-7]{55}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^[a-fA-F0-9]{64}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash, memoOrTag }) {
    const treasury = getTreasuryAddress('xlm');
    if (memoOrTag === undefined || memoOrTag === null || String(memoOrTag).trim() === '') {
      return { verified: false, reason: 'Memo (memoOrTag) is required for Stellar XLM deposits' };
    }

    const txRes = await fetch(`https://horizon.stellar.org/transactions/${encodeURIComponent(txHash)}`);
    if (!txRes.ok) {
      return { verified: false, reason: 'Stellar transaction not found on Horizon' };
    }

    const tx = await txRes.json();
    if (!tx.successful) {
      return { verified: false, reason: 'Stellar transaction failed on-chain' };
    }

    if (String(tx.memo ?? '').trim() !== String(memoOrTag).trim()) {
      return { verified: false, reason: `Stellar Memo mismatch (expected ${memoOrTag}, got ${tx.memo ?? 'none'})` };
    }

    const opsRes = await fetch(
      `https://horizon.stellar.org/transactions/${encodeURIComponent(txHash)}/operations`
    );
    const opsData = opsRes.ok ? await opsRes.json() : null;
    const paymentOp = opsData?._embedded?.records?.find(
      (op) =>
        (op.type === 'payment' || op.type === 'create_account') &&
        op.to === treasury &&
        (op.asset_type === 'native' || op.type === 'create_account')
    );

    if (!paymentOp) {
      return { verified: false, reason: `No native XLM payment found to Treasury ${treasury}` };
    }

    return {
      verified: true,
      amount: String(paymentOp.amount ?? paymentOp.starting_balance ?? '0'),
      asset: 'XLM',
      confirmations: 1,
      to: treasury,
      memoOrTag: String(tx.memo),
    };
  },

  async sendWithdrawal({ toAddress, amount, memoOrTag }) {
    const secret = getHotWalletSecret('xlm');
    if (!secret) {
      const err = new Error('Hot wallet secret XLM_HOT_WALLET_SECRET is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'XLM_HOT_WALLET_SECRET';
      throw err;
    }

    throw new Error(
      `Stellar Horizon transaction builder ready for ${amount} XLM -> ${toAddress} (Memo: ${memoOrTag ?? 'none'})`
    );
  },
};
