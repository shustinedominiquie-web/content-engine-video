import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

// ─── Brand tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F9FAFB",
  green: "#10B981",
  greenDark: "#059669",
  greenLight: "#D1FAE5",
  text: "#111827",
  textLight: "#6B7280",
  white: "#FFFFFF",
  black: "#111827",
  red: "#EF4444",      // for the "lost" / frustrated moments
};

// ─── Timing (frames @ 30fps, 2-min video = 3600 frames) ──────────────────────
// These align roughly with when the avatar speaks each section
const T = {
  introEnd: 90,          // 0-3s  : logo reveal
  avatarStart: 70,       // crossfade starts
  // Step graphics — timed to match the script sections
  step1From: 380,  step1Dur: 200,   // ~Step 1 Keywords
  step2From: 750,  step2Dur: 200,   // ~Step 2 Content
  step3From: 1100, step3Dur: 200,   // ~Step 3 Backlinks
  step4From: 1450, step4Dur: 200,   // ~Step 4 Page Speed
  step5From: 1750, step5Dur: 200,   // ~Step 5 Mobile
  rankFrom:  2100, rankDur:  300,   // Rankings climbing
  ctaFrom:   3420,                  // last ~6 seconds
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fi = (frame: number, from: number, dur = 20) =>
  interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const fo = (frame: number, from: number, dur = 20) =>
  interpolate(frame, [from, from + dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ─── Clean background ─────────────────────────────────────────────────────────
const CleanBg: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {/* Subtle grid */}
    <AbsoluteFill style={{
      backgroundImage: `linear-gradient(${C.green}08 1px, transparent 1px), linear-gradient(90deg, ${C.green}08 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
    }} />
  </AbsoluteFill>
);

// ─── Intro logo reveal ────────────────────────────────────────────────────────
const IntroLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ fps, frame, config: { damping: 12, stiffness: 100 }, durationInFrames: 30 });
  const lineW = interpolate(frame, [15, 55], [0, 520], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tagOp = fi(frame, 50, 25);
  const overall = frame > 70 ? fo(frame, 70, 18) : 1;

  return (
    <AbsoluteFill style={{ opacity: overall }}>
      <CleanBg />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

        {/* Logo wordmark */}
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", marginBottom: 8 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: C.green, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: C.white, fontFamily: "sans-serif",
            }}>AMP</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.text, fontFamily: "sans-serif", letterSpacing: 1, lineHeight: 1 }}>
                ADVANTAGE MEDIA
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.green, fontFamily: "sans-serif", letterSpacing: 1, lineHeight: 1 }}>
                PARTNERS
              </div>
            </div>
          </div>
        </div>

        {/* Green underline */}
        <div style={{ width: lineW, height: 3, background: C.green, borderRadius: 2, marginTop: 16, marginBottom: 16 }} />

        {/* Tagline */}
        <div style={{ opacity: tagOp, fontSize: 18, color: C.textLight, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          Digital Marketing Experts
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Top branding bar ─────────────────────────────────────────────────────────
const TopBar: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = fi(frame, 0, 20);
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 64,
      background: `${C.white}F0`, borderBottom: `3px solid ${C.green}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 36px", opacity, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 900, color: C.white, fontFamily: "sans-serif",
        }}>AMP</div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "sans-serif", letterSpacing: 1 }}>
          Advantage Media Partners
        </span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, color: C.green, fontFamily: "sans-serif",
        letterSpacing: 2, textTransform: "uppercase",
      }}>
        SEO Explainer
      </div>
    </div>
  );
};

// ─── Lower third ──────────────────────────────────────────────────────────────
const LowerThird: React.FC = () => {
  const frame = useCurrentFrame();
  const slide = spring({ fps: 30, frame, config: { damping: 20, stiffness: 150 }, durationInFrames: 25 });
  const y = interpolate(slide, [0, 1], [80, 0]);
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: `translateY(${y}px)`, zIndex: 10 }}>
      <div style={{ height: 100, background: `linear-gradient(0deg, ${C.white}EE 0%, transparent 100%)` }} />
      <div style={{
        background: C.white, borderTop: `3px solid ${C.green}`,
        padding: "14px 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "sans-serif" }}>SHUSTINE SMITH</div>
          <div style={{ fontSize: 12, color: C.green, fontFamily: "sans-serif", fontWeight: 500 }}>Advantage Media Partners · advantagemediapartners.com</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 900, color: C.white, fontFamily: "sans-serif",
        }}>AMP</div>
      </div>
    </div>
  );
};

