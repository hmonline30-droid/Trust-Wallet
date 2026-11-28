import { WebSocketServer, WebSocket } from 'ws';
import { ethers } from 'ethers';
import { CHAIN_METADATA, getTreasuryAddress } from './chains/chainConfig.js';
import { resolveChainService } from './chains/index.js';
import { KNOWN_TOKEN_CONTRACTS } from './chains/evmService.js';
import { fetchJsonWithTimeout, normalizeTronHex20 } from './chains/httpUtils.js';
import { getLivePrices } from './realtimePrices.js';

const ERC20_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

/**
 * Authoritative server-side real-time payment store (deduped by replayKey).
 */
const paymentStore = new Map();
const watchedAddresses = new Map(); // chainId -> Set<string>
const lastCheckedEvmBlock = new Map(); // chainId -> number
const pendingWatchQueue = new Map(); // replayKey -> { network, txHash, tokenType, memoOrTag, attempts }

let wss = null;
let pollTimer = null;
let pendingTimer = null;
let priceTimer = null;
let isPolling = false;

function initDefaultWatchedAddresses() {
  for (const chainId of ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'tron', 'bitcoin', 'solana', 'xrp']) {
    const addr = getTreasuryAddress(chainId);
    if (addr) {
      addWatchedAddress(chainId, addr);
    }
  }
}

export function addWatchedAddress(chainId, address) {
  if (!chainId || !address || typeof address !== 'string') return;
  const clean = address.trim();
  if (!clean) return;
  if (!watchedAddresses.has(chainId)) {
    watchedAddresses.set(chainId, new Set());
  }
  watchedAddresses.get(chainId).add(clean);
}

function makeReplayKey(network, txHash, id) {
  if (txHash) return `${network}:${String(txHash).toLowerCase()}`;
  return String(id);
}

