import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export const polkadotService = {
  chainId: 'polkadot',
  meta: CHAIN_METADATA.polkadot,

  validateAddress(address) {
    return typeof address === 'string' && /^1[a-km-zA-HJ-NP-Z1-9]{46,47}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash }) {
    const treasury = getTreasuryAddress('polkadot');
    const res = await fetch('https://polkadot.api.subscan.io/api/scan/extrinsic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: txHash }),
    });

    if (!res.ok) {
      return { verified: false, reason: 'Failed to reach Polkadot Subscan API' };
    }

    const payload = await res.json();
    const ext = payload?.data;
    if (!ext) {
      return { verified: false, reason: 'Extrinsic not found on Polkadot' };
    }

    if (!ext.success || !ext.finalized) {
      return { verified: false, reason: 'Polkadot extrinsic is not finalized or failed' };
    }

    const transfer = ext.transfer;
    if (!transfer || transfer.to !== treasury) {
      return { verified: false, reason: `Extrinsic recipient does not match Treasury ${treasury}` };
    }

    return {
      verified: true,
      amount: String(transfer.amount || '0'),
      asset: 'DOT',
      confirmations: CHAIN_METADATA.polkadot.confirmationsRequired,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount }) {
    const mnemonic = getHotWalletSecret('polkadot');
    if (!mnemonic) {
      const err = new Error('Hot wallet secret DOT_HOT_WALLET_MNEMONIC is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'DOT_HOT_WALLET_MNEMONIC';
      throw err;
    }

    throw new Error(
      `Polkadot ApiPromise balances.transferKeepAlive ready for ${amount} DOT -> ${toAddress}`
    );
  },
};
