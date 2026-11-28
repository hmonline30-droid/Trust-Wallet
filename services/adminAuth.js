import crypto from 'crypto';
import { listSupportedChains } from './chains/index.js';
import {
  clearRealtimePayments,
  getRealtimePayments,
  recordPaymentEvent,
} from './realtimePayments.js';

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.trim()
    ? process.env.ADMIN_SESSION_SECRET.trim()
    : crypto.randomBytes(32);

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

// First-run in-memory claimed admin credential (only used when process.env.ADMIN_PASSCODE is unset)
let claimedAdminCredential = null; // { email: string, salt: string, hashHex: string, claimedAt: string }
const activeSessions = new Map(); // tokenId -> { email, role, createdAt, expiresAt }
const loginAttempts = new Map(); // ip -> { count, resetAt }

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

function clearRateLimit(req) {
  loginAttempts.delete(getClientIp(req));
}

function getEnvPasscode() {
  const raw = process.env.ADMIN_PASSCODE;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function getConfiguredEmail() {
  const raw = process.env.ADMIN_EMAIL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().toLowerCase();
  }
  if (claimedAdminCredential?.email) {
    return claimedAdminCredential.email;
  }
  return 'admin@trustwallet.local';
}

function hashPasswordScrypt(password, saltHex) {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function safeEqualText(a, b) {
  const digestA = crypto.createHash('sha256').update(String(a)).digest();
  const digestB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function verifyPassword(password) {
  const envPass = getEnvPasscode();
  if (envPass !== null) {
    return safeEqualText(password, envPass);
  }
  if (!claimedAdminCredential) return false;
  const computedHex = hashPasswordScrypt(password, claimedAdminCredential.salt);
  const computedBuf = Buffer.from(computedHex, 'hex');
  const storedBuf = Buffer.from(claimedAdminCredential.hashHex, 'hex');
  if (computedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, storedBuf);
}

function signSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (!safeEqualText(sig, expectedSig)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed?.sid || !parsed?.exp || Date.now() > parsed.exp) {
      if (parsed?.sid) activeSessions.delete(parsed.sid);
      return null;
    }
    const stored = activeSessions.get(parsed.sid);
    if (!stored || Date.now() > stored.expiresAt) {
      activeSessions.delete(parsed.sid);
      return null;
    }
    return { sid: parsed.sid, ...stored };
  } catch {
    return null;
  }
}

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string') return null;
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

function issueSession(email) {
  const sid = crypto.randomBytes(16).toString('hex');
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_TTL_MS;
  const sessionRecord = {
    email,
    role: 'admin',
    createdAt,
    expiresAt,
  };
  activeSessions.set(sid, sessionRecord);
  const token = signSessionToken({ sid, email, role: 'admin', exp: expiresAt });
  return { token, admin: { email, role: 'admin', expiresAt: new Date(expiresAt).toISOString() } };
}

export function requireAdminAuth(req, res, next) {
  const token = extractBearerToken(req);
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Admin authentication required',
    });
  }
  req.adminSession = session;
  return next();
}

export function getAdminStatusHandler(req, res) {
  const envConfigured = getEnvPasscode() !== null;
  const configured = envConfigured || claimedAdminCredential !== null;
  const session = verifySessionToken(extractBearerToken(req));
  return res.json({
    ok: true,
    configured,
    envConfigured,
    authenticated: Boolean(session),
    defaultEmail: getConfiguredEmail(),
    admin: session
      ? {
          email: session.email,
          role: session.role,
          expiresAt: new Date(session.expiresAt).toISOString(),
        }
      : null,
  });
}

