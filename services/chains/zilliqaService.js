import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';
import { bech32ToHex20, fetchJsonWithTimeout } from './httpUtils.js';

export const zilliqaService = {
  chainId: 'zilliqa',
  meta: CHAIN_METADATA.zilliqa,

  validateAddress(address) {
    return (
      typeof address === 'string' &&
      (/^zil1[ac-hj-np-z02-9]{38}$/.test(address.trim()) ||
        /^0x[a-fA-F0-9]{40}$/.test(address.trim()))
    );
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^(0x)?[a-fA-F0-9]{64}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash }) {
    const treasury = getTreasuryAddress('zilliqa');
    const cleanHash = txHash.replace(/^0x/, '');

    const data = await fetchJsonWithTimeout('https://api.zilliqa.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '1',
        jsonrpc: '2.0',
        method: 'GetTransaction',
        params: [cleanHash],
      }),
    });

    const tx = data?.result;
    if (!tx || !tx.receipt?.success) {
      return { verified: false, reason: 'Zilliqa transaction not found or failed' };
    }

    const expectedHex = treasury.toLowerCase().startsWith('zil1')
      ? bech32ToHex20(treasury)
      : treasury.toLowerCase().replace(/^0x/, '');
    const actualHex = String(tx.toAddr || '').toLowerCase().replace(/^0x/, '');

    if (!expectedHex || actualHex !== expectedHex) {
      return {
        verified: false,
        reason: `Recipient ${tx.toAddr || 'unknown'} does not match Zilliqa Treasury ${treasury}`,
      };
    }

    const qaAmount = Number(tx.amount || 0);
    if (!Number.isFinite(qaAmount) || qaAmount <= 0) {
      return { verified: false, reason: 'Zero-value ZIL transfer cannot be credited' };
    }

    // Zilliqa QA = 10^12 per ZIL
    return {
      verified: true,
      amount: (qaAmount / 1e12).toFixed(6),
      asset: 'ZIL',
      confirmations: 1,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount }) {
    const privateKey = getHotWalletSecret('zilliqa');
    if (!privateKey) {
      const err = new Error('Hot wallet secret ZIL_HOT_WALLET_PRIVATE_KEY is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'ZIL_HOT_WALLET_PRIVATE_KEY';
      throw err;
    }

    throw new Error(`@zilliqa-js/zilliqa signing ready for ${amount} ZIL -> ${toAddress}`);
  },
};
