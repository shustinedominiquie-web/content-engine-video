import { NextResponse } from "next/server";

export const dynamic = "force-static";
export const revalidate = 3600;

const HEYGEN_API_KEY = (
  process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || ""
).trim();

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      return NextResponse.json({ error: "HEYGEN_API_KEY not configured" }, { status: 500 });
    }

    const headers = { Accept: "application/json", "X-Api-Key": HEYGEN_API_KEY };

    const [avatarResult, voiceResult] = await Promise.allSettled([
      fetch("https://api.heygen.com/v1/avatar.list", { method: "GET", headers }),
      fetch("https://api.heygen.com/v1/voice.list", { method: "GET", headers }),
    ]);

    const avatarRes = avatarResult.status === "fulfilled" ? avatarResult.value : null;
    const voiceRes = voiceResult.status === "fulfilled" ? voiceResult.value : null;

    if (!avatarRes || !avatarRes.ok) {
      const err =
        avatarResult.status === "rejected"
          ? String((avatarResult as PromiseRejectedResult).reason)
          : avatarRes
          ? await avatarRes.text()
          : "no response";
      return NextResponse.json({ error: "HeyGen avatars failed: " + err }, { status: 500 });
    }

    const avatarData = await avatarRes.json();
    const avatars = (avatarData.data?.avatars || []).map((a: Record<string, unknown>) => ({
      avatar_id: a.avatar_id,
      avatar_name: a.avatar_name,
      is_talking_photo: false,
    }));
    const talkingPhotos = (avatarData.data?.talking_photos || []).map(
      (p: Record<string, unknown>) => ({
        avatar_id: p.talking_photo_id,
        avatar_name: (p.talking_photo_name || "Photo") + " (Photo)",
        is_talking_photo: true,
      })
    );

    let voices: Record<string, unknown>[] = [];
    if (voiceRes?.ok) {
      const voiceData = await voiceRes.json();
      voices = (voiceData.data?.voices || voiceData.data?.voice_list || []).map(
        (v: Record<string, unknown>) => ({
          voice_id: v.voice_id,
          name: v.name || v.language_name,
        })
      );
    }

    return NextResponse.json({ avatars: [...talkingPhotos, ...avatars], voices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

