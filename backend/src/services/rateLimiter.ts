import { redisClient } from './redis';

/**
 * Calculates the hour window string for a given Date or current time.
 * e.g. "2026091010"
 */
export function getHourWindowString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}${m}${d}${h}`;
}

/**
 * Calculates the exact Date when the next hour window starts (in UTC).
 */
export function getNextHourWindowStart(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

/**
 * Distributed minimum inter-email delay slot reservation across multiple workers.
 * Uses atomic Redis Lua script to schedule consecutive send timestamps per sender.
 */
export async function reserveSendSlot(senderId: string, minDelayMs: number): Promise<number> {
  if (minDelayMs <= 0) return 0;

  const key = `send_slot:${senderId}`;
  const now = Date.now();

  const luaScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local minDelay = tonumber(ARGV[2])

    local lastSlot = tonumber(redis.call('GET', key) or "0")
    local nextSlot = now
    if lastSlot + minDelay > now then
      nextSlot = lastSlot + minDelay
    end

    redis.call('SET', key, tostring(nextSlot), 'PX', 3600000)
    return nextSlot - now
  `;

  const result = await redisClient.eval(luaScript, 1, key, now.toString(), minDelayMs.toString());
  const delayToWait = Number(result);
  return Math.max(0, delayToWait);
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextHourStart: Date;
}

/**
 * Distributed hourly rate limiter check and reservation using atomic Redis Lua script.
 */
export async function checkAndReserveHourlyQuota(
  senderId: string,
  hourlyLimit: number
): Promise<QuotaCheckResult> {
  const now = new Date();
  const windowStr = getHourWindowString(now);
  const key = `rate_limit:${senderId}:${windowStr}`;
  const nextHourStart = getNextHourWindowStart(now);

  const luaScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])

    local current = redis.call('INCR', key)
    if current == 1 then
      redis.call('EXPIRE', key, 7200)
    end

    if current <= limit then
      return { 1, current }
    else
      redis.call('DECR', key)
      return { 0, current - 1 }
    end
  `;

  const result = (await redisClient.eval(
    luaScript,
    1,
    key,
    hourlyLimit.toString()
  )) as [number, number];

  const allowed = result[0] === 1;
  const currentCount = result[1];

  return {
    allowed,
    currentCount,
    limit: hourlyLimit,
    nextHourStart,
  };
}