function broadcast(payload) {
  if (!wss) return;
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Idempotently inserts or updates a real payment event and broadcasts it via WebSocket.
 */
export function recordPaymentEvent(eventInput) {
  const network = eventInput.network || 'ethereum';
  const txHash = eventInput.txHash ? String(eventInput.txHash).trim() : undefined;
  const replayKey = makeReplayKey(network, txHash, eventInput.id || `pay-${Date.now()}`);
  const existing = paymentStore.get(replayKey);

  const normalized = {
    id: existing?.id || eventInput.id || `pay-${network}-${txHash ? txHash.slice(0, 12) : Date.now()}`,
    type: eventInput.type || existing?.type || 'receive',
    tokenId: eventInput.tokenId || existing?.tokenId,
    asset: eventInput.asset || existing?.asset || 'USDT',
    amount: eventInput.amount ?? existing?.amount,
    title: eventInput.title || existing?.title,
    subtitle: eventInput.subtitle || existing?.subtitle,
    amountText: eventInput.amountText || existing?.amountText,
    usdText: eventInput.usdText || existing?.usdText || '',
    timestamp: eventInput.timestamp || existing?.timestamp || 'Just now',
    network,
    status: eventInput.status || existing?.status || 'Confirmed',
    txHash,
    counterparty: eventInput.counterparty || existing?.counterparty,
    feeText: eventInput.feeText || existing?.feeText,
    confirmations: eventInput.confirmations ?? existing?.confirmations,
    confirmationsRequired: eventInput.confirmationsRequired ?? existing?.confirmationsRequired,
    applyBalance: Boolean(eventInput.applyBalance),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  if (!existing) {
    paymentStore.set(replayKey, normalized);
    broadcast({ type: 'payment:created', payment: normalized });
    return { mode: 'created', payment: normalized };
  }

  const changed =
    existing.status !== normalized.status ||
    existing.confirmations !== normalized.confirmations ||
    existing.subtitle !== normalized.subtitle ||
    existing.amountText !== normalized.amountText;

  paymentStore.set(replayKey, normalized);
  if (changed) {
    broadcast({ type: 'payment:updated', payment: normalized });
  }
  return { mode: changed ? 'updated' : 'unchanged', payment: normalized };
}

export function getRealtimePayments() {
  return Array.from(paymentStore.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 100);
}

export function clearRealtimePayments() {
  paymentStore.clear();
  pendingWatchQueue.clear();
  broadcast({ type: 'payment:synced', payments: [], serverTime: new Date().toISOString() });
}

function formatPaymentDisplay({ network, asset, amount, direction, status, confirmations, confirmationsRequired, counterparty, txHash, feeText }) {
  const meta = CHAIN_METADATA[network];
  const networkName = meta?.name || network;
  const numAmount = Number(amount);
  const formattedAmt = Number.isFinite(numAmount)
    ? numAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })
    : String(amount || '0');
  const isOut = direction === 'out';
  const sign = isOut ? '-' : '+';
  const shortCounterparty =
    counterparty && counterparty.length > 14
      ? `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`
      : counterparty || networkName;

  const statusLabel =
    status === 'Pending' && confirmations !== undefined && confirmationsRequired !== undefined
      ? `Pending (${confirmations}/${confirmationsRequired})`
      : status;

  return {
    type: isOut ? 'send' : 'receive',
    network,
    asset,
    amount: Number.isFinite(numAmount) ? numAmount : undefined,
    title: `${isOut ? 'Sent' : 'Received'} ${asset} (${networkName})`,
    subtitle: `${isOut ? 'To' : 'From'} ${shortCounterparty} · ${statusLabel}`,
    amountText: `${sign}${formattedAmt} ${asset}`,
    usdText: asset === 'USDT' || asset === 'USDC'
      ? `${isOut ? '-' : ''}$${(Number.isFinite(numAmount) ? numAmount : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${formattedAmt} ${asset}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status,
    txHash,
    counterparty,
    feeText,
    confirmations,
    confirmationsRequired,
  };
}

/**
 * Tracks a real on-chain transaction hash, immediately emitting Pending/Confirmed state
 * and continuing to watch pending transactions until finality.
 */
export async function trackOnChainPayment({ network, txHash, tokenType = 'NATIVE', memoOrTag, applyBalance = true }) {
  const service = resolveChainService(network);
  if (!service) {
    return { ok: false, statusCode: 400, error: `Unsupported network: ${network}` };
  }

  const cleanHash = String(txHash || '').trim();
  if (!service.validateTxHash(cleanHash)) {
    return { ok: false, statusCode: 400, error: `Invalid txHash format for ${service.meta.name}` };
  }

  const verification = await service.verifyDeposit({
    txHash: cleanHash,
    tokenType,
    memoOrTag,
  });

  if (verification.verified) {
    const replayKey = makeReplayKey(service.chainId, cleanHash);
    pendingWatchQueue.delete(replayKey);

    const formatted = formatPaymentDisplay({
      network: service.chainId,
      asset: verification.asset,
      amount: verification.amount,
      direction: 'in',
      status: 'Confirmed',
      confirmations: verification.confirmations,
      confirmationsRequired: service.meta.confirmationsRequired,
      counterparty: verification.from || verification.to,
      txHash: cleanHash,
      feeText: service.meta.estimatedFee,
    });

    const result = recordPaymentEvent({ ...formatted, applyBalance });
    return { ok: true, status: 'confirmed', payment: result.payment, verification };
  }

  if (verification.pending) {
    const replayKey = makeReplayKey(service.chainId, cleanHash);
    pendingWatchQueue.set(replayKey, {
      network: service.chainId,
      txHash: cleanHash,
      tokenType,
      memoOrTag,
      attempts: 0,
    });

    const formatted = formatPaymentDisplay({
      network: service.chainId,
      asset: String(tokenType).toUpperCase() === 'NATIVE' ? service.meta.symbol : String(tokenType).toUpperCase(),
      amount: verification.amount || 0,
      direction: 'in',
      status: 'Pending',
      confirmations: verification.confirmations ?? 0,
      confirmationsRequired: verification.confirmationsRequired ?? service.meta.confirmationsRequired,
      counterparty: service.meta.name,
      txHash: cleanHash,
      feeText: service.meta.estimatedFee,
    });

    const result = recordPaymentEvent({ ...formatted, applyBalance: false });
    return {
      ok: true,
      status: 'pending',
      payment: result.payment,
      verification,
    };
  }

  return {
    ok: false,
    statusCode: 400,
    error: verification.reason || 'Transaction could not be verified on-chain',
    verification,
  };
}

/**
 * Polls recent EVM ERC-20/BEP-20 Transfer logs to watched addresses via public JSON-RPC.
 */
async function pollEvmTransfers(chainId) {
  const meta = CHAIN_METADATA[chainId];
  const addresses = Array.from(watchedAddresses.get(chainId) || []);
  const contracts = KNOWN_TOKEN_CONTRACTS[chainId];
  if (!meta || addresses.length === 0 || !contracts) return;

  const rpcUrl = process.env[meta.rpcEnv]?.trim() || meta.defaultRpc;
  if (!rpcUrl) return;

  const provider = new ethers.JsonRpcProvider(rpcUrl, meta.chainId);
  const latestBlock = await provider.getBlockNumber();
  const prevBlock = lastCheckedEvmBlock.get(chainId);

  // Start baseline at latestBlock - 25 on first run so we catch fresh transfers without flooding ancient history
  const fromBlock = prevBlock ? Math.min(prevBlock + 1, latestBlock) : Math.max(0, latestBlock - 20);
  lastCheckedEvmBlock.set(chainId, latestBlock);
  if (fromBlock > latestBlock) return;

  const paddedTargets = addresses
    .filter((a) => ethers.isAddress(a))
    .map((a) => ethers.zeroPadValue(a.toLowerCase(), 32));
  if (paddedTargets.length === 0) return;

  for (const [symbol, spec] of Object.entries(contracts)) {
    const logs = await provider.getLogs({
      address: spec.address,
      fromBlock,
      toBlock: latestBlock,
      topics: [ERC20_TRANSFER_TOPIC, null, paddedTargets],
    });

    for (const log of logs) {
      const val = BigInt(log.data);
      if (val <= 0n) continue;
      const amount = ethers.formatUnits(val, spec.decimals);
      const fromAddr = ethers.getAddress('0x' + log.topics[1].slice(26));
      const confirmations = Math.max(1, latestBlock - log.blockNumber + 1);
      const isConfirmed = confirmations >= meta.confirmationsRequired;

      const formatted = formatPaymentDisplay({
        network: chainId,
        asset: symbol,
        amount,
        direction: 'in',
        status: isConfirmed ? 'Confirmed' : 'Pending',
        confirmations,
        confirmationsRequired: meta.confirmationsRequired,
        counterparty: fromAddr,
        txHash: log.transactionHash,
        feeText: meta.estimatedFee,
      });

      const replayKey = makeReplayKey(chainId, log.transactionHash);
      const isNew = !paymentStore.has(replayKey);
      recordPaymentEvent({
        ...formatted,
        applyBalance: isConfirmed && isNew,
      });

      if (!isConfirmed) {
        pendingWatchQueue.set(replayKey, {
          network: chainId,
          txHash: log.transactionHash,
          tokenType: symbol,
          attempts: 0,
        });
      }
    }
  }
}

/**
 * Polls TRON TronGrid for both native TRX (TransferContract) and TRC-20 USDT transfers.
 */
async function pollTronTransfers() {
  const addresses = Array.from(watchedAddresses.get('tron') || []);
  if (addresses.length === 0) return;
  const headers = {};
  if (process.env.TRONGRID_API_KEY) {
    headers['TRON-PRO-API-KEY'] = process.env.TRONGRID_API_KEY;
  }

  const TRON_USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  for (const addr of addresses) {
    const targetHex20 = normalizeTronHex20(addr);

    // 1. TRC-20 USDT incoming & outgoing
    const trc20Data = await fetchJsonWithTimeout(
      `https://api.trongrid.io/v1/accounts/${encodeURIComponent(addr)}/transactions/trc20?limit=8&contract_address=${TRON_USDT}`,
      { headers },
      6000
    );
    const trc20Items = Array.isArray(trc20Data?.data) ? trc20Data.data : [];
    for (const tx of trc20Items) {
      if (!tx.transaction_id || !tx.value) continue;
      const ageMs = Date.now() - Number(tx.block_timestamp || 0);
      if (!Number.isFinite(ageMs) || ageMs > 2 * 60 * 60 * 1000) continue;

      const toHex20 = normalizeTronHex20(tx.to);
      const fromHex20 = normalizeTronHex20(tx.from);
      const isIncoming = Boolean(targetHex20 && toHex20 && toHex20 === targetHex20);
      const isOutgoing = Boolean(targetHex20 && fromHex20 && fromHex20 === targetHex20);
      if (!isIncoming && !isOutgoing) continue;

      const amount = Number(tx.value) / 1e6;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const formatted = formatPaymentDisplay({
        network: 'tron',
        asset: 'USDT',
        amount: amount.toFixed(6),
        direction: isIncoming ? 'in' : 'out',
        status: 'Confirmed',
        confirmations: CHAIN_METADATA.tron.confirmationsRequired,
        confirmationsRequired: CHAIN_METADATA.tron.confirmationsRequired,
        counterparty: isIncoming ? (tx.from || addr) : (tx.to || addr),
        txHash: tx.transaction_id,
        feeText: CHAIN_METADATA.tron.estimatedFee,
      });

      const replayKey = makeReplayKey('tron', tx.transaction_id);
      const isNew = !paymentStore.has(replayKey);
      recordPaymentEvent({
        ...formatted,
        applyBalance: isNew,
      });
    }

    // 2. Native TRX (TransferContract) incoming & outgoing
    const trxData = await fetchJsonWithTimeout(
      `https://api.trongrid.io/v1/accounts/${encodeURIComponent(addr)}/transactions?limit=8`,
      { headers },
      6000
    );
    const trxItems = Array.isArray(trxData?.data) ? trxData.data : [];
    for (const tx of trxItems) {
      if (!tx.txID) continue;
      const contract = tx.raw_data?.contract?.[0];
      if (!contract || contract.type !== 'TransferContract') continue;
      if (tx.ret?.[0]?.contractRet && tx.ret[0].contractRet !== 'SUCCESS') continue;

      const ts = Number(tx.block_timestamp || tx.raw_data?.timestamp || 0);
      const ageMs = Date.now() - ts;
      if (!Number.isFinite(ageMs) || ageMs > 2 * 60 * 60 * 1000) continue;

      const val = contract.parameter?.value || {};
      const toHex20 = normalizeTronHex20(val.to_address);
      const ownerHex20 = normalizeTronHex20(val.owner_address);
      const isIncoming = Boolean(targetHex20 && toHex20 && toHex20 === targetHex20);
      const isOutgoing = Boolean(targetHex20 && ownerHex20 && ownerHex20 === targetHex20);
      if (!isIncoming && !isOutgoing) continue;

      const trxAmount = Number(val.amount || 0) / 1e6;
      if (!Number.isFinite(trxAmount) || trxAmount <= 0) continue;

      const formatted = formatPaymentDisplay({
        network: 'tron',
        asset: 'TRX',
        amount: trxAmount.toFixed(6),
        direction: isIncoming ? 'in' : 'out',
        status: 'Confirmed',
        confirmations: CHAIN_METADATA.tron.confirmationsRequired,
        confirmationsRequired: CHAIN_METADATA.tron.confirmationsRequired,
        counterparty: addr,
        txHash: tx.txID,
        feeText: CHAIN_METADATA.tron.estimatedFee,
      });

      const replayKey = makeReplayKey('tron', tx.txID);
      const isNew = !paymentStore.has(replayKey);
      recordPaymentEvent({
        ...formatted,
        applyBalance: isNew,
      });
    }
  }
}

