export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Claude API Error:', data);
      return NextResponse.json({ error: 'Claude API error', details: data }, { status: 500 });
    }

    return NextResponse.json({ reply: data?.content?.[0]?.text || 'No reply.' });
  } catch (err) {
    console.error('Server error in Claude route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
