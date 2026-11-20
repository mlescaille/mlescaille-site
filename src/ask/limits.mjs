import { createHash, randomBytes } from 'node:crypto';

function positiveInt(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

export function limitsFromEnv(env = process.env) {
  return {
    maxChars: positiveInt(env.ASK_MAX_QUESTION_CHARS, 600),
    perIp: positiveInt(env.ASK_RATE_LIMIT_MAX, 8),
    windowMs: positiveInt(env.ASK_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    dailyCap: positiveInt(env.ASK_DAILY_REQUEST_CAP, 200),
    salt: env.ASK_IP_HASH_SALT || undefined,
  };
}

// In-memory, per process. On Vercel each isolate has its own counters, so the
// cap is a backstop, not a global ledger. The map key is a hash of the IP.
// The raw IP is not stored and nothing here is written to the log.
export function createLimiter({
  perIp = 8,
  windowMs = 10 * 60 * 1000,
  dailyCap = 200,
  salt = randomBytes(16).toString('hex'),
  now = Date.now,
} = {}) {
  const buckets = new Map();
  let day = '';
  let dailyCount = 0;

  const hash = ip => createHash('sha256').update(String(salt)).update('\0').update(String(ip)).digest('hex');

  return {
    check(ip, { spend = true } = {}) {
      const at = now();
      const today = new Date(at).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        dailyCount = 0;
      }
      const key = hash(ip);
      const recent = (buckets.get(key) || []).filter(stamp => at - stamp < windowMs);
      if (recent.length >= perIp) {
        buckets.set(key, recent);
        const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - at) / 1000));
        return { ok: false, reason: 'ip', retryAfter };
      }
      recent.push(at);
      buckets.set(key, recent);
      if (spend && dailyCount >= dailyCap) {
        return { ok: false, reason: 'daily', retryAfter: secondsUntilUtcDay(at) };
      }
      if (spend) dailyCount += 1;
      return { ok: true };
    },
  };
}

function secondsUntilUtcDay(at) {
  const next = Date.parse(`${new Date(at).toISOString().slice(0, 10)}T00:00:00Z`) + 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((next - at) / 1000));
}
