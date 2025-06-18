import { NextResponse } from 'next/server';

// In-memory store for rate limiting
// In production, you should use Redis or a similar solution
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

export async function POST(req) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const now = Date.now();
    const userRequests = rateLimitStore.get(userId) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW
    );
    
    // Check if user has exceeded rate limit
    if (recentRequests.length >= MAX_REQUESTS) {
      const oldestRequest = recentRequests[0];
      const timeToReset = RATE_LIMIT_WINDOW - (now - oldestRequest);
      
      return NextResponse.json({
        error: 'Rate limit exceeded',
        timeToReset: Math.ceil(timeToReset / 1000),
        remainingRequests: 0
      }, { status: 429 });
    }
    
    // Add new request
    recentRequests.push(now);
    rateLimitStore.set(userId, recentRequests);
    
    return NextResponse.json({
      success: true,
      remainingRequests: MAX_REQUESTS - recentRequests.length
    });
  } catch (error) {
    console.error('Rate limit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 