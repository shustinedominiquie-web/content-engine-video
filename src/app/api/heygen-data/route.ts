import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
// NOTE: do NOT set revalidate here — it conflicts with force-dynamic and can cache stale data

const HEYGEN_API_KEY = (
  process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || ""
).trim();

// Private (custom) avatars always have a 32-character lowercase hex UUID.
// Public/stock HeyGen avatars use named IDs like "Abigail_public_...".
// Filtering to private-only keeps the response tiny and fast (8 avatars vs 1303).
const isPrivateId = (id: unknown): boolean =>
  typeof id === "string" && /^[0-9a-f]{32}$/i.test(id);

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      return NextResponse.json({ error: "HEYGEN_API_KEY not configured" }, { status: 500 });
    }

    const headers = { Accept: "application/json", "X-Api-Key": HEYGEN_API_KEY };

    const [avatarResult, voiceResult] = await Promise.allSettled([
      fetch("https://api.heygen.com/v2/avatars", { method: "GET", headers }),
      fetch("https://api.heygen.com/v2/voices",  { method: "GET", headers }),
    ]);

    // ── Avatars ────────────────────────────────────────────────────────────
    if (avatarResult.status === "rejected" || !avatarResult.value.ok) {
      const err =
        avatarResult.status === "rejected"
          ? String((avatarResult as PromiseRejectedResult).reason)
          : await avatarResult.value.text();
      return NextResponse.json({ error: "HeyGen avatars failed: " + err }, { status: 500 });
    }

    const avatarData = await avatarResult.value.json();
    const allAvatars: Record<string, unknown>[] = avatarData.data?.avatars || [];
    const allPhotos: Record<string, unknown>[] = avatarData.data?.talking_photos || [];

    // Only keep private (custom) avatars — deduplicate by avatar_id
    const privateAvatars = allAvatars
      .filter((a) => isPrivateId(a.avatar_id))
      .filter((a, i, arr) => arr.findIndex((b) => b.avatar_id === a.avatar_id) === i)
      .map((a) => ({
        avatar_id: a.avatar_id as string,
        avatar_name: a.avatar_name as string,
        is_talking_photo: false,
      }));

    const privateTalkingPhotos = allPhotos
      .filter((p) => isPrivateId(p.talking_photo_id))
      .filter((p, i, arr) => arr.findIndex((b) => b.talking_photo_id === p.talking_photo_id) === i)
      .map((p) => ({
        avatar_id: p.talking_photo_id as string,
        avatar_name: ((p.talking_photo_name as string) || "Photo") + " (Photo)",
        is_talking_photo: true,
      }));

    // ── Voices ────────────────────────────────────────────────────────────
    let voices: { voice_id: string; name: string }[] = [];
    if (voiceResult.status === "fulfilled" && voiceResult.value.ok) {
      const voiceData = await voiceResult.value.json();
      voices = (voiceData.data?.voices || []).map((v: Record<string, unknown>) => ({
        voice_id: v.voice_id as string,
        name: v.name as string,
      }));
    }

    const avatars = [...privateTalkingPhotos, ...privateAvatars];
    return NextResponse.json({ avatars, voices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
