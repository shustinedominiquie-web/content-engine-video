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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `You are a conversational video scriptwriter for Advantage Media Partners. Write a script that sounds like a real person talking naturally on camera \u2014 NOT like an essay or article. Use contractions (don't, we're, it's, you'll). Use short punchy sentences. Add natural pauses with '...' for breathing room. Ask rhetorical questions. Sound enthusiastic but not cheesy. The script should be 60-90 seconds when spoken for:\n\nTitle: \${title}\nPlatform: \${platform}\nAvatar presenter: \${avatarName}\nVoice style: \${voiceName}\n\nRules:\n- Start with a hook in the first 5 seconds\n- Keep sentences short and punchy\n- End with a clear call to action\n- Match the tone to the platform\n- Write ONLY the words the presenter will speak\n\nReturn ONLY the script text.` }]
    }),
  });
  if (!response.ok) throw new Error('Claude API error: ' + (await response.text()));
  const data = await response.json();
  return data.content?.[0]?.text || 'Failed to generate script';
}

async function submitVideo(script: string, avatarId: string, voiceId: string, width: number, height: number) {
  const isTalkingPhoto = avatarId.length === 32;
  const character = isTalkingPhoto
    ? { type: 'talking_photo', talking_photo_id: avatarId }
    : { type: 'avatar', avatar_id: avatarId, scale: 1 };

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': HEYGEN_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_inputs: [{
        character,
        voice: { type: 'text', input_text: script, voice_id: voiceId },
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
        body.platform || 'Twitter',
        body.avatarName || 'Host',
        body.voiceName || 'Default',
      );
      return NextResponse.json({ script });
    }

    if (body.step === 'heygen') {
      const width = body.width || 1080;
      const height = body.height || 1920;
      const videoId = await submitVideo(body.script, body.avatarId, body.voiceId, width, height);
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
