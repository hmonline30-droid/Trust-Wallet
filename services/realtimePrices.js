import { fetchJsonWithTimeout } from './chains/httpUtils.js';

const BINANCE_SYMBOL_TO_TOKEN_IDS = {
  BTCUSDT: ['btc'],
  ETHUSDT: ['eth'],
  BNBUSDT: ['bnb'],
  SOLUSDT: ['sol'],
  TRXUSDT: ['trx'],
  TWTUSDT: ['twt'],
  USDCUSDT: ['usdc'],
  LINKUSDT: ['link'],
  UNIUSDT: ['uni'],
  ARBUSDT: ['arb'],
  BCHUSDT: ['bch'],
  ADAUSDT: ['ada'],
  KAVAUSDT: ['kava'],
};

const COINGECKO_ID_TO_TOKEN_IDS = {
  bitcoin: ['btc'],
  ethereum: ['eth'],
  binancecoin: ['bnb'],
  solana: ['sol'],
  tron: ['trx'],
  'trust-wallet-token': ['twt'],
  tether: ['usdt', 'usdt-trc20', 'usdt-bep20'],
  'usd-coin': ['usdc'],
  chainlink: ['link'],
  uniswap: ['uni'],
  arbitrum: ['arb'],
  'bitcoin-cash': ['bch'],
  cardano: ['ada'],
  kava: ['kava'],
};

let cachedPrices = {};
let lastFetchAt = 0;
let inflightPromise = null;

async function fetchFromBinance() {
  const symbols = Object.keys(BINANCE_SYMBOL_TO_TOKEN_IDS);
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const data = await fetchJsonWithTimeout(url, {}, 7000);
  if (!Array.isArray(data) || data.length === 0) return null;

  const prices = {
    usdt: { priceUsd: 1.0, change24h: 0.01 },
    'usdt-trc20': { priceUsd: 1.0, change24h: 0.01 },
    'usdt-bep20': { priceUsd: 1.0, change24h: 0.01 },
  };

  for (const row of data) {
    const tokenIds = BINANCE_SYMBOL_TO_TOKEN_IDS[row.symbol];
    if (!tokenIds) continue;
    const priceUsd = Number(row.lastPrice);
    const change24h = Number(row.priceChangePercent);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;

    for (const id of tokenIds) {
      prices[id] = {
        priceUsd,
        change24h: Number.isFinite(change24h) ? Number(change24h.toFixed(2)) : 0,
      };
    }
  }

  return Object.keys(prices).length > 2 ? prices : null;
}

async function fetchFromCoinGecko() {
  const ids = Object.keys(COINGECKO_ID_TO_TOKEN_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;
  const data = await fetchJsonWithTimeout(url, {}, 7000);
  if (!data || typeof data !== 'object') return null;

  const prices = {};
  for (const [cgId, tokenIds] of Object.entries(COINGECKO_ID_TO_TOKEN_IDS)) {
    const entry = data[cgId];
    const priceUsd = Number(entry?.usd);
    const change24h = Number(entry?.usd_24h_change);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) continue;
    for (const id of tokenIds) {
      prices[id] = {
        priceUsd,
        change24h: Number.isFinite(change24h) ? Number(change24h.toFixed(2)) : 0,
      };
    }
  }

  return Object.keys(prices).length > 0 ? prices : null;
}

export async function getLivePrices(force = false) {
  const now = Date.now();
  if (!force && now - lastFetchAt < 10000 && Object.keys(cachedPrices).length > 0) {
    return { prices: cachedPrices, updatedAt: new Date(lastFetchAt).toISOString(), cached: true };
  }

  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const next = (await fetchFromBinance()) || (await fetchFromCoinGecko());
      if (next) {
        cachedPrices = { ...cachedPrices, ...next };
        lastFetchAt = Date.now();
      }
      return {
        prices: cachedPrices,
        updatedAt: lastFetchAt ? new Date(lastFetchAt).toISOString() : new Date().toISOString(),
        cached: false,
      };
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export async function getPricesHandler(_req, res) {
  const result = await getLivePrices(false);
  return res.json({
    ok: true,
    ...result,
  });
}
