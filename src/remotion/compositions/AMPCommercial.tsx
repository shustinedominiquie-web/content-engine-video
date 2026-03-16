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

// ─── Brand tokens ───────────────────────────────────────────────────────────
const B = {
  navy: "#0A1628",
  deep: "#0E2145",
  blue: "#1E6FF5",
  lightBlue: "#4A9EFF",
  gold: "#F5A623",
  white: "#FFFFFF",
  offWhite: "#E8EDF5",
};

// ─── Timing constants (frames @ 30fps) ──────────────────────────────────────
const T = {
  introEnd: 90,        // 3s
  avatarStart: 70,     // ~2.3s (small crossfade)
  avatarEnd: 840,      // 28s
  ctaStart: 800,       // 26.7s
  // Trend card windows [from, duration]
  trends: [
    { from: 160, dur: 95 },
    { from: 300, dur: 95 },
    { from: 440, dur: 95 },
    { from: 580, dur: 95 },
    { from: 720, dur: 95 },
  ] as { from: number; dur: number }[],
};

const TRENDS = [
  { num: "01", label: "AI-Powered Content Creation" },
  { num: "02", label: "Predictive Customer Analytics" },
  { num: "03", label: "Hyper-Personalization at Scale" },
  { num: "04", label: "Conversational AI Marketing" },
  { num: "05", label: "AI-Generated Video Production" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fadeIn = (frame: number, from: number, dur = 20) =>
  interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const fadeOut = (frame: number, from: number, dur = 20) =>
  interpolate(frame, [from, from + dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// ─── Animated background (gradient + floating shapes) ────────────────────────
const AnimatedBg: React.FC = () => {
  const frame = useCurrentFrame();
  const slow = frame * 0.3;
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(160deg, ${B.navy} 0%, ${B.deep} 60%, #0D1B3E 100%)` }}
    >
      {/* Floating orbs */}
      {[
        { x: 540, y: 300, r: 280, delay: 0, col: B.blue, op: 0.08 },
        { x: 200, y: 900, r: 200, delay: 40, col: B.lightBlue, op: 0.05 },
        { x: 900, y: 1500, r: 320, delay: 80, col: B.blue, op: 0.07 },
        { x: 100, y: 1700, r: 150, delay: 60, col: B.gold, op: 0.06 },
      ].map((o, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: o.x + Math.sin((slow + o.delay) * 0.015) * 30,
            top: o.y + Math.cos((slow + o.delay) * 0.012) * 25,
            width: o.r * 2,
            height: o.r * 2,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.col}${Math.round(o.op * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {/* Diagonal scan lines */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: `${i * 25}%`,
            width: "100%",
            height: 1,
            background: `linear-gradient(90deg, transparent, ${B.blue}22, transparent)`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ─── Intro screen ─────────────────────────────────────────────────────────────
const IntroScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ fps, frame, config: { damping: 14, stiffness: 120 }, durationInFrames: 30 });
  const lineWidth = interpolate(frame, [20, 55], [0, 680], { extrapolateRight: "clamp" });
  const subtitleOp = fadeIn(frame, 40, 25);
  const trendsOp = fadeIn(frame, 60, 20);

  return (
    <AbsoluteFill>
      <AnimatedBg />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
        }}
      >
        {/* Logo wordmark */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 6,
              color: B.white,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            ADVANTAGE
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: 4,
              color: B.gold,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
              marginTop: -8,
              marginBottom: -8,
            }}
          >
            MEDIA
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 6,
              color: B.white,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            PARTNERS
          </div>
        </div>

        {/* Gold divider line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${B.gold}, transparent)`,
            marginTop: 28,
            marginBottom: 28,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOp,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: B.offWhite,
              fontFamily: "sans-serif",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            PRESENTS
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            opacity: trendsOp,
            textAlign: "center",
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: B.white,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            5 AI
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: B.blue,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            MARKETING
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: B.white,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            TRENDS
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: B.gold,
              fontFamily: "sans-serif",
              marginTop: 16,
              letterSpacing: 2,
            }}
          >
            2025 Edition
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Top branding bar ─────────────────────────────────────────────────────────
const TopBar: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 0, 20);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 72,
        background: `linear-gradient(180deg, ${B.navy}EE 0%, ${B.navy}00 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        opacity,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* AMP Icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: B.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 900,
            color: B.navy,
            fontFamily: "sans-serif",
          }}
        >
          AMP
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: B.white,
            fontFamily: "sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          Advantage Media Partners
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: B.gold,
          fontFamily: "sans-serif",
          letterSpacing: 1,
        }}
      >
        2025 TREND REPORT
      </div>
    </div>
  );
};

// ─── Lower third ──────────────────────────────────────────────────────────────
const LowerThird: React.FC = () => {
  const frame = useCurrentFrame();
  const slideUp = spring({ fps: 30, frame, config: { damping: 20, stiffness: 150 }, durationInFrames: 25 });
  const yOff = interpolate(slideUp, [0, 1], [80, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${yOff}px)`,
        zIndex: 10,
      }}
    >
      {/* Gradient fade */}
      <div
        style={{
          height: 160,
          background: `linear-gradient(0deg, ${B.navy}CC 0%, transparent 100%)`,
        }}
      />
      {/* Brand strip */}
      <div
        style={{
          background: `linear-gradient(90deg, ${B.navy}F5 0%, ${B.deep}F5 100%)`,
          borderTop: `3px solid ${B.gold}`,
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: B.white,
              fontFamily: "sans-serif",
              letterSpacing: 1,
            }}
          >
            SHUSTINE SMITH
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: B.lightBlue,
              fontFamily: "sans-serif",
              letterSpacing: 1,
            }}
          >
            Advantage Media Partners
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: B.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 900,
            color: B.navy,
            fontFamily: "sans-serif",
          }}
        >
          AMP
        </div>
      </div>
    </div>
  );
};

// ─── B-roll motion graphic (between avatar segments) ─────────────────────────
const BRollGraphic: React.FC<{ num: string; dur: number }> = ({ num, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide-in overlay from right edge, covering center
  const slideIn = spring({ fps, frame, config: { damping: 18, stiffness: 180 }, durationInFrames: 18 });
  const slideOut =
    frame > dur - 22
      ? spring({ fps, frame: frame - (dur - 22), config: { damping: 18, stiffness: 200 }, durationInFrames: 18 })
      : 0;

  const xPct = interpolate(slideIn, [0, 1], [120, 0]);
  const xOut = interpolate(slideOut, [0, 1], [0, -130]);

  // Rotating accent ring
  const rotation = frame * 2;

  // Number scale pulse
  const numScale = interpolate(
    Math.sin(frame * 0.15),
    [-1, 1],
    [0.96, 1.04]
  );

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${xPct + xOut}%)`,
        pointerEvents: "none",
      }}
    >
      {/* Full-panel overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${B.blue}F0 0%, ${B.navy}F5 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Rotating ring accent */}
        <div
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: "50%",
            border: `2px solid ${B.gold}33`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: "50%",
            border: `1px solid ${B.lightBlue}44`,
            transform: `rotate(${-rotation * 0.7}deg)`,
          }}
        />

        {/* Trend number - giant */}
        <div
          style={{
            fontSize: 260,
            fontWeight: 900,
            color: B.white,
            fontFamily: "sans-serif",
            lineHeight: 1,
            opacity: 0.12,
            position: "absolute",
            transform: `scale(${numScale})`,
          }}
        >
          {num}
        </div>

        {/* TREND label */}
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: B.gold,
              fontFamily: "sans-serif",
              letterSpacing: 6,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            TREND
          </div>
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: B.white,
              fontFamily: "sans-serif",
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            {num}
          </div>
          <div
            style={{
              width: 80,
              height: 4,
              background: B.gold,
              margin: "12px auto 0",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Trend title card ─────────────────────────────────────────────────────────
const TrendTitleCard: React.FC<{ num: string; label: string; dur: number }> = ({ num, label, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Appear after B-roll number (delay ~20 frames)
  const localFrame = Math.max(0, frame - 20);
  const slideUp = spring({ fps, frame: localFrame, config: { damping: 16, stiffness: 160 }, durationInFrames: 20 });
  const opacity =
    frame < 20
      ? fadeIn(frame, 0, 20)
      : frame > dur - 20
      ? fadeOut(frame, dur - 20, 20)
      : 1;

  const yOff = interpolate(slideUp, [0, 1], [60, 0]);
  const lineWidth = interpolate(
    Math.min(localFrame, 30),
    [0, 30],
    [0, 460],
    { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 40,
        right: 40,
        opacity,
        transform: `translateY(${yOff}px)`,
        zIndex: 20,
      }}
    >
      {/* Background card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${B.navy}F0 0%, ${B.deep}F2 100%)`,
          border: `1px solid ${B.blue}55`,
          borderRadius: 16,
          padding: "28px 32px 24px",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Number badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: B.gold,
              fontFamily: "sans-serif",
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            TREND {num}
          </div>
          <div
            style={{
              flex: 1,
              height: 1,
              background: `${B.gold}66`,
            }}
          />
        </div>

        {/* Trend label */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: B.white,
            fontFamily: "sans-serif",
            lineHeight: 1.15,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </div>

        {/* Animated underline */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: `linear-gradient(90deg, ${B.blue}, ${B.gold})`,
            marginTop: 14,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

// ─── CTA screen ───────────────────────────────────────────────────────────────
const CTAScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const overlayOp = fadeIn(frame, 0, 25);
  const logoScale = spring({ fps, frame: Math.max(0, frame - 10), config: { damping: 14, stiffness: 100 }, durationInFrames: 30 });
  const textOp = fadeIn(frame, 25, 20);
  const urlOp = fadeIn(frame, 45, 20);
  const taglineOp = fadeIn(frame, 55, 20);

  return (
    <AbsoluteFill>
      {/* Dark overlay over avatar */}
      <AbsoluteFill
        style={{
          background: `${B.navy}E5`,
          opacity: overlayOp,
        }}
      />
      <AbsoluteFill>
        <AnimatedBg />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
          opacity: overlayOp,
        }}
      >
        {/* AMP Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              background: B.gold,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              color: B.navy,
              fontFamily: "sans-serif",
              margin: "0 auto 20px",
            }}
          >
            AMP
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 4,
              color: B.white,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            ADVANTAGE MEDIA PARTNERS
          </div>
        </div>

        {/* CTA headline */}
        <div
          style={{
            opacity: textOp,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: B.white,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            TRANSFORM
          </div>
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: B.blue,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            YOUR
          </div>
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: B.white,
              fontFamily: "sans-serif",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            MARKETING
          </div>
        </div>

        {/* URL pill */}
        <div
          style={{
            opacity: urlOp,
            background: B.blue,
            borderRadius: 50,
            padding: "16px 40px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: B.white,
              fontFamily: "sans-serif",
              letterSpacing: 1,
            }}
          >
            advantagemediapartners.com
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOp,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: B.offWhite,
              fontFamily: "sans-serif",
              letterSpacing: 2,
              opacity: 0.7,
            }}
          >
            YOUR COMPETITIVE EDGE IN AN AI-DRIVEN WORLD
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export interface AMPCommercialProps {
  avatarVideoUrl?: string;
}

export const AMPCommercial: React.FC<AMPCommercialProps> = ({ avatarVideoUrl }) => {
  const frame = useCurrentFrame();

  // Avatar crossfade
  const avatarFadeIn = interpolate(frame, [T.avatarStart, T.avatarStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: B.navy, overflow: "hidden" }}>
      {/* ── Layer 0: Avatar video (full-screen) ── */}
      {avatarVideoUrl && (
        <AbsoluteFill style={{ opacity: avatarFadeIn }}>
          <OffthreadVideo
            src={avatarVideoUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}

      {/* ── Layer 1: Intro screen (frames 0-90) ── */}
      <Sequence from={0} durationInFrames={T.introEnd}>
        <IntroScreen />
      </Sequence>

      {/* ── Layer 2: Top branding bar (frames 60+) ── */}
      <Sequence from={60}>
        <TopBar />
      </Sequence>

      {/* ── Layer 3: Lower third (frames 80-800) ── */}
      <Sequence from={80} durationInFrames={T.ctaStart - 80}>
        <LowerThird />
      </Sequence>

      {/* ── Layer 4: Trend B-roll + title cards ── */}
      {TRENDS.map((trend, i) => {
        const { from, dur } = T.trends[i];
        return (
          <React.Fragment key={i}>
            {/* B-roll motion graphic panel */}
            <Sequence from={from} durationInFrames={dur}>
              <BRollGraphic num={trend.num} dur={dur} />
            </Sequence>
            {/* Title card overlay (appears on top of B-roll) */}
            <Sequence from={from} durationInFrames={dur}>
              <TrendTitleCard num={trend.num} label={trend.label} dur={dur} />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* ── Layer 5: CTA screen (frames 800-900) ── */}
      <Sequence from={T.ctaStart}>
        <CTAScreen />
      </Sequence>
    </AbsoluteFill>
  );
};
