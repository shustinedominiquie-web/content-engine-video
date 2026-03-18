import { NextResponse } from 'next/server';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || '';

async function genScript(title: string, platform: string, avatarName: string, voiceName: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `You are a professional video scriptwriter for Advantage Media Partners. Write a social media video script about: "${title}"

FORMAT — use this exact structure with [Stage Directions] in square brackets:

[Opening visual: animated logo reveal, clean background]

<Hook — 1-2 punchy sentences that grab attention in the first 3 seconds>

[Graphic: relevant on-screen visual or text overlay]

<Main point 1 — spoken naturally, 1-3 sentences>

[Graphic/B-roll: supporting visual]

<Main point 2 — spoken naturally, 1-3 sentences>

[Graphic/B-roll: supporting visual]

<Main point 3 — spoken naturally, 1-3 sentences>

[Lower third: key stat, quote, or URL]

<Call to action — direct the viewer to advantagemediapartners.com>

[Outro: logo + website URL on screen]

RULES:
- Platform: ${platform}
- Avatar presenter: ${avatarName}
- Voice style: ${voiceName}
- [Stage Directions] in square brackets describe on-screen visuals — they are NOT spoken aloud
- Spoken words (outside brackets) should total 60-100 words — natural, conversational, use contractions
- Use short punchy sentences. Sound like a real person, not a press release.
- Always end with a CTA mentioning advantagemediapartners.com
- Tailor the content, examples, and visuals to the specific topic: "${title}"
- Do NOT reuse generic "AI trends" content — write specifically about this topic

Return ONLY the formatted script. No preamble, no explanation.`
      }]
    }),
  });
  if (!response.ok) throw new Error('Claude API error: ' + (await response.text()));
  const data = await response.json();
  return data.content?.[0]?.text || 'Failed to generate script';
}

// Strip [Stage Direction] and [B-roll: ...] annotations — HeyGen only speaks pure text.
// Removes anything inside square brackets: [Animated logo], [B-roll: person typing], etc.
function stripStageDirections(script: string): string {
  return script
    .replace(/\[([^\]]*)\]/g, '')   // remove [anything in brackets]
    .replace(/\n{3,}/g, '\n\n')     // collapse triple+ newlines
    .trim();
}

// Fixed: accepts isTalkingPhoto flag explicitly instead of guessing from avatarId.length === 32
async function submitVideo(script: string, avatarId: string, voiceId: string, width: number, height: number, isTalkingPhoto: boolean) {
  const character = isTalkingPhoto
    ? { type: 'talking_photo', talking_photo_id: avatarId }
    : { type: 'avatar', avatar_id: avatarId, scale: 1 };

  // Clean the script before sending — HeyGen cannot speak stage directions
  const spokenText = stripStageDirections(script);

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{
        character,
        voice: { type: 'text', input_text: spokenText, voice_id: voiceId },
        background: { type: 'color', value: '#1a1a2e' },
      }],
      dimension: { width, height },
      aspect_ratio: null,
    }),
  });
  const data = await res.json();
  if (!data.data?.video_id) throw new Error('HeyGen error: ' + JSON.stringify(data));
  return data.data.video_id;
}

async function pollVideoUntilDone(videoId: string) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch('https://api.heygen.com/v1/video_status.get?video_id=' + videoId, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY },
    });
    const data = await res.json();
    if (data.data?.status === 'completed') return data.data.video_url;
    if (data.data?.status === 'failed') throw new Error('Video generation failed');
  }
  throw new Error('Timed out waiting for HeyGen video');
}

async function checkVideoStatus(videoId: string) {
  const res = await fetch('https://api.heygen.com/v1/video_status.get?video_id=' + videoId, {
    headers: { 'X-Api-Key': HEYGEN_API_KEY },
  });
  const data = await res.json();
  return {
    status: data.data?.status || 'unknown',
    videoUrl: data.data?.video_url || null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.step === 'script') {
      const script = await genScript(
        body.title || 'AI Marketing Tips',
        body.platform || 'LinkedIn',
        body.avatarName || 'Host',
        body.voiceName || 'Default',
      );
      return NextResponse.json({ script });
    }

    if (body.step === 'heygen') {
      const width = body.width || 1080;
      const height = body.height || 1920;
      // Fixed: use the isTalkingPhoto flag sent from the dashboard instead of guessing from ID length
      const isTalkingPhoto = Boolean(body.isTalkingPhoto);
      const videoId = await submitVideo(body.script, body.avatarId, body.voiceId, width, height, isTalkingPhoto);
      return NextResponse.json({ videoId });
    }

    if (body.step === 'poll') {
      const videoUrl = await pollVideoUntilDone(body.videoId);
      return NextResponse.json({ videoUrl });
    }

    if (body.step === 'poll-check') {
      const result = await checkVideoStatus(body.videoId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown step' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