// ─── Step info card (appears as an overlay on the right side) ─────────────────
interface StepCardProps {
  step: number;
  title: string;
  icon: string;
  bullets: string[];
  dur: number;
}
const StepCard: React.FC<StepCardProps> = ({ step, title, icon, bullets, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ fps, frame, config: { damping: 16, stiffness: 140 }, durationInFrames: 22 });
  const slideOut = frame > dur - 24
    ? spring({ fps, frame: frame - (dur - 24), config: { damping: 16, stiffness: 160 }, durationInFrames: 22 })
    : 0;
  const xPct = interpolate(slideIn, [0, 1], [110, 0]);
  const xOut = interpolate(slideOut, [0, 1], [0, 110]);
  const opacity = frame < 5 ? fi(frame, 0, 5) : frame > dur - 5 ? fo(frame, dur - 5, 5) : 1;

  return (
    <div style={{
      position: "absolute", top: "50%", right: 36,
      transform: `translateX(${xPct + xOut}%) translateY(-50%)`,
      opacity,
      width: 320, zIndex: 20,
    }}>
      <div style={{
        background: C.white, borderRadius: 16,
        border: `2px solid ${C.green}`,
        padding: "20px 22px",
        boxShadow: `0 8px 32px ${C.green}22`,
      }}>
        {/* Step badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontFamily: "sans-serif",
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
              STEP {step}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: "sans-serif", lineHeight: 1.1 }}>
              {title}
            </div>
          </div>
        </div>
        {/* Divider */}
        <div style={{ height: 2, background: C.greenLight, marginBottom: 10, borderRadius: 1 }} />
        {/* Bullets */}
        {bullets.map((b, i) => {
          const bulletDelay = 8 + i * 6;
          const bulletOp = clamp01((frame - bulletDelay) / 10);
          const bulletY = interpolate(clamp01((frame - bulletDelay) / 12), [0, 1], [12, 0]);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, opacity: bulletOp, transform: `translateY(${bulletY}px)` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.text, fontFamily: "sans-serif", lineHeight: 1.3 }}>{b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Rankings climbing graphic ────────────────────────────────────────────────
const RankingsGraphic: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ fps, frame, config: { damping: 16, stiffness: 140 }, durationInFrames: 22 });
  const x = interpolate(slideIn, [0, 1], [110, 0]);
  const overallOp = frame > dur - 24 ? fo(frame, dur - 24, 18) : 1;

  const ranks = [
    { pos: 11, label: "Before SEO", color: C.red },
    { pos: 7, label: "Month 2", color: "#F59E0B" },
    { pos: 3, label: "Month 4", color: "#3B82F6" },
    { pos: 1, label: "Page One! 🎉", color: C.green },
  ];

  return (
    <div style={{
      position: "absolute", top: "50%", right: 36,
      transform: `translateX(${x}%) translateY(-50%)`,
      opacity: overallOp, width: 300, zIndex: 20,
    }}>
      <div style={{ background: C.white, borderRadius: 16, border: `2px solid ${C.green}`, padding: "20px 22px", boxShadow: `0 8px 32px ${C.green}22` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: "sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
          📈 YOUR RANKINGS
        </div>
        {ranks.map((r, i) => {
          const delay = i * 12;
          const progress = clamp01((frame - delay) / 18);
          const barW = interpolate(progress, [0, 1], [0, ((11 - r.pos + 1) / 11) * 220]);
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.textLight, fontFamily: "sans-serif" }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: "sans-serif" }}>#{r.pos}</span>
              </div>
              <div style={{ height: 8, background: C.greenLight, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: barW, height: "100%", background: r.color, borderRadius: 4, transition: "width 0.1s" }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 8, padding: "8px 12px", background: C.greenLight, borderRadius: 8, textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.greenDark, fontFamily: "sans-serif" }}>
            ↑ 10 positions in 4 months
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── CTA outro ────────────────────────────────────────────────────────────────
const CTAOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOp = fi(frame, 0, 20);
  const logoScale = spring({ fps, frame: Math.max(0, frame - 10), config: { damping: 14, stiffness: 100 }, durationInFrames: 28 });
  const headOp = fi(frame, 28, 20);
  const urlOp = fi(frame, 50, 18);
  const tagOp = fi(frame, 65, 18);

  return (
    <AbsoluteFill style={{ opacity: bgOp }}>
      <CleanBg />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>

        {/* Logo */}
        <div style={{ transform: `scale(${logoScale})`, textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 18, background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: C.white, fontFamily: "sans-serif", margin: "0 auto 14px",
          }}>AMP</div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3, color: C.text, fontFamily: "sans-serif", textTransform: "uppercase" }}>
            Advantage Media Partners
          </div>
        </div>

        {/* Headline */}
        <div style={{ opacity: headOp, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.text, fontFamily: "sans-serif", lineHeight: 1.1 }}>Ready to reach</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.green, fontFamily: "sans-serif", lineHeight: 1.1 }}>Page One?</div>
        </div>

        {/* URL pill */}
        <div style={{ opacity: urlOp, background: C.green, borderRadius: 50, padding: "14px 36px", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, fontFamily: "sans-serif" }}>
            advantagemediapartners.com
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, fontSize: 15, color: C.textLight, fontFamily: "sans-serif", letterSpacing: 1, textAlign: "center" }}>
          Let&apos;s get you off page eleven — for good.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export interface SEOExplainerProps {
  avatarVideoUrl?: string;
  durationInFrames?: number;
}