/**
 * Polls Bitcoin mempool & confirmed transactions via Blockstream / Mempool.space for watched BTC addresses.
 */
async function pollBitcoinTransfers() {
  const addresses = Array.from(watchedAddresses.get('bitcoin') || []);
  for (const addr of addresses) {
    let txs = await fetchJsonWithTimeout(
      `https://blockstream.info/api/address/${encodeURIComponent(addr)}/txs`,
      {},
      6000
    );
    if (!Array.isArray(txs)) {
      txs = await fetchJsonWithTimeout(
        `https://mempool.space/api/address/${encodeURIComponent(addr)}/txs`,
        {},
        6000
      );
    }
    if (!Array.isArray(txs)) continue;

    const addrLower = addr.toLowerCase();
    for (const tx of txs.slice(0, 8)) {
      if (!tx.txid) continue;
      const isUnconfirmed = !tx.status?.confirmed;
      const blockAgeMs = tx.status?.block_time ? Date.now() - tx.status.block_time * 1000 : 0;
      if (!isUnconfirmed && blockAgeMs > 2 * 60 * 60 * 1000) continue;

      let satsIn = 0;
      for (const vout of tx.vout || []) {
        if (String(vout.scriptpubkey_address || '').toLowerCase() === addrLower) {
          satsIn += Number(vout.value || 0);
        }
      }

      let satsSpent = 0;
      let externalOut = 0;
      let recipientAddr = '';
      for (const vin of tx.vin || []) {
        if (String(vin.prevout?.scriptpubkey_address || '').toLowerCase() === addrLower) {
          satsSpent += Number(vin.prevout?.value || 0);
        }
      }
      if (satsSpent > 0) {
        for (const vout of tx.vout || []) {
          const outAddr = String(vout.scriptpubkey_address || '');
          if (outAddr.toLowerCase() !== addrLower) {
            externalOut += Number(vout.value || 0);
            if (!recipientAddr && outAddr) recipientAddr = outAddr;
          }
        }
      }

      const direction = satsSpent > 0 && externalOut > 0 ? 'out' : satsIn > 0 ? 'in' : null;
      const netSats = direction === 'out' ? externalOut : satsIn;
      if (!direction || netSats <= 0) continue;

      const btcAmount = (netSats / 1e8).toFixed(8);
      const confirmed = !isUnconfirmed;
      const formatted = formatPaymentDisplay({
        network: 'bitcoin',
        asset: 'BTC',
        amount: btcAmount,
        direction,
        status: confirmed ? 'Confirmed' : 'Pending',
        confirmations: confirmed ? CHAIN_METADATA.bitcoin.confirmationsRequired : 0,
        confirmationsRequired: CHAIN_METADATA.bitcoin.confirmationsRequired,
        counterparty:
          direction === 'out'
            ? recipientAddr || 'Bitcoin Network'
            : tx.vin?.[0]?.prevout?.scriptpubkey_address || 'Bitcoin Network',
        txHash: tx.txid,
        feeText: CHAIN_METADATA.bitcoin.estimatedFee,
      });

      const replayKey = makeReplayKey('bitcoin', tx.txid);
      const isNew = !paymentStore.has(replayKey);
      recordPaymentEvent({
        ...formatted,
        applyBalance: confirmed && isNew,
      });

      if (!confirmed) {
        pendingWatchQueue.set(replayKey, {
          network: 'bitcoin',
          txHash: tx.txid,
          tokenType: 'BTC',
          attempts: 0,
        });
      }
    }
  }
}

