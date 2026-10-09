// ============================================================
// SECURITY MIDDLEWARE - Helmet, Rate Limiting, Sanitization
// ============================================================
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// 1. Helmet HTTP xavfsizlik sarlavhalari
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // Swagger UI va inline stillar bilan to'g'ri ishlashi uchun
  crossOriginEmbedderPolicy: false,
});

// 2. Auth (Login) uchun qat'iy Rate Limiter (Brute-Force himoyasi)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 15, // 15 daqiqa ichida maksimal 15 marta login urinishi
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Xavfsizlik: Ko\'p sonli muvaffaqiyatsiz urinishlar aniqlandi. Iltimos, 15 daqiqadan so\'ng qayta urining.',
  },
});

// 3. Umumiy API so'rovlari uchun Rate Limiter (DoS/DDoS himoyasi)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: 300, // 1 daqiqada maksimal 300 ta so'rov
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Xavfsizlik: So\'rovlar chegarasidan oshib ketildi. Bir oz kuting.',
  },
});

// 4. Input sanitization (XSS himoyasi)
export function sanitizeInputs(req, _res, next) {
  function sanitizeValue(value) {
    if (typeof value === 'string') {
      // Potentsial zararli <script> teglarini zararsizlantirish
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  }

  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);

  next();
}
