import crypto from 'node:crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function decodeBase58(input) {
  if (typeof input !== 'string' || !input.length) return null;
  let num = 0n;
  for (const ch of input) {
    const idx = BASE58_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    num = num * 58n + BigInt(idx);
  }
  const bytes = [];
  while (num > 0n) {
    bytes.push(Number(num & 0xffn));
    num >>= 8n;
  }
  for (const ch of input) {
    if (ch === '1') bytes.push(0);
    else break;
  }
  return Buffer.from(bytes.reverse());
}

/**
 * Converts a TRON Base58Check address (e.g. TN9PoY...) to 20-byte lowercase hex without 0x/41 prefix.
 */
export function tronBase58ToHex20(address) {
  const raw = decodeBase58(address);
  if (!raw || raw.length !== 25 || raw[0] !== 0x41) return null;
  const payload = raw.subarray(0, 21);
  const checksum = raw.subarray(21, 25);
  const hash1 = crypto.createHash('sha256').update(payload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  if (!checksum.equals(hash2.subarray(0, 4))) return null;
  return payload.subarray(1).toString('hex').toLowerCase();
}

export function normalizeTronHex20(addr) {
  if (typeof addr !== 'string') return null;
  const trimmed = addr.trim();
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)) {
    return tronBase58ToHex20(trimmed);
  }
  const clean = trimmed.toLowerCase().replace(/^0x/, '');
  if (/^41[a-f0-9]{40}$/.test(clean)) return clean.slice(2);
  if (/^[a-f0-9]{40}$/.test(clean)) return clean;
  return null;
}

/**
 * Decodes a Bech32 address (e.g. zil1...) into lowercase 20-byte hex without 0x prefix.
 */
export function bech32ToHex20(address) {
  if (typeof address !== 'string') return null;
  const lower = address.trim().toLowerCase();
  const sep = lower.lastIndexOf('1');
  if (sep < 1 || sep + 7 > lower.length) return null;
  const dataPart = lower.slice(sep + 1, -6); // strip 6-char checksum
  const words = [];
  for (const ch of dataPart) {
    const val = BECH32_CHARSET.indexOf(ch);
    if (val === -1) return null;
    words.push(val);
  }
  // Convert 5-bit words to 8-bit bytes
  let acc = 0;
  let bits = 0;
  const out = [];
  for (const w of words) {
    acc = (acc << 5) | w;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (out.length !== 20) return null;
  return Buffer.from(out).toString('hex').toLowerCase();
}
