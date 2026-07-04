import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'focus-path-ai-super-secret-key-2026';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function comparePassword(password: string, hash: string): boolean {
  const inputHash = hashPassword(password);
  return inputHash === hash;
}

export function generateToken(payload: { userId: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    return decodedPayload;
  } catch (e) {
    return null;
  }
}
