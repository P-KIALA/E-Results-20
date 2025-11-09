import { verifyToken } from "./auth";

// Use any types for middleware to avoid express/next typing conflicts in serverless builds
export interface AuthRequest extends Record<string, any> {
  userId?: string;
}

export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req?.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // Continue without auth (optional protection)
  }

  const token = authHeader.slice(7);

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = decoded.userId;
  next();
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
