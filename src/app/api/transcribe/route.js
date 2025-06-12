import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key.' }, { status: 500 });
    }

    // Prepare the request to OpenAI Whisper
    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: (() => {
        const fd = new FormData();
        fd.append('file', audioFile, 'audio.webm');
        fd.append('model', 'whisper-1');
        fd.append('language', 'en');
        return fd;
      })()
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return NextResponse.json({ error: 'OpenAI Whisper error: ' + err }, { status: 500 });
    }
    const data = await openaiRes.json();
    return NextResponse.json({ text: data.text });
  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
} 