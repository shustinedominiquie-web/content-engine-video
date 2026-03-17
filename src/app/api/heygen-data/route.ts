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

    // Use v2 API — fetch only private/custom avatars (avoids massive public list)
    const [privResult, voiceResult] = await Promise.allSettled([
      fetch("https://api.heygen.com/v2/avatars?type=private", { method: "GET", headers }),
      fetch("https://api.heygen.com/v2/voices", { method: "GET", headers }),
    ]);

    const privRes = privResult.status === "fulfilled" ? privResult.value : null;
    const voiceRes = voiceResult.status === "fulfilled" ? voiceResult.value : null;

    if (!privRes || !privRes.ok) {
      const err =
        privResult.status === "rejected"
          ? String((privResult as PromiseRejectedResult).reason)
          : privRes
          ? await privRes.text()
          : "no response";
      return NextResponse.json({ error: "HeyGen avatars failed: " + err }, { status: 500 });
    }

    const privData = await privRes.json();
    const avatars = (privData.data?.avatars || []).map((a: Record<string, unknown>) => ({
      avatar_id: a.avatar_id,
      avatar_name: a.avatar_name,
      is_talking_photo: false,
    }));
    const talkingPhotos = (privData.data?.talking_photos || []).map(
      (p: Record<string, unknown>) => ({
        avatar_id: p.talking_photo_id,
        avatar_name: (p.talking_photo_name || "Photo") + " (Photo)",
        is_talking_photo: true,
      })
    );

    let voices: Record<string, unknown>[] = [];
    if (voiceRes?.ok) {
      const voiceData = await voiceRes.json();
      voices = (voiceData.data?.voices || []).map((v: Record<string, unknown>) => ({
        voice_id: v.voice_id,
        name: v.name,
      }));
    }

    return NextResponse.json({ avatars: [...talkingPhotos, ...avatars], voices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

