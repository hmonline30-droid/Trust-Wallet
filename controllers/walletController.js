import { listSupportedChains, resolveChainService } from '../services/chains/index.js';
import { getTreasuryAddress } from '../services/chains/chainConfig.js';
import { recordPaymentEvent } from '../services/realtimePayments.js';

/**
 * In-memory replay-protection & demo balance store.
 * Replace with PostgreSQL / Redis transactions in production (see DB HOOK comments below).
 */
const processedDepositHashes = new Set();
const inMemoryWithdrawals = [];

/**
 * GET /api/chains
 * Returns all supported blockchain networks, Master Treasury deposit addresses,
 * memo requirements, fee estimates, and whether Hot Wallet secrets are configured.
 */
export function getChains(_req, res) {
  return res.json({
    ok: true,
    chains: listSupportedChains(),
  });
}

/**
 * POST /api/deposit/verify
 * Body: { userId, network, txHash, tokenType, memoOrTag }
 */
export async function verifyDeposit(req, res) {
  try {
    const { userId, network, txHash, tokenType = 'NATIVE', memoOrTag } = req.body ?? {};

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }
    if (!network || typeof network !== 'string') {
      return res.status(400).json({ ok: false, error: 'network is required' });
    }
    if (!txHash || typeof txHash !== 'string' || !txHash.trim()) {
      return res.status(400).json({ ok: false, error: 'txHash is required' });
    }

    const service = resolveChainService(network);
    if (!service) {
      return res.status(400).json({ ok: false, error: `Unsupported blockchain network: ${network}` });
    }

    const cleanTxHash = txHash.trim();
    if (!service.validateTxHash(cleanTxHash)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid transaction hash format for ${service.meta.name}`,
      });
    }

    if (service.meta.requiresMemo && (memoOrTag === undefined || String(memoOrTag).trim() === '')) {
      return res.status(400).json({
        ok: false,
        error: `${service.meta.name} deposits require memoOrTag (Destination Tag / Memo)`,
      });
    }

    // 1. Replay-attack guard
    // DB HOOK: Check unique constraint `SELECT id FROM deposits WHERE network = $1 AND tx_hash = $2`
    const CASE_SENSITIVE_TX_CHAINS = new Set(['solana', 'sui', 'aeternity', 'ton']);
    const normalizedHashForReplay = CASE_SENSITIVE_TX_CHAINS.has(service.chainId)
      ? cleanTxHash
      : cleanTxHash.toLowerCase();
    const replayKey = `${service.chainId}:${normalizedHashForReplay}`;
    if (processedDepositHashes.has(replayKey)) {
      return res.status(409).json({
        ok: false,
        error: 'Duplicate txHash detected: this deposit has already been credited',
      });
    }

    // 2. Verify on-chain transaction via dedicated chain module
    const verification = await service.verifyDeposit({
      txHash: cleanTxHash,
      tokenType,
      memoOrTag,
    });

    if (!verification.verified) {
      if (verification.pending) {
        recordPaymentEvent({
          type: 'deposit',
          network: service.chainId,
          asset: String(tokenType).toUpperCase() === 'NATIVE' ? service.meta.symbol : String(tokenType).toUpperCase(),
          amount: Number(verification.amount || 0),
          title: `Incoming ${String(tokenType).toUpperCase() === 'NATIVE' ? service.meta.symbol : String(tokenType).toUpperCase()} (${service.meta.name})`,
          subtitle: `Pending (${verification.confirmations ?? 0}/${verification.confirmationsRequired ?? service.meta.confirmationsRequired})`,
          amountText: `+${verification.amount || '0'} ${String(tokenType).toUpperCase() === 'NATIVE' ? service.meta.symbol : String(tokenType).toUpperCase()}`,
          usdText: 'Pending confirmation',
          timestamp: 'Just now',
          status: 'Pending',
          txHash: cleanTxHash,
          counterparty: getTreasuryAddress(service.chainId),
          feeText: service.meta.estimatedFee,
          confirmations: verification.confirmations ?? 0,
          confirmationsRequired: verification.confirmationsRequired ?? service.meta.confirmationsRequired,
          applyBalance: false,
        });
      }
      return res.status(verification.pending ? 202 : 400).json({
        ok: false,
        status: verification.pending ? 'pending' : 'rejected',
        network: service.chainId,
        treasuryAddress: getTreasuryAddress(service.chainId),
        ...verification,
      });
    }

    // 3. Atomic credit hook
    // DB HOOK: BEGIN TRANSACTION;
    //   INSERT INTO deposits (user_id, network, tx_hash, asset, amount, memo_or_tag, status)
    //   VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') ON CONFLICT (network, tx_hash) DO NOTHING;
    //   UPDATE user_balances SET available = available + $5 WHERE user_id = $1 AND asset = $4;
    // COMMIT;
    processedDepositHashes.add(replayKey);

    const numericCredited = Number(verification.amount);
    const formattedAmt = Number.isFinite(numericCredited)
      ? numericCredited.toLocaleString('en-US', { maximumFractionDigits: 6 })
      : String(verification.amount);
    const fromAddr = verification.from || verification.to;
    const shortFrom = fromAddr && fromAddr.length > 14 ? `${fromAddr.slice(0, 6)}...${fromAddr.slice(-4)}` : fromAddr;

    recordPaymentEvent({
      type: 'deposit',
      network: service.chainId,
      asset: verification.asset,
      amount: Number.isFinite(numericCredited) ? numericCredited : undefined,
      title: `Received ${verification.asset} (${service.meta.name})`,
      subtitle: `${shortFrom ? `From ${shortFrom} · ` : ''}Confirmed`,
      amountText: `+${formattedAmt} ${verification.asset}`,
      usdText:
        verification.asset === 'USDT' || verification.asset === 'USDC'
          ? `$${(Number.isFinite(numericCredited) ? numericCredited : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${formattedAmt} ${verification.asset}`,
      timestamp: 'Just now',
      status: 'Confirmed',
      txHash: cleanTxHash,
      counterparty: fromAddr,
      feeText: service.meta.estimatedFee,
      confirmations: verification.confirmations,
      confirmationsRequired: service.meta.confirmationsRequired,
      applyBalance: true,
    });

    return res.json({
      ok: true,
      status: 'confirmed',
      userId: userId.trim(),
      network: service.chainId,
      txHash: cleanTxHash,
      asset: verification.asset,
      amount: verification.amount,
      confirmations: verification.confirmations,
      treasuryAddress: verification.to,
      memoOrTag: verification.memoOrTag ?? memoOrTag ?? null,
    });
  } catch (err) {
    console.error('[verifyDeposit]', err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Internal error verifying deposit',
    });
  }
}

/**
 * POST /api/withdraw
 * Body: { userId, network, toAddress, amount, tokenType, memoOrTag }
 */
export async function withdrawFunds(req, res) {
  try {
    const {
      userId,
      network,
      toAddress,
      amount,
      tokenType = 'NATIVE',
      memoOrTag,
    } = req.body ?? {};

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ ok: false, error: 'userId is required' });
    }
    if (!network || typeof network !== 'string') {
      return res.status(400).json({ ok: false, error: 'network is required' });
    }
    if (!toAddress || typeof toAddress !== 'string') {
      return res.status(400).json({ ok: false, error: 'toAddress is required' });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'amount must be a positive number' });
    }

    const service = resolveChainService(network);
    if (!service) {
      return res.status(400).json({ ok: false, error: `Unsupported blockchain network: ${network}` });
    }

    const cleanAddress = toAddress.trim();
    if (!service.validateAddress(cleanAddress)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid destination address format for ${service.meta.name}`,
      });
    }

    // DB HOOK (Atomic Pre-Withdrawal Balance Lock):
    // BEGIN TRANSACTION;
    //   SELECT available FROM user_balances WHERE user_id = $1 AND asset = $2 FOR UPDATE;
    //   IF available < (numericAmount + networkFee) THEN ROLLBACK AND RETURN 400 Insufficient Balance;
    //   UPDATE user_balances SET available = available - (numericAmount + networkFee), locked = locked + ...;
    //   INSERT INTO withdrawals (id, user_id, network, to_address, amount, status) VALUES (..., 'pending');
    // COMMIT;

    let broadcastResult;
    try {
      broadcastResult = await service.sendWithdrawal({
        toAddress: cleanAddress,
        amount: numericAmount,
        tokenType,
        memoOrTag,
      });
    } catch (chainErr) {
      // DB HOOK: On broadcast failure, atomically refund locked user balance back to available!
      const statusCode = chainErr?.statusCode || 502;
      return res.status(statusCode).json({
        ok: false,
        error: chainErr?.message || 'Withdrawal broadcast failed',
        requiredEnvVar: chainErr?.requiredEnvVar,
        network: service.chainId,
        estimatedFee: service.meta.estimatedFee,
      });
    }

    // DB HOOK: UPDATE withdrawals SET tx_hash = $1, status = 'broadcasted' WHERE id = $2;
    const withdrawalRecord = {
      userId: userId.trim(),
      toAddress: cleanAddress,
      memoOrTag: memoOrTag ?? null,
      timestamp: new Date().toISOString(),
      ...broadcastResult,
    };
    inMemoryWithdrawals.unshift(withdrawalRecord);

    const shortTo = cleanAddress.length > 14 ? `${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}` : cleanAddress;
    const outAsset = broadcastResult.asset || service.meta.symbol;
    const outAmtStr = numericAmount.toLocaleString('en-US', { maximumFractionDigits: 6 });

    recordPaymentEvent({
      type: 'send',
      network: service.chainId,
      asset: outAsset,
      amount: numericAmount,
      title: `Sent ${outAsset} (${service.meta.name})`,
      subtitle: `To ${shortTo} · Confirmed`,
      amountText: `-${outAmtStr} ${outAsset}`,
      usdText:
        outAsset === 'USDT' || outAsset === 'USDC'
          ? `-$${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `-${outAmtStr} ${outAsset}`,
      timestamp: 'Just now',
      status: 'Confirmed',
      txHash: broadcastResult.txHash,
      counterparty: cleanAddress,
      feeText: broadcastResult.estimatedFee || service.meta.estimatedFee,
      applyBalance: false,
    });

    return res.json({
      ok: true,
      ...broadcastResult,
      toAddress: cleanAddress,
      memoOrTag: memoOrTag ?? null,
    });
  } catch (err) {
    console.error('[withdrawFunds]', err);
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Internal error processing withdrawal',
    });
  }
}

/**
 * POST /api/validate-address
 * Lightweight helper to validate any destination address against its chain module.
 */
export function validateChainAddress(req, res) {
  const { network, address } = req.body ?? {};
  if (!network || typeof network !== 'string') {
    return res.status(400).json({ ok: false, valid: false, error: 'network is required' });
  }
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ ok: false, valid: false, error: 'address is required' });
  }
  const service = resolveChainService(network);
  if (!service) {
    return res.status(400).json({ ok: false, valid: false, error: 'Unsupported network' });
  }
  const valid = service.validateAddress(address.trim());
  return res.json({
    ok: true,
    valid,
    network: service.chainId,
    treasuryAddress: getTreasuryAddress(service.chainId),
  });
}
