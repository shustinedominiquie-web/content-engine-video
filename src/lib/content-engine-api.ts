const CLAUDE_API_KEY = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || "";
const HEYGEN_API_KEY = process.env.NEXT_PUBLIC_HEYGEN_API_KEY || "";

export async function generateScript({ title, platform, avatarName, voiceName }: {
  title: string; platform: string; avatarName: string; voiceName: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: "You are a conversational video scriptwriter for Advantage Media Partners. Write a script that sounds like a real person talking naturally on camera — NOT like an essay or article. Use contractions (don't, we're, it's, you'll). Use short punchy sentences. Add natural pauses with '...' for breathing room. Ask rhetorical questions. Sound enthusiastic but not cheesy. The script should be 60-90 seconds when spoken for:\n\nTitle: " + title + "\nPlatform: " + platform + "\nAvatar presenter: " + avatarName + "\nVoice style: " + voiceName + "\n\nRules:\n- Start with a hook in the first 5 seconds\n- Keep sentences short and punchy\n- End with a clear call to action\n- Match the tone to the platform\n- Write ONLY the words the presenter will speak\n\nReturn ONLY the script text."
      }]
    })
  });
  if (!response.ok) throw new Error("Claude API error: " + await response.text());
  const data = await response.json();
  return data.content[0].text;
}

export async function listHeyGenAvatars() {
  const headers = { "Accept": "application/json", "X-Api-Key": HEYGEN_API_KEY };
  const [pubRes, privRes] = await Promise.all([
    fetch("https://api.heygen.com/v2/avatars", { method: "GET", headers }),
    fetch("https://api.heygen.com/v2/avatars?type=private", { method: "GET", headers })
  ]);
  if (!pubRes.ok) throw new Error("HeyGen avatars error: " + await pubRes.text());
  const pubData = await pubRes.json();
  const pubAvatars = (pubData.data.avatars || []).map((a: any) => ({ ...a, is_talking_photo: false }));
  const pubPhotos = (pubData.data.talking_photos || []).map((p: any) => ({
    avatar_id: p.talking_photo_id,
    avatar_name: p.talking_photo_name + " (Photo)",
    preview_image_url: p.preview_image_url,
    is_talking_photo: true
  }));
  let privAvatars: any[] = [];
  let privPhotos: any[] = [];
  if (privRes.ok) {
    const privData = await privRes.json();
    privAvatars = (privData.data.avatars || []).map((a: any) => ({ ...a, is_talking_photo: false }));
    privPhotos = (privData.data.talking_photos || []).map((p: any) => ({
      avatar_id: p.talking_photo_id,
      avatar_name: p.talking_photo_name + " (Photo)",
      preview_image_url: p.preview_image_url,
      is_talking_photo: true
    }));
  }
  return [...privPhotos, ...privAvatars, ...pubPhotos, ...pubAvatars];
}

export async function listHeyGenVoices() {
  const response = await fetch("https://api.heygen.com/v2/voices", {
    method: "GET",
    headers: { "Accept": "application/json", "X-Api-Key": HEYGEN_API_KEY },
  });
  if (!response.ok) throw new Error("HeyGen voices error: " + await response.text());
  const data = await response.json();
  return data.data.voices;
}

export async function generateHeyGenVideo({ script, avatarId, voiceId }: {
  script: string; avatarId: string; voiceId: string;
}) {
  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Api-Key": HEYGEN_API_KEY,
    },
    body: JSON.stringify({
      video_inputs: [{
        character: avatarId.length === 32 ? {
          type: "talking_photo",
          talking_photo_id: avatarId,
        } : {
          type: "avatar",
          avatar_id: avatarId,
          avatar_style: "normal",
        },
        voice: { type: "text", input_text: script, voice_id: voiceId },
      }],
      dimension: { width: 1920, height: 1080 },
    }),
  });
  if (!response.ok) throw new Error("HeyGen generate error: " + await response.text());
  const data = await response.json();
  return data.data.video_id;
}

export async function checkHeyGenVideoStatus(videoId: string) {
  const response = await fetch("https://api.heygen.com/v1/video_status.get?video_id=" + videoId, {
    method: "GET",
    headers: { "Accept": "application/json", "X-Api-Key": HEYGEN_API_KEY },
  });
  if (!response.ok) throw new Error("HeyGen status error: " + await response.text());
  const data = await response.json();
  return {
    status: data.data.status,
    videoUrl: data.data.video_url || null,
    thumbnailUrl: data.data.thumbnail_url || null,
  };
}