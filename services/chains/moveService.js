import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

export function createMoveService(chainId) {
  const meta = CHAIN_METADATA[chainId];

  return {
    chainId,
    meta,

    validateAddress(address) {
      return typeof address === 'string' && /^0x[a-fA-F0-9]{64}$/.test(address.trim());
    },

    validateTxHash(txHash) {
      if (chainId === 'aptos') {
        return typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
      }
      return typeof txHash === 'string' && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(txHash.trim());
    },

    async verifyDeposit({ txHash }) {
      const treasury = getTreasuryAddress(chainId);

      if (chainId === 'aptos') {
        const res = await fetch(
          `https://fullnode.mainnet.aptoslabs.com/v1/transactions/by_hash/${encodeURIComponent(txHash)}`
        );
        if (!res.ok) {
          return { verified: false, reason: 'Transaction not found on Aptos Mainnet' };
        }
        const tx = await res.json();
        if (!tx.success) {
          return { verified: false, reason: `Aptos transaction failed: ${tx.vm_status}` };
        }

        const depositEvent = tx.events?.find(
          (e) =>
            String(e.type).includes('DepositEvent') &&
            String(e.guid?.account_address || '').toLowerCase() === treasury.toLowerCase()
        );

        if (!depositEvent) {
          return { verified: false, reason: `No Aptos DepositEvent to Treasury ${treasury}` };
        }

        return {
          verified: true,
          amount: (Number(depositEvent.data?.amount || 0) / 1e8).toFixed(8),
          asset: 'APT',
          confirmations: 1,
          to: treasury,
        };
      }

      // Sui JSON-RPC verification
      const res = await fetch('https://fullnode.mainnet.sui.io:443', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sui_getTransactionBlock',
          params: [txHash, { showEffects: true, showBalanceChanges: true }],
        }),
      });

      if (!res.ok) {
        return { verified: false, reason: 'Failed to reach Sui Mainnet RPC' };
      }

      const data = await res.json();
      const txBlock = data?.result;
      if (!txBlock || txBlock.effects?.status?.status !== 'success') {
        return { verified: false, reason: 'Sui transaction not found or failed' };
      }

      const suiChange = txBlock.balanceChanges?.find(
        (b) =>
          String(b.owner?.AddressOwner || '').toLowerCase() === treasury.toLowerCase() &&
          b.coinType === '0x2::sui::SUI' &&
          Number(b.amount) > 0
      );

      if (!suiChange) {
        return { verified: false, reason: `No SUI balance credit found for Treasury ${treasury}` };
      }

      return {
        verified: true,
        amount: (Number(suiChange.amount) / 1e9).toFixed(9),
        asset: 'SUI',
        confirmations: 1,
        to: treasury,
      };
    },

    async sendWithdrawal({ toAddress, amount }) {
      const secret = getHotWalletSecret(chainId);
      if (!secret) {
        const err = new Error(`Hot wallet secret ${meta.hotWalletEnv} is not configured`);
        err.statusCode = 503;
        err.requiredEnvVar = meta.hotWalletEnv;
        throw err;
      }

      throw new Error(
        `${meta.name} MoveVM transfer ready for ${amount} ${meta.symbol} -> ${toAddress}`
      );
    },
  };
}
