import { RateLimiterMemory } from 'rate-limiter-flexible';

// Per-user limits on AI calls, to protect the Groq quota on a public demo. Requires `auth` first.
const aiRateLimit = ({ points, duration, label }) => {
  const limiter = new RateLimiterMemory({ keyPrefix: label, points, duration });

  return async (req, res, next) => {
    try {
      await limiter.consume(String(req.user.id));
      next();
    } catch (rejection) {
      if (rejection instanceof Error) return next(rejection);
      const retryAfter = Math.ceil(rejection.msBeforeNext / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: `Too many ${label} requests. Try again in ${retryAfter} seconds.` });
    }
  };
};

export const planLimit = aiRateLimit({ points: 8, duration: 10 * 60, label: 'planning' });
export const chatLimit = aiRateLimit({ points: 30, duration: 10 * 60, label: 'chat' });