async function processPendingQueue() {
  if (pendingWatchQueue.size === 0) return;
  for (const [key, item] of pendingWatchQueue.entries()) {
    item.attempts += 1;
    if (item.attempts > 30) {
      pendingWatchQueue.delete(key);
      continue;
    }
    try {
      await trackOnChainPayment({
        network: item.network,
        txHash: item.txHash,
        tokenType: item.tokenType,
        memoOrTag: item.memoOrTag,
        applyBalance: true,
      });
    } catch {
      // Keep waiting on transient RPC failure
    }
  }
}

export async function syncLiveChainActivity() {
  if (isPolling) return { synced: false, payments: getRealtimePayments() };
  isPolling = true;
  try {
    await Promise.allSettled([
      pollEvmTransfers('bsc'),
      pollEvmTransfers('ethereum'),
      pollTronTransfers(),
      pollBitcoinTransfers(),
      processPendingQueue(),
    ]);
    return { synced: true, payments: getRealtimePayments() };
  } finally {
    isPolling = false;
  }
}

async function broadcastLivePrices() {
  try {
    const result = await getLivePrices(true);
    if (result?.prices && Object.keys(result.prices).length > 0) {
      broadcast({
        type: 'prices:update',
        prices: result.prices,
        updatedAt: result.updatedAt,
      });
    }
  } catch {
    // Keep existing prices on transient upstream failure
  }
}

