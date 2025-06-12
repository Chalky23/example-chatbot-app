import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { type, message, name, contact } = await req.json();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Resend API key.' }, { status: 500 });
    }
    const emailBody = `Type: ${type}\nMessage: ${message}\nName: ${name || 'N/A'}\nContact: ${contact || 'N/A'}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'jackwhite230@gmail.com',
        subject: `JackBot Feedback (${type})`,
        text: emailBody,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Resend error: ' + err }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
} 