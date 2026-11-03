/**
 * In-memory sliding window rate limiter for QR attendance & check-in endpoints
 * Limits requests per client (by IP or authenticated user ID)
 */

const createRateLimiter = ({ windowMs = 60 * 1000, maxRequests = 25, message }) => {
  const requestRecords = new Map();

  // Periodic cleanup of stale records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requestRecords.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);
      if (validTimestamps.length === 0) {
        requestRecords.delete(key);
      } else {
        requestRecords.set(key, validTimestamps);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const key = req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const timestamps = requestRecords.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const retrySec = Math.ceil((windowMs - (now - validTimestamps[0])) / 1000);
      return res.status(429).json({
        success: false,
        message:
          message ||
          `Too many check-in attempts. Rate limit exceeded. Please wait ${retrySec} second(s) before trying again.`,
        retryAfterSeconds: retrySec,
      });
    }

    validTimestamps.push(now);
    requestRecords.set(key, validTimestamps);
    next();
  };
};

module.exports = {
  qrAttendanceLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Too many QR attendance attempts. Please wait 1 minute before retrying.',
  }),
};

