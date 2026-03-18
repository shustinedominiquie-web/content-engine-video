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
    // NOTE: We intentionally skip talking_photos — HeyGen's talking_photos array contains
    // thousands of public stock photos that all use UUID IDs (indistinguishable from private).
    // Shustine's custom avatars are all in the avatars array with UUID IDs.

    // Only keep private (custom) avatars: UUID IDs = private, named IDs (Abigail_...) = public stock
    const privateAvatars = allAvatars
      .filter((a) => isPrivateId(a.avatar_id))
      .filter((a, i, arr) => arr.findIndex((b) => b.avatar_id === a.avatar_id) === i)
      .map((a) => ({
        avatar_id: a.avatar_id as string,
        avatar_name: a.avatar_name as string,
        is_talking_photo: false,
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

    return NextResponse.json({ avatars: privateAvatars, voices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
