import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';
import { fetchJsonWithTimeout, normalizeTronHex20 } from './httpUtils.js';

const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export const tronService = {
  chainId: 'tron',
  meta: CHAIN_METADATA.tron,

  validateAddress(address) {
    return typeof address === 'string' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
  },

  validateTxHash(txHash) {
    return typeof txHash === 'string' && /^[a-fA-F0-9]{64}$/.test(txHash.trim());
  },

  async verifyDeposit({ txHash, tokenType = 'TRX' }) {
    const treasury = getTreasuryAddress('tron');
    const treasuryHex20 = normalizeTronHex20(treasury);
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.TRONGRID_API_KEY) {
      headers['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
    }

    const info = await fetchJsonWithTimeout('https://api.trongrid.io/wallet/gettransactioninfobyid', {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: txHash }),
    });

    if (!info || !info.id) {
      return { verified: false, reason: 'Transaction not found on TRON' };
    }

    if (info.receipt?.result && info.receipt.result !== 'SUCCESS') {
      return { verified: false, reason: `TRON transaction failed: ${info.receipt.result}` };
    }

    const normalizedToken = String(tokenType || 'TRX').toUpperCase();
    if (normalizedToken === 'USDT' || normalizedToken === 'TRC20') {
      const eventsData = await fetchJsonWithTimeout(
        `https://api.trongrid.io/v1/transactions/${encodeURIComponent(txHash)}/events`,
        { headers }
      );
      const transferEvt = eventsData?.data?.find((evt) => {
        if (evt.event_name !== 'Transfer') return false;
        if (evt.contract_address !== TRON_USDT_CONTRACT) return false;
        const evtToHex20 = normalizeTronHex20(evt.result?.to);
        return Boolean(evtToHex20 && treasuryHex20 && evtToHex20 === treasuryHex20);
      });

      if (!transferEvt) {
        return { verified: false, reason: `No TRC-20 USDT Transfer to ${treasury}` };
      }

      const rawAmount = Number(transferEvt.result?.value || 0);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        return { verified: false, reason: 'Zero-value TRC-20 transfer cannot be credited' };
      }

      return {
        verified: true,
        amount: (rawAmount / 1e6).toFixed(6),
        asset: 'USDT',
        confirmations: CHAIN_METADATA.tron.confirmationsRequired,
        to: treasury,
      };
    }

    // Native TRX verification via gettransactionbyid TransferContract
    const txData = await fetchJsonWithTimeout('https://api.trongrid.io/wallet/gettransactionbyid', {
      method: 'POST',
      headers,
      body: JSON.stringify({ value: txHash }),
    });

    const contract = txData?.raw_data?.contract?.[0];
    if (!contract || contract.type !== 'TransferContract') {
      return { verified: false, reason: 'TRON transaction is not a native TRX TransferContract' };
    }

    const val = contract.parameter?.value;
    const toHex20 = normalizeTronHex20(val?.to_address);
    if (!toHex20 || !treasuryHex20 || toHex20 !== treasuryHex20) {
      return { verified: false, reason: `Destination does not match TRON Treasury ${treasury}` };
    }

    const sunAmount = Number(val?.amount || 0);
    if (!Number.isFinite(sunAmount) || sunAmount <= 0) {
      return { verified: false, reason: 'Zero-value TRX transfer cannot be credited' };
    }

    return {
      verified: true,
      amount: (sunAmount / 1e6).toFixed(6),
      asset: 'TRX',
      confirmations: CHAIN_METADATA.tron.confirmationsRequired,
      to: treasury,
    };
  },

  async sendWithdrawal({ toAddress, amount, tokenType = 'TRX' }) {
    const privateKey = getHotWalletSecret('tron');
    if (!privateKey) {
      const err = new Error('Hot wallet secret TRON_HOT_WALLET_PRIVATE_KEY is not configured');
      err.statusCode = 503;
      err.requiredEnvVar = 'TRON_HOT_WALLET_PRIVATE_KEY';
      throw err;
    }

    throw new Error(
      `TRON withdrawal signing requires tronweb FullNode initialization for ${amount} ${tokenType} -> ${toAddress}`
    );
  },
};
