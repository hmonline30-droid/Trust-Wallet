import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const xrpService = {
  chainId: 'xrp',
  meta: CHAIN_METADATA.xrp,

  validateAddress(address) {
    return typeof address === 'string' && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^[a-fA-F0-9]{64}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash, memoOrTag }) {
    const treasury = getTreasuryAddress('xrp');
    if (memoOrTag === undefined || memoOrTag === null || String(memoOrTag).trim() === '') {
      return { verified: false, reason: 'Destination Tag (memoOrTag) is required for XRP deposits' };
    }

    const res = await fetch('https://xrplcluster.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tx',
        params: [{ transaction: txHash, binary: false }],
      }),
    });

    if (!res.ok) {
      return { verified: false, reason: 'Failed to reach XRPL cluster RPC' };
    }

    const data = await res.json();
    const result = data?.result;
    if (!result || result.status !== 'success') {
      return { verified: false, reason: 'XRP transaction not found on ledger' };
    }

    if (!result.validated) {
      return { verified: false, pending: true, reason: 'XRP transaction not yet validated' };
    }

    if (result.meta?.TransactionResult !== 'tesSUCCESS') {
      return { verified: false, reason: `XRPL execution failed: ${result.meta?.TransactionResult}` };
    }

    if (result.Destination !== treasury) {
      return { verified: false, reason: `Destination ${result.Destination} does not match Treasury ${treasury}` };
    }

    if (String(result.DestinationTag ?? '') !== String(memoOrTag).trim()) {
      return {
        verified: false,
        reason: `DestinationTag mismatch (expected ${memoOrTag}, got ${result.DestinationTag ?? 'none'})`,
      };
    }

    const deliveredDrops = Number(result.meta?.delivered_amount ?? result.Amount ?? 0);
    if (!Number.isFinite(deliveredDrops) || deliveredDrops <= 0) {
      return { verified: false, reason: 'Non-XRP or zero delivered amount' };
    }

    return {
      verified: true,
      amount: (deliveredDrops / 1e6).toFixed(6),
      asset: 'XRP',
      confirmations: 1,
      to: treasury,
      memoOrTag: String(result.DestinationTag),
    };
  },

  async sendWithdrawal({ toAddress, amount, memoOrTag }) {
    const seed = getHotWalletSecret('xrp');
    if (!seed) {
      const err = new Error('Hot wallet secret XRP_HOT_WALLET_SEED is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'XRP_HOT_WALLET_SEED';
      throw err;
    }

    if (memoOrTag !== undefined && memoOrTag !== null && String(memoOrTag).trim() !== '') {
      const tagNum = Number(memoOrTag);
      if (!Number.isInteger(tagNum) || tagNum < 0 || tagNum > 4294967295) {
        const err = new Error('XRP Destination Tag must be an unsigned 32-bit integer');
        err.statusCode = 400;
        throw err;
      }
    }

    throw new Error(
      `XRPL client Payment signing ready for ${amount} XRP -> ${toAddress} (Tag: ${memoOrTag ?? 'none'})`
    );
  },
};
