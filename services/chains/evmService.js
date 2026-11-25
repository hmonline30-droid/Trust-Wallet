import { ethers } from 'ethers';
import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

const ERC20_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ERC20_ABI = [
  'function transfer(address to, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)',
];

// Known canonical USDT/USDC contract addresses per EVM chain for verification & withdrawals
export const KNOWN_TOKEN_CONTRACTS = {
  ethereum: {
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  },
  bsc: {
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
  },
  polygon: {
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
  },
  arbitrum: {
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  },
  base: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  },
  optimism: {
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
  },
  avalanche: {
    USDT: { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6 },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
  },
};

function getProvider(chainId) {
  const meta = CHAIN_METADATA[chainId];
  const rpcUrl = process.env[meta.rpcEnv]?.trim() || meta.defaultRpc;
  return new ethers.JsonRpcProvider(rpcUrl, meta.chainId);
}

export function createEvmService(chainId) {
  const meta = CHAIN_METADATA[chainId];

  return {
    chainId,
    meta,

    validateAddress(address) {
      return typeof address === 'string' && ethers.isAddress(address.trim());
    },

    validateTxHash(txHash) {
      return typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash.trim());
    },

    async verifyDeposit({ txHash, tokenType = 'NATIVE' }) {
      const treasuryAddress = getTreasuryAddress(chainId);
      const provider = getProvider(chainId);

      const [tx, receipt, currentBlock] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
        provider.getBlockNumber(),
      ]);

      if (!tx || !receipt) {
        return { verified: false, reason: `Transaction not found or pending on ${meta.name}` };
      }

      if (receipt.status !== 1) {
        return { verified: false, reason: 'On-chain transaction reverted (status 0)' };
      }

      const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1);
      if (confirmations < meta.confirmationsRequired) {
        return {
          verified: false,
          pending: true,
          confirmations,
          confirmationsRequired: meta.confirmationsRequired,
          reason: `Insufficient confirmations (${confirmations}/${meta.confirmationsRequired})`,
        };
      }

      const normalizedToken = String(tokenType || 'NATIVE').toUpperCase();
      const treasuryLower = treasuryAddress.toLowerCase();

      if (normalizedToken === 'NATIVE' || normalizedToken === meta.symbol) {
        if (!tx.to || tx.to.toLowerCase() !== treasuryLower) {
          return {
            verified: false,
            reason: `Destination ${tx.to || 'contract'} does not match Treasury ${treasuryAddress}`,
          };
        }
        if (tx.value <= 0n) {
          return { verified: false, reason: 'Zero-value native transfer cannot be credited' };
        }
        return {
          verified: true,
          amount: ethers.formatEther(tx.value),
          asset: meta.symbol,
          confirmations,
          to: tx.to,
          from: tx.from,
        };
      }

      // ERC-20 / BEP-20 Transfer log inspection: require a known canonical token contract
      const tokenSpec = KNOWN_TOKEN_CONTRACTS[chainId]?.[normalizedToken];
      if (!tokenSpec) {
        return {
          verified: false,
          reason: `Token ${normalizedToken} contract is not configured for ${meta.name}`,
        };
      }

      const matchingLog = receipt.logs.find((log) => {
        if (log.topics[0] !== ERC20_TRANSFER_TOPIC || log.topics.length < 3) return false;
        if (log.address.toLowerCase() !== tokenSpec.address.toLowerCase()) return false;
        const recipient = ethers.getAddress('0x' + log.topics[2].slice(26));
        return recipient.toLowerCase() === treasuryLower;
      });

      if (!matchingLog) {
        return {
          verified: false,
          reason: `No ${normalizedToken} Transfer event found to Treasury ${treasuryAddress}`,
        };
      }

      const rawValue = BigInt(matchingLog.data);
      if (rawValue <= 0n) {
        return { verified: false, reason: `Zero-value ${normalizedToken} transfer cannot be credited` };
      }

      return {
        verified: true,
        amount: ethers.formatUnits(rawValue, tokenSpec.decimals),
        asset: normalizedToken,
        confirmations,
        to: treasuryAddress,
        from: ethers.getAddress('0x' + matchingLog.topics[1].slice(26)),
      };
    },

    async sendWithdrawal({ toAddress, amount, tokenType = 'NATIVE' }) {
      const privateKey = getHotWalletSecret(chainId);
      if (!privateKey) {
        const err = new Error(`Hot wallet secret ${meta.hotWalletEnv} is not configured in environment`);
        err.statusCode = 503;
        err.requiredEnvVar = meta.hotWalletEnv;
        throw err;
      }

      const normalizedToken = String(tokenType || 'NATIVE').toUpperCase();
      const amountStr = Number(amount).toFixed(18).replace(/\.?0+$/, '');

      let parsedNativeValue = null;
      let tokenSpec = null;
      let parsedTokenUnits = null;

      if (normalizedToken === 'NATIVE' || normalizedToken === meta.symbol) {
        try {
          parsedNativeValue = ethers.parseEther(amountStr);
        } catch {
          const err = new Error(`Invalid native withdrawal amount precision for ${meta.symbol}`);
          err.statusCode = 400;
          throw err;
        }
      } else {
        tokenSpec = KNOWN_TOKEN_CONTRACTS[chainId]?.[normalizedToken];
        if (!tokenSpec) {
          const err = new Error(`Token ${normalizedToken} contract is not configured for ${meta.name}`);
          err.statusCode = 400;
          throw err;
        }
        try {
          parsedTokenUnits = ethers.parseUnits(
            Number(amount).toFixed(tokenSpec.decimals).replace(/\.?0+$/, ''),
            tokenSpec.decimals
          );
        } catch {
          const err = new Error(`Invalid withdrawal amount precision for ${normalizedToken}`);
          err.statusCode = 400;
          throw err;
        }
      }

      const provider = getProvider(chainId);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Check fee market data before signing
      const feeData = await provider.getFeeData();
      if (!feeData.gasPrice && !feeData.maxFeePerGas) {
        throw new Error(`Unable to fetch gas fee data for ${meta.name}`);
      }

      if (parsedNativeValue !== null) {
        const txResponse = await wallet.sendTransaction({
          to: toAddress,
          value: parsedNativeValue,
        });
        return {
          txHash: txResponse.hash,
          status: 'broadcasted',
          network: chainId,
          asset: meta.symbol,
          amount: String(amount),
          estimatedFee: meta.estimatedFee,
        };
      }

      const contract = new ethers.Contract(tokenSpec.address, ERC20_ABI, wallet);
      const txResponse = await contract.transfer(toAddress, parsedTokenUnits);
      return {
        txHash: txResponse.hash,
        status: 'broadcasted',
        network: chainId,
        asset: normalizedToken,
        amount: String(amount),
        estimatedFee: meta.estimatedFee,
      };
    },
  };
}
