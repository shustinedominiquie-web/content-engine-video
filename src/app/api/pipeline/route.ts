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
      // Fixed: was 'claude-sonnet-4-20250514' which is an invalid model string
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a conversational video scriptwriter for Advantage Media Partners. Write a script that sounds like a real person talking naturally on camera - NOT like an essay or article. Use contractions (don't, we're, it's, you'll). Use short punchy sentences. Add natural pauses with '...' for breathing room. Ask rhetorical questions. Sound enthusiastic but not cheesy.

CRITICAL: The video is exactly 25 seconds long. The script must be spoken in 20-25 seconds - roughly 50-65 words total. Do NOT write more than 65 words.

The video displays these 5 AI marketing trends as on-screen graphics while you speak. Reference them naturally in order:
1. AI-powered content creation
2. Predictive customer analytics
3. Hyper-personalization at scale
4. Conversational AI marketing
5. AI-generated video production

Title: ${title}
Platform: ${platform}
Avatar presenter: ${avatarName}
Voice style: ${voiceName}

Rules:
- Start with a hook in the first 3 seconds
- Briefly mention each of the 5 trends - the graphics will show them on screen
- End with a clear call to action pointing to advantagemediapartners.com
- Write ONLY the words the presenter will speak
- MAXIMUM 65 words

Return ONLY the script text.`
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
