import jwt from 'jsonwebtoken';

// Gate the paid endpoints behind a short-lived HMAC (HS256) token that ONLY
// your authenticated backend can mint (it holds AUTH_SECRET). The browser
// receives a token and passes it as `?token=` (for <audio src>, which can't set
// headers) or `Authorization: Bearer` (for fetch/grading).
//
// Rollout-safe: if AUTH_SECRET is not set, auth is DISABLED (open) — nothing
// breaks until you configure the secret and your backend starts issuing tokens.
let warned = false;

export function requireToken(req, res, next) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (!warned) {
      console.warn('[auth] AUTH_SECRET not set — API is OPEN (no token required)');
      warned = true;
    }
    return next();
  }

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const token = (typeof req.query.token === 'string' && req.query.token.trim()) || bearer;
  if (!token) {
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    req.auth = payload; // e.g. { sub, exp } — available to handlers/logging
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}
