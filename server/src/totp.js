import crypto from 'crypto';

// TOTP за RFC 6238 — сумісно з Google Authenticator та подібними

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateSecret(len = 20) {
  const bytes = crypto.randomBytes(len);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function b32decode(secret) {
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '')) {
    const idx = B32.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret, counter) {
  const key = b32decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function totp(secret) {
  return hotp(secret, Math.floor(Date.now() / 30000));
}

// перевірка з допуском ±1 часове вікно (30 с)
export function verifyTotp(secret, code) {
  const c = Math.floor(Date.now() / 30000);
  return [c - 1, c, c + 1].some((k) => hotp(secret, k) === String(code).trim());
}

export const otpauthUrl = (secret, name = 'Svidomyi Vybir') =>
  `otpauth://totp/${encodeURIComponent(name)}?secret=${secret}&issuer=${encodeURIComponent('Свідомий Вибір')}`;