function ensureWatchersRunning() {
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      if (wss && wss.clients.size > 0) {
        syncLiveChainActivity().catch(() => {});
      }
    }, 15000);
  }
  if (!pendingTimer) {
    pendingTimer = setInterval(() => {
      if (pendingWatchQueue.size > 0) {
        processPendingQueue().catch(() => {});
      }
    }, 8000);
  }
  if (!priceTimer) {
    priceTimer = setInterval(() => {
      if (wss && wss.clients.size > 0) {
        broadcastLivePrices().catch(() => {});
      }
    }, 15000);
  }
}

export function attachPaymentWebSocket(httpServer) {
  initDefaultWatchedAddresses();
  wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = (request.url || '').split('?')[0];
    if (pathname !== '/ws/payments') return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    ensureWatchersRunning();

    // Sync full authoritative server state immediately on connect
    ws.send(
      JSON.stringify({
        type: 'payment:init',
        payments: getRealtimePayments(),
        serverTime: new Date().toISOString(),
      })
    );

    // Send live prices immediately on connect
    getLivePrices(false)
      .then((result) => {
        if (ws.readyState === WebSocket.OPEN && result?.prices && Object.keys(result.prices).length > 0) {
          ws.send(
            JSON.stringify({
              type: 'prices:update',
              prices: result.prices,
              updatedAt: result.updatedAt,
            })
          );
        }
      })
      .catch(() => {});

    // Kick off an immediate non-blocking real chain check
    syncLiveChainActivity().catch(() => {});

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === 'subscribe' && msg.addresses && typeof msg.addresses === 'object') {
          for (const [chainId, addr] of Object.entries(msg.addresses)) {
            if (typeof addr === 'string') addWatchedAddress(chainId, addr);
          }
          syncLiveChainActivity().catch(() => {});
        } else if (msg?.type === 'refresh') {
          syncLiveChainActivity()
            .then((result) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'payment:synced',
                    payments: result.payments,
                    serverTime: new Date().toISOString(),
                  })
                );
              }
            })
            .catch(() => {});
        } else if (msg?.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong', serverTime: new Date().toISOString() }));
          }
        }
      } catch {
        // Ignore malformed client frames
      }
    });
  });

  return wss;
}

