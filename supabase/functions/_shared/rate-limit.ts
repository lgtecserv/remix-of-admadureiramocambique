// In-memory rate limiter per edge function isolate
const ipMap = new Map<string, { count: number; resetTime: number }>();

const MAX_REQUESTS = 5; // 5 requests allowed
const WINDOW_MS = 60 * 1000; // per 1 minute

export function checkRateLimit(req: Request): { allowed: boolean; retryAfter?: number } {
  // Try to get IP from headers (Vercel/Supabase forwards it)
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
  
  const now = Date.now();
  const record = ipMap.get(ip);

  if (!record || now > record.resetTime) {
    // Reset or initialize
    ipMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS) {
    // Block
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment
  record.count++;
  ipMap.set(ip, record);
  return { allowed: true };
}
