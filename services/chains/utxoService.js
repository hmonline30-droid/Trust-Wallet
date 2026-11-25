import {
  CHAIN_METADATA,
  getAcceptedTreasuryAddresses,
  getHotWalletSecret,
} from './chainConfig.js';
import { fetchJsonWithTimeout } from './httpUtils.js';

const UTXO_EXPLORER_ENDPOINTS = {
  bitcoin: (txHash) => `https://blockstream.info/api/tx/${encodeURIComponent(txHash)}`,
  litecoin: (txHash) =>
    `https://api.blockchair.com/litecoin/dashboards/transaction/${encodeURIComponent(txHash)}`,
  bitcoincash: (txHash) =>
    `https://api.blockchair.com/bitcoin-cash/dashboards/transaction/${encodeURIComponent(txHash)}`,
  zcash: (txHash) =>
    `https://api.blockchair.com/zcash/dashboards/transaction/${encodeURIComponent(txHash)}`,
  viacoin: (txHash) => `https://explorer.viacoin.org/api/tx/${encodeURIComponent(txHash)}`,
};

const UTXO_ADDRESS_PATTERNS = {
  bitcoin: /^(bc1[ac-hj-np-z02-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  litecoin: /^(ltc1[ac-hj-np-z02-9]{25,87}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
  bitcoincash: /^(bitcoincash:)?[qp][a-z0-9]{41}$/i,
  zcash: /^(t1|t3|zs1)[a-zA-Z0-9]{32,75}$/,
  viacoin: /^(via1[ac-hj-np-z02-9]{25,87}|[VE][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
};

export function createUtxoService(chainId) {
  const meta = CHAIN_METADATA[chainId];

  return {
    chainId,
    meta,

    validateAddress(address) {
      if (typeof address !== 'string') return false;
      const pattern = UTXO_ADDRESS_PATTERNS[chainId];
      return pattern ? pattern.test(address.trim()) : false;
    },

    validateTxHash(txHash) {
      return typeof txHash === 'string' && /^[a-fA-F0-9]{64}$/.test(txHash.trim());
    },

    async verifyDeposit({ txHash }) {
      const acceptedAddresses = getAcceptedTreasuryAddresses(chainId).map((a) =>
        a.toLowerCase().replace(/^bitcoincash:/, '')
      );
      const endpointFn = UTXO_EXPLORER_ENDPOINTS[chainId];
      if (!endpointFn) {
        return { verified: false, reason: `No explorer configured for ${meta.name}` };
      }

      let data = await fetchJsonWithTimeout(endpointFn(txHash));
      if (!data && chainId === 'bitcoin') {
        data = await fetchJsonWithTimeout(`https://mempool.space/api/tx/${encodeURIComponent(txHash)}`);
      }
      if (!data) {
        return { verified: false, reason: `Transaction not found on ${meta.name} network` };
      }

      // Blockstream / Mempool.space Esplora format (Bitcoin)
      if (chainId === 'bitcoin' && Array.isArray(data.vout)) {
        const matchedSats = data.vout.reduce((sum, out) => {
          const addr = String(out.scriptpubkey_address || '').toLowerCase();
          return acceptedAddresses.includes(addr) ? sum + Number(out.value || 0) : sum;
        }, 0);

        if (matchedSats <= 0) {
          return {
            verified: false,
            reason: 'No output addressed to Master Bitcoin Treasury',
          };
        }

        const btcAmount = (matchedSats / 1e8).toFixed(8);
        const confirmed = Boolean(data.status?.confirmed);
        if (!confirmed) {
          return {
            verified: false,
            pending: true,
            amount: btcAmount,
            asset: meta.symbol,
            confirmations: 0,
            confirmationsRequired: meta.confirmationsRequired,
            to: acceptedAddresses[0],
            reason: 'Bitcoin transaction is unconfirmed in mempool',
          };
        }

        return {
          verified: true,
          amount: btcAmount,
          asset: meta.symbol,
          confirmations: meta.confirmationsRequired,
          to: acceptedAddresses[0],
        };
      }

      // Insight / Blockbook format (Viacoin)
      if (chainId === 'viacoin' && Array.isArray(data.vout)) {
        const confirmations = Number(data.confirmations ?? 0);
        if (confirmations < meta.confirmationsRequired) {
          return {
            verified: false,
            pending: true,
            confirmations,
            confirmationsRequired: meta.confirmationsRequired,
            reason: `Viacoin confirmations (${confirmations}/${meta.confirmationsRequired})`,
          };
        }

        const matchedCoins = data.vout.reduce((sum, out) => {
          const addrs = out.scriptPubKey?.addresses || [];
          const hit = addrs.some((a) => acceptedAddresses.includes(String(a).toLowerCase()));
          return hit ? sum + Number(out.value || 0) : sum;
        }, 0);

        if (matchedCoins <= 0) {
          return { verified: false, reason: 'No output addressed to Master Viacoin Treasury' };
        }

        return {
          verified: true,
          amount: matchedCoins.toFixed(8),
          asset: meta.symbol,
          confirmations,
          to: acceptedAddresses[0],
        };
      }

      // Blockchair format (LTC, BCH, ZEC) - key lookup normalized to lowercase
      const txPayload = data?.data?.[txHash] ?? data?.data?.[txHash.toLowerCase()];
      if (txPayload?.outputs) {
        const blockId = Number(txPayload.transaction?.block_id ?? -1);
        if (blockId <= 0) {
          return { verified: false, pending: true, reason: `${meta.name} transaction awaiting confirmation` };
        }
        const matchedSats = txPayload.outputs.reduce((sum, out) => {
          const addr = String(out.recipient || '').toLowerCase().replace(/^bitcoincash:/, '');
          return acceptedAddresses.includes(addr) ? sum + Number(out.value || 0) : sum;
        }, 0);

        if (matchedSats <= 0) {
          return { verified: false, reason: `No output addressed to Master ${meta.name} Treasury` };
        }

        return {
          verified: true,
          amount: (matchedSats / 1e8).toFixed(8),
          asset: meta.symbol,
          confirmations: meta.confirmationsRequired,
          to: acceptedAddresses[0],
        };
      }

      return { verified: false, reason: `Unable to parse ${meta.name} transaction output` };
    },

    async sendWithdrawal({ toAddress, amount }) {
      const wif = getHotWalletSecret(chainId);
      if (!wif) {
        const err = new Error(`Hot wallet secret ${meta.hotWalletEnv} is not configured in environment`);
        err.statusCode = 503;
        err.requiredEnvVar = meta.hotWalletEnv;
        throw err;
      }

      const tatumKey = process.env.TATUM_API_KEY?.trim();
      if (!tatumKey) {
        const err = new Error(
          `TATUM_API_KEY (or full-node RPC) is required to sign and broadcast ${meta.name} UTXO withdrawals`
        );
        err.statusCode = 503;
        err.requiredEnvVar = 'TATUM_API_KEY';
        throw err;
      }

      throw new Error(
        `${meta.name} withdrawal signing ready for ${amount} ${meta.symbol} -> ${toAddress}; connect your UTXO node/Tatum broadcast endpoint`
      );
    },
  };
}