export function setupAdminHandler(req, res) {
  const limit = checkRateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many attempts. Try again in ${limit.retryAfterSec}s.`,
    });
  }

  if (getEnvPasscode() !== null || claimedAdminCredential !== null) {
    return res.status(409).json({
      ok: false,
      error: 'Admin password is already configured. Please sign in.',
    });
  }

  const { email, password } = req.body ?? {};
  const cleanEmail =
    typeof email === 'string' && email.trim().includes('@')
      ? email.trim().toLowerCase()
      : 'admin@trustwallet.local';

  if (typeof password !== 'string' || password.trim().length < 8) {
    return res.status(400).json({
      ok: false,
      error: 'Password must be at least 8 characters long.',
    });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hashHex = hashPasswordScrypt(password.trim(), salt);
  claimedAdminCredential = {
    email: cleanEmail,
    salt,
    hashHex,
    claimedAt: new Date().toISOString(),
  };

  clearRateLimit(req);
  const issued = issueSession(cleanEmail);
  return res.status(201).json({
    ok: true,
    configured: true,
    ...issued,
  });
}

export function loginAdminHandler(req, res) {
  const limit = checkRateLimit(req);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many login attempts. Try again in ${limit.retryAfterSec}s.`,
    });
  }

  const envConfigured = getEnvPasscode() !== null;
  if (!envConfigured && !claimedAdminCredential) {
    return res.status(412).json({
      ok: false,
      error: 'Admin password has not been configured yet. Complete first-run setup.',
    });
  }

  const { email, password } = req.body ?? {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'Password is required.',
    });
  }

  const expectedEmail = getConfiguredEmail();
  const cleanEmail =
    typeof email === 'string' && email.trim().length > 0
      ? email.trim().toLowerCase()
      : expectedEmail;

  const emailMatches =
    !process.env.ADMIN_EMAIL?.trim() && !claimedAdminCredential?.email
      ? true
      : safeEqualText(cleanEmail, expectedEmail);

  if (!emailMatches || !verifyPassword(password.trim())) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid admin email or password.',
    });
  }

  clearRateLimit(req);
  const issued = issueSession(expectedEmail);
  return res.json({
    ok: true,
    ...issued,
  });
}

export function logoutAdminHandler(req, res) {
  const session = verifySessionToken(extractBearerToken(req));
  if (session?.sid) {
    activeSessions.delete(session.sid);
  }
  return res.json({ ok: true });
}

export function getAdminOverviewHandler(req, res) {
  const chains = listSupportedChains();
  const hotWalletsReady = chains.filter((c) => c.hotWalletConfigured).length;
  const recentPayments = getRealtimePayments().slice(0, 12);

  return res.json({
    ok: true,
    admin: {
      email: req.adminSession.email,
      role: req.adminSession.role,
      expiresAt: new Date(req.adminSession.expiresAt).toISOString(),
    },
    stats: {
      supportedChains: chains.length,
      hotWalletsReady,
      activeSessions: activeSessions.size,
      trackedEvents: recentPayments.length,
    },
    chains,
    recentPayments,
  });
}

export function adminCreditWalletHandler(req, res) {
  const { tokenId, symbol, network, amount, fromAddress, usdValue } = req.body ?? {};
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ ok: false, error: 'amount must be a positive number' });
  }
  if (typeof symbol !== 'string' || !symbol.trim() || typeof network !== 'string' || !network.trim()) {
    return res.status(400).json({ ok: false, error: 'symbol and network are required' });
  }

  const cleanSymbol = symbol.trim().toUpperCase();
  const cleanNetwork = network.trim().toLowerCase();
  const cleanFrom =
    typeof fromAddress === 'string' && fromAddress.trim().length >= 6
      ? fromAddress.trim()
      : '0x4b8F8e6b5017eac6A6FDa7499FC935A15118E9E6';

  const txHash =
    cleanNetwork === 'tron' || cleanNetwork === 'bitcoin' || cleanNetwork === 'solana'
      ? crypto.randomBytes(32).toString('hex')
      : `0x${crypto.randomBytes(32).toString('hex')}`;

  const shortFrom =
    cleanFrom.length > 14 ? `${cleanFrom.slice(0, 6)}...${cleanFrom.slice(-5)}` : cleanFrom;

  const formattedAmt = numericAmount.toLocaleString('en-US', { maximumFractionDigits: 6 });
  const numericUsd = Number(usdValue);
  const usdText = Number.isFinite(numericUsd) && numericUsd > 0
    ? `$${numericUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${formattedAmt} ${cleanSymbol}`;

  const recorded = recordPaymentEvent({
    id: `tx-admin-${Date.now()}`,
    type: 'receive',
    tokenId: typeof tokenId === 'string' ? tokenId.trim() : undefined,
    asset: cleanSymbol,
    amount: numericAmount,
    title: `Received ${cleanSymbol}`,
    subtitle: `From ${shortFrom} · Confirmed`,
    amountText: `+${formattedAmt} ${cleanSymbol}`,
    usdText,
    timestamp: 'Just now',
    network: cleanNetwork,
    status: 'Confirmed',
    txHash,
    counterparty: cleanFrom,
    confirmations: 24,
    confirmationsRequired: 12,
    applyBalance: false,
  });

  return res.json({
    ok: true,
    txHash,
    payment: recorded.payment,
  });
}

export function adminResetWalletHandler(_req, res) {
  clearRealtimePayments();
  return res.json({
    ok: true,
    resetAt: new Date().toISOString(),
  });
}
