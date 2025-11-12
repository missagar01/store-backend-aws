import jwt from "jsonwebtoken";

// Extract bearer token from Authorization header or common cookie names
function extractToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (typeof header === "string") {
    const parts = header.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    // Fallback: if a raw token is sent without Bearer prefix
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0];
    }
  }

  // Cookie fallback if cookie-parser is used
  const cookieToken = req.cookies?.token || req.cookies?.access_token || null;
  return cookieToken || null;
}

export function authenticate(req, res, next) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ ok: false, message: "JWT secret not configured" });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Missing authorization token" });
    }

    const verifyOptions = {};
    if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;

    const decoded = jwt.verify(token, secret, verifyOptions);

    // Attach decoded payload to request for downstream use
    req.user = decoded;
    return next();
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 401 : 401;
    return res.status(code).json({ ok: false, message: "Invalid or expired token" });
  }
}

// Role-based guard: authorize("admin") or authorize("manager", "cashier")
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "Unauthenticated" });
    }
    if (!allowedRoles || allowedRoles.length === 0) return next();

    const userRole = req.user?.role || req.user?.Role || null;
    if (!userRole) {
      return res.status(403).json({ ok: false, message: "Forbidden: missing role" });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ ok: false, message: "Forbidden: insufficient role" });
    }
    return next();
  };
}

// Optional auth: attaches user if token valid, otherwise continues without error
export function optionalAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  const token = extractToken(req);
  if (!secret || !token) return next();
  try {
    const verifyOptions = {};
    if (process.env.JWT_ISSUER) verifyOptions.issuer = process.env.JWT_ISSUER;
    req.user = jwt.verify(token, secret, verifyOptions);
  } catch (_) {
    // ignore errors and proceed as unauthenticated
  }
  return next();
}