export function getPaymentsHandler(_req, res) {
  return res.json({
    ok: true,
    payments: getRealtimePayments(),
  });
}

export async function refreshPaymentsHandler(req, res) {
  const { addresses } = req.body ?? {};
  if (addresses && typeof addresses === 'object') {
    for (const [chainId, addr] of Object.entries(addresses)) {
      if (typeof addr === 'string') addWatchedAddress(chainId, addr);
    }
  }
  const result = await syncLiveChainActivity();
  return res.json({
    ok: true,
    synced: result.synced,
    payments: result.payments,
  });
}

export async function trackPaymentHandler(req, res) {
  try {
    const { network, txHash, tokenType = 'NATIVE', memoOrTag } = req.body ?? {};
    if (!network || typeof network !== 'string') {
      return res.status(400).json({ ok: false, error: 'network is required' });
    }
    if (!txHash || typeof txHash !== 'string' || !txHash.trim()) {
      return res.status(400).json({ ok: false, error: 'txHash is required' });
    }

    const result = await trackOnChainPayment({
      network,
      txHash: txHash.trim(),
      tokenType,
      memoOrTag,
      applyBalance: true,
    });

    if (!result.ok) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.status(result.status === 'pending' ? 202 : 200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to track on-chain payment',
    });
  }
}
