import { NextResponse } from "next/server";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || "";

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      return NextResponse.json({ error: "HEYGEN_API_KEY not configured" }, { status: 500 });
    }

    const headers = { Accept: "application/json", "X-Api-Key": HEYGEN_API_KEY };

    const [pubRes, privRes, voiceRes] = await Promise.all([
      fetch("https://api.heygen.com/v2/avatars", { method: "GET", headers }),
      fetch("https://api.heygen.com/v2/avatars?type=private", { method: "GET", headers }),
      fetch("https://api.heygen.com/v2/voices", { method: "GET", headers }),
    ]);

    if (!pubRes.ok) {
      return NextResponse.json({ error: "HeyGen avatars error: " + (await pubRes.text()) }, { status: 500 });
    }

    const pubData = await pubRes.json();
    const pubAvatars = (pubData.data?.avatars || []).map((a: Record<string, unknown>) => ({
      avatar_id: a.avatar_id,
      avatar_name: a.avatar_name,
      is_talking_photo: false,
    }));
    const pubPhotos = (pubData.data?.talking_photos || []).map((p: Record<string, unknown>) => ({
      avatar_id: p.talking_photo_id,
      avatar_name: (p.talking_photo_name || "Photo") + " (Photo)",
      is_talking_photo: true,
    }));

    let privAvatars: Record<string, unknown>[] = [];
    let privPhotos: Record<string, unknown>[] = [];
    if (privRes.ok) {
      const privData = await privRes.json();
      privAvatars = (privData.data?.avatars || []).map((a: Record<string, unknown>) => ({
        avatar_id: a.avatar_id,
        avatar_name: a.avatar_name,
        is_talking_photo: false,
      }));
      privPhotos = (privData.data?.talking_photos || []).map((p: Record<string, unknown>) => ({
        avatar_id: p.talking_photo_id,
        avatar_name: (p.talking_photo_name || "Photo") + " (Photo)",
        is_talking_photo: true,
      }));
    }

    let voices: Record<string, unknown>[] = [];
    if (voiceRes.ok) {
      const voiceData = await voiceRes.json();
      voices = (voiceData.data?.voices || []).map((v: Record<string, unknown>) => ({
        voice_id: v.voice_id,
        name: v.name,
      }));
    }

    return NextResponse.json({
      avatars: [...privPhotos, ...privAvatars, ...pubPhotos, ...pubAvatars],
      voices,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
