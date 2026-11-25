import { createEvmService, KNOWN_TOKEN_CONTRACTS } from './evmService.js';
import { createUtxoService } from './utxoService.js';
import { tronService } from './tronService.js';
import { tonService } from './tonService.js';
import { xrpService } from './xrpService.js';
import { xlmService } from './xlmService.js';
import { polkadotService } from './polkadotService.js';
import { algorandService } from './algorandService.js';
import { zilliqaService } from './zilliqaService.js';
import { createMoveService } from './moveService.js';
import { aeternityService } from './aeternityService.js';
import { solanaService } from './solanaService.js';
import { CHAIN_METADATA, getHotWalletSecret, getTreasuryAddress } from './chainConfig.js';

// Plugin-style chain service registry
const CHAIN_SERVICES = {
  // EVM family
  bsc: createEvmService('bsc'),
  ethereum: createEvmService('ethereum'),
  polygon: createEvmService('polygon'),
  arbitrum: createEvmService('arbitrum'),
  base: createEvmService('base'),
  optimism: createEvmService('optimism'),
  avalanche: createEvmService('avalanche'),
  robinhood: createEvmService('robinhood'),
  arc: createEvmService('arc'),

  // UTXO family
  bitcoin: createUtxoService('bitcoin'),
  litecoin: createUtxoService('litecoin'),
  bitcoincash: createUtxoService('bitcoincash'),
  zcash: createUtxoService('zcash'),
  viacoin: createUtxoService('viacoin'),

  // Non-EVM L1 modules
  solana: solanaService,
  tron: tronService,
  ton: tonService,
  xrp: xrpService,
  xlm: xlmService,
  polkadot: polkadotService,
  algorand: algorandService,
  zilliqa: zilliqaService,
  aeternity: aeternityService,
  aptos: createMoveService('aptos'),
  sui: createMoveService('sui'),
};

// Ticker / alias normalization map
const NETWORK_ALIASES = {
  eth: 'ethereum',
  bnb: 'bsc',
  matic: 'polygon',
  pol: 'polygon',
  arb: 'arbitrum',
  op: 'optimism',
  avax: 'avalanche',
  btc: 'bitcoin',
  ltc: 'litecoin',
  bch: 'bitcoincash',
  zec: 'zcash',
  via: 'viacoin',
  sol: 'solana',
  trx: 'tron',
  trc20: 'tron',
  ripple: 'xrp',
  stellar: 'xlm',
  dot: 'polkadot',
  algo: 'algorand',
  zil: 'zilliqa',
  ae: 'aeternity',
  apt: 'aptos',
};

export function resolveChainService(networkInput) {
  if (typeof networkInput !== 'string') return null;
  const normalized = networkInput.trim().toLowerCase();
  const canonicalId = NETWORK_ALIASES[normalized] || normalized;
  return CHAIN_SERVICES[canonicalId] || null;
}

export function listSupportedChains() {
  return Object.values(CHAIN_METADATA).map((meta) => {
    const extraTokens =
      meta.family === 'evm'
        ? Object.keys(KNOWN_TOKEN_CONTRACTS[meta.id] || {})
        : meta.id === 'tron'
          ? ['USDT']
          : [];
    const supportedTokens = Array.from(new Set([meta.symbol, ...extraTokens]));
    return {
      id: meta.id,
      name: meta.name,
      symbol: meta.symbol,
      family: meta.family,
      requiresMemo: meta.requiresMemo,
      requiresMemoOrTag: meta.requiresMemo,
      confirmationsRequired: meta.confirmationsRequired,
      estimatedFee: meta.estimatedFee,
      treasuryAddress: getTreasuryAddress(meta.id),
      hotWalletConfigured: Boolean(getHotWalletSecret(meta.id)),
      supportedTokens,
    };
  });
}
