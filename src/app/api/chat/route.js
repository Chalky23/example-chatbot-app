import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, userId } = body || {};
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing messages array.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use userId if present, otherwise fallback to IP or 'anonymous'
    let rateLimitKey = userId;
    if (!rateLimitKey) {
      // Try to use IP address from headers (may not always be available)
      rateLimitKey = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    }

    // Check rate limit
    const rateLimitRes = await fetch(`${req.nextUrl.origin}/api/rate-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: rateLimitKey }),
    });

    if (!rateLimitRes.ok) {
      const rateLimitData = await rateLimitRes.json();
      return new Response(JSON.stringify(rateLimitData), {
        status: rateLimitRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      stream: true,
      messages,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);
    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
