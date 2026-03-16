/**
 * generate-amp-commercial.ts
 *
 * End-to-end pipeline:
 *  1. Generate DAVID talking-photo video via HeyGen /v2/video/generate (9:16)
 *  2. Poll until complete, save state so the run is resumable
 *  3. Download avatar MP4 to public/david-commercial.mp4 (local backup)
 *  4. Render the AMPCommercial Remotion composition using the HeyGen CDN URL
 *     → out/amp-commercial.mp4
 *
 * Run:
 *   node --experimental-strip-types scripts/generate-amp-commercial.ts
 *
 * To skip re-generating HeyGen (if public/david-commercial.mp4 already exists):
 *   SKIP_HEYGEN=1 node --experimental-strip-types scripts/generate-amp-commercial.ts
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// ─── Load .env ──────────────────────────────────────────────────────────────
function loadEnv(envPath: string): void {
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* .env may not exist in CI */ }
}

loadEnv(path.resolve(process.cwd(), ".env"));

// ─── Config ──────────────────────────────────────────────────────────────────
const HEYGEN_API_KEY =
  process.env.HEYGEN_API_KEY ||
  process.env.NEXT_PUBLIC_HEYGEN_API_KEY ||
  "";

if (!HEYGEN_API_KEY) {
  console.error("❌  HEYGEN_API_KEY not found in .env");
  process.exit(1);
}

const AVATAR_ID = "1cf12b3b8d9b4b6bb1676cf1777cbaf1"; // Shustine Smith (7)
const VOICE_ID = "7a51c61879754fc7b8ba99657e98de5f";  // SHUSTINE24 voice

// 9:16 portrait for TV reels / social vertical
const DIMENSION = { width: 1080, height: 1920 };

const STATE_FILE = path.resolve(process.cwd(), "scripts", ".amp-state.json");
const AVATAR_LOCAL = path.resolve(process.cwd(), "public", "david-commercial.mp4");
const OUT_PATH = path.resolve(process.cwd(), "out", "amp-commercial.mp4");

// Approx 22s of speech → 28s with Remotion intro/CTA = ~30s total
const DAVID_SCRIPT = `Welcome to Advantage Media Partners. \
<break time="0.4s"/> \
AI is transforming the marketing world — right now. \
<break time="0.4s"/> \
Here are five trends you cannot ignore. \
<break time="0.5s"/> \
Number one — AI-Powered Content Creation. \
<break time="0.3s"/> \
Number two — Predictive Customer Analytics. \
<break time="0.3s"/> \
Number three — Hyper-Personalization at Scale. \
<break time="0.3s"/> \
Number four — Conversational AI Marketing. \
<break time="0.3s"/> \
And number five — AI-Generated Video Production. \
<break time="0.5s"/> \
Don't get left behind. \
<break time="0.3s"/> \
Advantage Media Partners is your competitive edge. \
<break time="0.3s"/> \
Visit us at advantage media partners dot com.`;

// ─── State helpers ────────────────────────────────────────────────────────────
interface AmpState {
  videoId?: string;
  videoUrl?: string;
}

function readState(): AmpState {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf-8")); }
  catch { return {}; }
}

function saveState(state: AmpState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── HeyGen helpers ───────────────────────────────────────────────────────────
const heyHeaders = {
  "X-Api-Key": HEYGEN_API_KEY,
  "Content-Type": "application/json",
};

async function submitHeyGenVideo(): Promise<string> {
  console.log("🎬  Submitting HeyGen video generation...");

  const body = {
    title: "AMP – 5 AI Marketing Trends Commercial",
    test: false,
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: AVATAR_ID,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: DAVID_SCRIPT,
          voice_id: VOICE_ID,
          speed: 1.0,
          pitch: 0,
        },
        background: {
          type: "color",
          value: "#0A1628", // AMP navy – covered by Remotion layers in final render
        },
      },
    ],
    dimension: DIMENSION,
  };

  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: heyHeaders,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { error?: string; data?: { video_id: string } };

  if (json.error || !json.data?.video_id) {
    throw new Error(`HeyGen submission failed: ${json.error ?? JSON.stringify(json)}`);
  }

  console.log(`✅  Submitted → video_id: ${json.data.video_id}`);
  return json.data.video_id;
}

interface PollResult {
  videoUrl: string;
  duration?: number;
}

