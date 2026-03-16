import { NextResponse } from 'next/server';

async function genScript(topic: string, avatarName: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: 'Generate a short engaging 45-second video script for ' + avatarName + ' about: ' + topic + '. Conversational and natural. Under 120 words. Spoken words only.' }]
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || 'Failed to generate script';
}

async function submitVideo(script: string, avatarId: string, voiceId: string, format: string) {
  const isTalkingPhoto = avatarId.length === 32;
  const dim = format === 'reel' ? {width:1080,height:1920} : format === 'square' ? {width:1080,height:1080} : {width:1920,height:1080};
  const character = isTalkingPhoto ? {type:'talking_photo',talking_photo_id:avatarId} : {type:'avatar',avatar_id:avatarId,scale:1};
  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {'X-Api-Key': process.env.NEXT_PUBLIC_HEYGEN_API_KEY||'', 'Content-Type':'application/json'},
    body: JSON.stringify({video_inputs:[{character,voice:{type:'text',input_text:script,voice_id:voiceId},background:{type:'color',value:'#1a1a2e'}}],dimension:dim,aspect_ratio:null}),
  });
  const data = await res.json();
  if (!data.data?.video_id) throw new Error('HeyGen error: ' + JSON.stringify(data));
  return data.data.video_id;
}

async function pollVideo(videoId: string) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch('https://api.heygen.com/v1/video_status.get?video_id=' + videoId, {headers:{'X-Api-Key':process.env.NEXT_PUBLIC_HEYGEN_API_KEY||''}});
    const data = await res.json();
    if (data.data?.status === 'completed') return data.data.video_url;
    if (data.data?.status === 'failed') throw new Error('Video generation failed');
  }
  throw new Error('Timed out');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.step === 'script') { const script = await genScript(body.topic||'AI Marketing Tips', body.avatarName||'Host'); return NextResponse.json({script}); }
    if (body.step === 'heygen') { const videoId = await submitVideo(body.script, body.avatarId, body.voiceId, body.format||'reel'); return NextResponse.json({videoId}); }
    if (body.step === 'poll') { const videoUrl = await pollVideo(body.videoId); return NextResponse.json({videoUrl}); }
    return NextResponse.json({error:'Unknown step'},{status:400});
  } catch(e) { const msg = e instanceof Error ? e.message : String(e); return NextResponse.json({error:msg},{status:500}); }
}
