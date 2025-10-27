import * as crypto from "crypto";

// Simple password hashing (in production, use bcrypt or argon2)
export function hashPassword(password: string): string {
  // Hash the password with SHA256 + salt
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, originalHash] = hash.split(":");
  const newHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return newHash === originalHash;
}

// Simple JWT-like token (for simplicity, we'll use a basic approach)
// In production, use proper JWT library (jsonwebtoken)
export function generateToken(userId: string): string {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
  // Simple token format: base64(payload) + signature
  const token = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "your-secret-key")
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export function verifyToken(
  token: string,
): { userId: string; exp: number } | null {
  try {
    const [payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "your-secret-key")
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return { userId: decoded.userId, exp: decoded.exp };
  } catch (error) {
    return null;
  }
}