async function pollUntilReady(videoId: string): Promise<PollResult> {
  const INTERVAL = 10_000;
  const MAX = 120; // 20 min
  console.log("⏳  Waiting for HeyGen render (typically 5-15 min)...");

  for (let i = 0; i < MAX; i++) {
    await new Promise((r) => setTimeout(r, INTERVAL));

    const res = await fetch(`https://api.heygen.com/v2/videos/${videoId}`, {
      headers: heyHeaders,
    });
    const json = (await res.json()) as {
      data: { status: string; video_url?: string; failure_message?: string; duration?: number };
    };

    const { status, video_url, failure_message, duration } = json.data;
    const elapsed = ((i + 1) * INTERVAL) / 1000;
    process.stdout.write(`\r  [${elapsed}s] ${status}                     `);

    if (status === "completed" && video_url) {
      console.log(`\n✅  HeyGen complete! Duration: ${duration ?? "?"}s`);
      return { videoUrl: video_url, duration };
    }

    if (status === "failed") {
      throw new Error(`HeyGen failed: ${failure_message}`);
    }
  }

  throw new Error("Polling timed out after 20 minutes");
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`⬇️   Downloading → ${path.relative(process.cwd(), dest)}`);
  mkdirSync(path.dirname(dest), { recursive: true });

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);

  const ws = createWriteStream(dest);
  await pipeline(Readable.fromWeb(res.body as import("stream/web").ReadableStream), ws);
  console.log("✅  Download complete.");
}

// ─── Remotion render ──────────────────────────────────────────────────────────
async function render(avatarVideoUrl: string): Promise<void> {
  console.log("\n🎞️   Starting Remotion render pipeline...");

  const { bundle } = await import("@remotion/bundler");
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  const entryPoint = path.resolve(process.cwd(), "src", "remotion", "index.ts");
  const publicDir = path.resolve(process.cwd(), "public");

  // 1. Bundle
  process.stdout.write("  Bundling Remotion composition...");
  const serveUrl = await bundle({
    entryPoint,
    publicDir,
    onProgress: (p) => process.stdout.write(`\r  Bundle: ${Math.round(p * 100)}%  `),
  });
  console.log("\n  Bundle ready.");

  // 2. Select composition
  const composition = await selectComposition({
    serveUrl,
    id: "AMPCommercial",
    inputProps: { avatarVideoUrl },
  });

  // 3. Render
  console.log("  Rendering 900 frames @ 30fps (1080×1920)...");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: OUT_PATH,
    inputProps: { avatarVideoUrl },
    onProgress: ({ progress, renderedFrames }) =>
      process.stdout.write(
        `\r  Rendered: ${renderedFrames ?? 0}/900 frames (${Math.round(progress * 100)}%)  `
      ),
    crf: 18,
    pixelFormat: "yuv420p",
  });

  console.log(`\n✅  Final video → ${path.relative(process.cwd(), OUT_PATH)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const banner = "═".repeat(60);
  console.log(`\n${banner}`);
  console.log("  AMP – 5 AI Marketing Trends | 30-sec 9:16 Commercial");
  console.log(`${banner}\n`);

  const skipHeygen = process.env.SKIP_HEYGEN === "1" || existsSync(AVATAR_LOCAL);
  let avatarVideoUrl: string;

  if (skipHeygen) {
    // If skipping, try to use a previously saved CDN URL first (it may still be valid)
    const state = readState();
    if (state.videoUrl) {
      console.log("ℹ️   Reusing saved HeyGen CDN URL from state file.");
      avatarVideoUrl = state.videoUrl;
    } else {
      // Fall back to the local file – serve it via a simple temporary HTTP server
      console.log("ℹ️   Using local public/david-commercial.mp4 (no CDN URL in state).");
      // Remotion's OffthreadVideo can use a file:// URL with absolute path for local renders
      avatarVideoUrl = `file://${AVATAR_LOCAL}`;
    }
  } else {
    // Fresh HeyGen generation
    const state = readState();

    // Resume from existing video_id if it hasn't completed
    let videoId = state.videoId;
    if (!videoId) {
      videoId = await submitHeyGenVideo();
      saveState({ videoId });
    } else {
      console.log(`ℹ️   Resuming poll for existing video_id: ${videoId}`);
    }

    const result = await pollUntilReady(videoId);
    saveState({ videoId, videoUrl: result.videoUrl });

    // Download locally as backup
    await downloadFile(result.videoUrl, AVATAR_LOCAL);

    avatarVideoUrl = result.videoUrl; // HeyGen CDN URL works for OffthreadVideo
  }

  console.log(`\n📹  Avatar video URL: ${avatarVideoUrl.slice(0, 60)}...`);

  await render(avatarVideoUrl);

  console.log(`\n${banner}`);
  console.log("  🎉  Done! Output: out/amp-commercial.mp4");
  console.log(`${banner}\n`);
}

main().catch((err: Error) => {
  console.error(`\n❌  Fatal: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
