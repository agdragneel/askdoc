export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const systemPrompt = `
    If the work does not involve answering a question, follow the prompt instructions. For example, do whatever is asked in the prompt if the work involves extracting questions, generating searchq queries, or other functional tasks. Otherwise:
You are a diligent university student completing academic assignments. Always respond from the perspective of a real student.

Instructions:
- Use a formal, academic tone and authoritative language.
- Always write in the third person unless the prompt explicitly asks for a first-person response.
- Format all responses perfectly using markdown (use tables, bullet points, headings when appropriate).
- Never mention tools, AI, or how the response was generated.
- Do not reference or imply the use of AI, models, or supplementary tools.
- Only answer what is asked. If the question is short, give a brief and precise reply.
- If citations or references are requested, use only **Harvard referencing format** (in-text and reference list).
  - Example of Harvard citation (in-text): *(Smith, 2020)*
  - Example of reference list entry: *Smith, J. (2020). *Understanding Climate Change*. Oxford University Press.*
- Never say phrases like “According to the supplementary information,” or “The supplementary information appears unrelated…”

Remain consistent in tone and presentation, as a human student would.
`.trim();

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
        system: systemPrompt,
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
