import { NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const HEYGEN_API_KEY = (
  process.env.HEYGEN_API_KEY || process.env.NEXT_PUBLIC_HEYGEN_API_KEY || ""
).trim();

export async function GET() {
  if (!HEYGEN_API_KEY) {
    return NextResponse.json({ error: "No API key" });
  }

  const headers = { Accept: "application/json", "X-Api-Key": HEYGEN_API_KEY };

  const [v2Res, voiceRes] = await Promise.allSettled([
    fetch("https://api.heygen.com/v2/avatars", { method: "GET", headers }),
    fetch("https://api.heygen.com/v2/voices", { method: "GET", headers }),
  ]);

  const v2Raw = v2Res.status === "fulfilled"
    ? { status: v2Res.value.status, ok: v2Res.value.ok, body: await v2Res.value.json().catch(() => "parse error") }
    : { error: String((v2Res as PromiseRejectedResult).reason) };

  const voiceRaw = voiceRes.status === "fulfilled"
    ? { status: voiceRes.value.status, ok: voiceRes.value.ok, body: await voiceRes.value.json().catch(() => "parse error") }
    : { error: String((voiceRes as PromiseRejectedResult).reason) };

  return NextResponse.json({ v2Avatars: v2Raw, v2Voices: voiceRaw });
}