export const SEOExplainer: React.FC<SEOExplainerProps> = ({ avatarVideoUrl }) => {
  const frame = useCurrentFrame();

  const avatarFade = interpolate(frame, [T.avatarStart, T.avatarStart + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>

      {/* ── Layer 0: Avatar video (full screen behind everything) ── */}
      {avatarVideoUrl && (
        <AbsoluteFill style={{ opacity: avatarFade }}>
          <OffthreadVideo src={avatarVideoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}

      {/* ── Layer 1: Intro logo reveal (0–90) ── */}
      <Sequence from={0} durationInFrames={T.introEnd}>
        <IntroLogo />
      </Sequence>

      {/* ── Layer 2: Top branding bar (frames 55+) ── */}
      <Sequence from={55}>
        <TopBar />
      </Sequence>

      {/* ── Layer 3: Lower third (80–ctaFrom) ── */}
      <Sequence from={80} durationInFrames={T.ctaFrom - 80}>
        <LowerThird />
      </Sequence>

      {/* ── Layer 4: Step 1 — Keywords ── */}
      <Sequence from={T.step1From} durationInFrames={T.step1Dur}>
        <StepCard
          step={1} title="Keywords" icon="🔍" dur={T.step1Dur}
          bullets={["Target exact phrases your customers search", "Use them naturally — not 17× per page", "Long-tail = less competition, more intent"]}
        />
      </Sequence>

      {/* ── Layer 5: Step 2 — Content ── */}
      <Sequence from={T.step2From} durationInFrames={T.step2Dur}>
        <StepCard
          step={2} title="Content" icon="✍️" dur={T.step2Dur}
          bullets={["Blogs, guides & pages that answer real questions", "Google rewards helpful, original content", "No lorem ipsum — ever."]}
        />
      </Sequence>

      {/* ── Layer 6: Step 3 — Backlinks ── */}
      <Sequence from={T.step3From} durationInFrames={T.step3Dur}>
        <StepCard
          step={3} title="Backlinks" icon="🔗" dur={T.step3Dur}
          bullets={["Reputable sites linking to you = trust signal", "Think Yelp reviews — for the whole internet", "Quality > quantity"]}
        />
      </Sequence>

      {/* ── Layer 7: Step 4 — Page Speed ── */}
      <Sequence from={T.step4From} durationInFrames={T.step4Dur}>
        <StepCard
          step={4} title="Page Speed" icon="⚡" dur={T.step4Dur}
          bullets={["Slow sites = instant visitor exits", "Under 3 seconds to load — or else", "Like a bad first date. No second chance."]}
        />
      </Sequence>

      {/* ── Layer 8: Step 5 — Mobile ── */}
      <Sequence from={T.step5From} durationInFrames={T.step5Dur}>
        <StepCard
          step={5} title="Mobile First" icon="📱" dur={T.step5Dur}
          bullets={["60%+ of searches happen on phones", "Broken mobile = money left on the table", "Responsive design is non-negotiable"]}
        />
      </Sequence>

      {/* ── Layer 9: Rankings climbing ── */}
      <Sequence from={T.rankFrom} durationInFrames={T.rankDur}>
        <RankingsGraphic dur={T.rankDur} />
      </Sequence>

      {/* ── Layer 10: CTA outro (last ~6 seconds) ── */}
      <Sequence from={T.ctaFrom}>
        <CTAOutro />
      </Sequence>

    </AbsoluteFill>
  );
};
