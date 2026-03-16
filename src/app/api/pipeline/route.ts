import { NextRequest, NextResponse } from "next/server";

const HEYGEN_API_KEY = process.env.NEXT_PUBLIC_HEYGEN_API_KEY || "";
const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "";

async function genScript(title: string, platform: string, avatarName: string, voiceName: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: "You are a conversational video scriptwriter for Advantage Media Partners. Write a script that sounds like a real person talking naturally on camera. Use contractions. Short punchy sentences. Natural pauses with ... for breathing room. Rhetorical questions. Enthusiastic but not cheesy. 60-90 seconds when spoken.\n\nTitle: " + title + "\nPlatform: " + platform + "\nAvatar: " + avatarName + "\nVoice: " + voiceName + "\n\nReturn ONLY the script text."
      }]
    })
  });
  if (!res.ok) throw new Error("Claude error: " + await res.text());
  const data = await res.json();
  return data.content[0].text;
}

async function submitVideo(script: string, avatarId: string, voiceId: string, isTalkingPhoto: boolean, w: number, h: number): Promise<string> {
  const character = isTalkingPhoto
    ? { type: "talking_photo" as const, talking_photo_id: avatarId }
    : { type: "avatar" as const, avatar_id: avatarId, avatar_style: "normal" };
  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": HEYGEN_API_KEY },
    body: JSON.stringify({
      title: "AMP Commercial",
      video_inputs: [{ character, voice: { type: "text", input_text: script, voice_id: voiceId }, background: { type: "color", value: "#0A1628" } }],
      dimension: { width: w, height: h },
    }),
  });
  const json = await res.json();
  if (json.error || !json.data?.video_id) throw new Error("HeyGen: " + JSON.stringify(json));
  return json.data.video_id;
}

async function pollVideo(videoId: string): Promise<string> {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const res = await fetch("https://api.heygen.com/v2/videos/" + videoId, {
      headers: { "X-Api-Key": HEYGEN_API_KEY, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (json.data?.status === "completed" && json.data?.video_url) return json.data.video_url;
    if (json.data?.status === "failed") throw new Error("HeyGen failed: " + json.data?.failure_message);
  }
  throw new Error("HeyGen timed out");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step } = body;
    if (step === "script") {
      const script = await genScript(body.title, body.platform, body.avatarName, body.voiceName);
      return NextResponse.json({ script });
    }
    if (step === "heygen") {
      const videoId = await submitVideo(body.script, body.avatarId, body.voiceId, body.isTalkingPhoto, body.width || 1080, body.height || 1920);
      return NextResponse.json({ videoId });
    }
    if (step === "poll") {
      const videoUrl = await pollVideo(body.videoId);
      return NextResponse.json({ videoUrl });
    }
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
