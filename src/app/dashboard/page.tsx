"use client";

import { useState, useEffect, useCallback } from "react";

type ContentItem = {
  id: number;
  title: string;
  platform: string;
  date: string;
  status: string;
  avatar: string;
  avatarId: string;
  voice: string;
  voiceId: string;
  script: string;
  videoUrl: string | null;
  heygenVideoId: string | null;
  generationProgress: number;
  is_talking_photo: boolean;
  format: string;
  formatWidth: number;
  formatHeight: number;
  remotionRenderId: string | null;
  remotionBucket: string | null;
  remotionProgress: number;
  remotionVideoUrl: string | null;
};

type HeyGenAvatar = {
  avatar_id: string;
  avatar_name: string;
  is_talking_photo: boolean;
};

type HeyGenVoice = {
  voice_id: string;
  name: string;
};

// ─── Preferred avatars & voice ────────────────────────────────────────────────
const PREFERRED_AVATARS = [
  { name: "Shustine Smith7", keyword: "shustine" },
  { name: "david2", keyword: "david" },
];
const PREFERRED_VOICE_ID = "SHUSTINE27";
const PREFERRED_VOICE_KEYWORD = "shustine";

function findPreferredAvatar(avatars: HeyGenAvatar[]): HeyGenAvatar | undefined {
  for (const pref of PREFERRED_AVATARS) {
    const match = avatars.find(
      (a) => a.avatar_name.toLowerCase().includes(pref.keyword.toLowerCase()),
    );
    if (match) return match;
  }
  return avatars[0];
}

function findPreferredVoice(voices: HeyGenVoice[]): HeyGenVoice | undefined {
  const exact = voices.find((v) => v.voice_id === PREFERRED_VOICE_ID);
  if (exact) return exact;
  const keyword = voices.find((v) =>
    v.name.toLowerCase().includes(PREFERRED_VOICE_KEYWORD),
  );
  if (keyword) return keyword;
  return voices[0];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS = ["Twitter", "LinkedIn", "Facebook", "Instagram", "TikTok"];
const PLATFORM_COLORS: Record<string, string> = {
  Twitter: "#1DA1F2",
  LinkedIn: "#0A66C2",
  Facebook: "#1877F2",
  Instagram: "#E1306C",
  TikTok: "#000000",
};

const VIDEO_FORMATS = [
  { id: "reel", label: "Reel / Short (9:16)", width: 1080, height: 1920 },
  { id: "square", label: "Square (1:1)", width: 1080, height: 1080 },
  { id: "wide", label: "Widescreen (16:9)", width: 1920, height: 1080 },
  { id: "story", label: "Story (9:16 Full)", width: 1080, height: 1920 },
  { id: "x-post", label: "X Post (16:9)", width: 1920, height: 1080 },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft:             { bg: "#333",      text: "#888",    label: "Draft" },
  generating_script: { bg: "#2563eb33", text: "#60a5fa", label: "Writing Script..." },
  generating:        { bg: "#2563eb33", text: "#60a5fa", label: "HeyGen Rendering" },
  rendering_remotion:{ bg: "#f59e0b33", text: "#fbbf24", label: "Remotion" },
  in_review:         { bg: "#10b98133", text: "#34d399", label: "In Review" },
  approved:          { bg: "#10b98133", text: "#34d399", label: "Approved" },
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function DashboardPage() {
  const [view, setView] = useState("generator");
  const [items, setItems] = useState<ContentItem[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: ["5 AI Marketing Trends","Social Media ROI","Brand Voice Guide","Video Content Tips","Audience Growth"][i],
      platform: PLATFORMS[i % PLATFORMS.length],
      date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
      status: "draft",
      avatar: "",
      avatarId: "",
      voice: "",
      voiceId: "",
      script: "",
      videoUrl: null,
      heygenVideoId: null,
      generationProgress: 0,
      is_talking_photo: false,
      format: "reel",
      formatWidth: 1080,
      formatHeight: 1920,
      remotionRenderId: null,
      remotionBucket: null,
      remotionProgress: 0,
      remotionVideoUrl: null,
    }))
  );
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<Record<number, string>>({});

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  // ─── Load HeyGen data in background (non-blocking) ───────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 15000);
        let res: Response;
        try {
          res = await fetch("/api/heygen-data", { signal: controller.signal });
        } finally {
          clearTimeout(tid);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const avs: HeyGenAvatar[] = data.avatars || [];
        const vcs: HeyGenVoice[] = data.voices || [];
        setAvatars(avs);
        setVoices(vcs);
        const defaultAvatar = findPreferredAvatar(avs);
        const defaultVoice = findPreferredVoice(vcs);
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            avatar: item.avatar || defaultAvatar?.avatar_name || "",
            avatarId: item.avatarId || defaultAvatar?.avatar_id || "",
            voice: item.voice || defaultVoice?.name || "",
            voiceId: item.voiceId || defaultVoice?.voice_id || "",
            is_talking_photo: item.avatarId ? item.is_talking_photo : (defaultAvatar?.is_talking_photo ?? false),
          }))
        );
      } catch (e) {
        console.error("Failed to load HeyGen data:", e);
      } finally {
        setAvatarsLoading(false);
      }
    }
    loadData();
  }, []);

  const updateItem = useCallback(
    (id: number, updates: Partial<ContentItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      );
      setEditingItem((prev) =>
        prev && prev.id === id ? { ...prev, ...updates } : prev,
      );
    },
    [],
  );

  // ─── Step 1: Generate Script ───────────────────────────────────────────────
  const handleGenerateScript = async (item: ContentItem) => {
    updateItem(item.id, { status: "generating_script" });
    setPipelineStatus((p) => ({ ...p, [item.id]: "Writing script with Claude..." }));
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "script",
          title: item.title,
          platform: item.platform,
          avatarName: item.avatar,
          voiceName: item.voice,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      updateItem(item.id, { script: data.script, status: "draft" });
      setPipelineStatus((p) => ({ ...p, [item.id]: "Script ready — review it below, then click Step 2." }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPipelineStatus((p) => ({ ...p, [item.id]: "Script error: " + msg }));
      updateItem(item.id, { status: "draft" });
    }
  };

  // ─── Step 2: Send to HeyGen ────────────────────────────────────────────────
  const handleGenerateVideo = async (item: ContentItem) => {
    if (!item.script) { alert("Generate a script first!"); return; }
    if (!item.avatarId) { alert("Avatars are still loading — wait a moment and try again."); return; }
    updateItem(item.id, { status: "generating", generationProgress: 0 });
    setPipelineStatus((p) => ({ ...p, [item.id]: "Submitting to HeyGen..." }));
    try {
      const heygenRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "heygen",
          script: item.script,
          avatarId: item.avatarId,
          voiceId: item.voiceId,
          isTalkingPhoto: item.is_talking_photo,
          format: item.format,
          width: item.formatWidth,
          height: item.formatHeight,
        }),
      });
      const heygenData = await heygenRes.json();
      if (heygenData.error) throw new Error(heygenData.error);
      updateItem(item.id, { heygenVideoId: heygenData.videoId });
      setPipelineStatus((p) => ({ ...p, [item.id]: "HeyGen is rendering your avatar video (2–10 min)..." }));

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 80) {
          clearInterval(interval);
          setPipelineStatus((p) => ({ ...p, [item.id]: "HeyGen timed out. Please check HeyGen directly." }));
          updateItem(item.id, { status: "draft" });
          return;
        }
        try {
          const pollRes = await fetch("/api/pipeline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "poll-check", videoId: heygenData.videoId }),
          });
          const pollData = await pollRes.json();
          updateItem(item.id, { generationProgress: Math.min(95, attempts * 2) });
          if (pollData.status === "completed") {
            clearInterval(interval);
            updateItem(item.id, { status: "in_review", generationProgress: 100, videoUrl: pollData.videoUrl });
            setPipelineStatus((p) => ({ ...p, [item.id]: "Avatar video ready! Preview below, then click Step 3 to add Remotion animations." }));
          } else if (pollData.status === "failed") {
            clearInterval(interval);
            updateItem(item.id, { status: "draft", generationProgress: 0 });
            setPipelineStatus((p) => ({ ...p, [item.id]: "HeyGen video generation failed." }));
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 10000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPipelineStatus((p) => ({ ...p, [item.id]: "HeyGen error: " + msg }));
      updateItem(item.id, { status: "draft" });
    }
  };

  // ─── Step 3: Remotion commercial ──────────────────────────────────────────
  const handleCreateRemotionVideo = async (item: ContentItem) => {
    if (!item.videoUrl) { alert("Generate a HeyGen video first!"); return; }
    updateItem(item.id, { status: "rendering_remotion", remotionProgress: 0 });
    setPipelineStatus((p) => ({ ...p, [item.id]: "Rendering Remotion commercial..." }));
    try {
      const res = await fetch("/api/lambda/render-commercial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarVideoUrl: item.videoUrl, width: item.formatWidth, height: item.formatHeight }),
      });
      const data = await res.json();
      if (data.type === "error") throw new Error(data.message);
      const { renderId, bucketName } = data.data;
      updateItem(item.id, { remotionRenderId: renderId, remotionBucket: bucketName });

      let done = false;
      let safetyCount = 0;
      while (!done && safetyCount < 200) {
        safetyCount++;
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const progRes = await fetch("/api/lambda/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: renderId, bucketName }),
          });
          const progData = await progRes.json();
          if (progData.type === "error") throw new Error(progData.message);
          const inner = progData.data ?? progData;
          if (inner.type === "error") throw new Error(inner.message);
          if (inner.type === "done") {
            updateItem(item.id, { remotionVideoUrl: inner.url, status: "in_review", remotionProgress: 100 });
            setPipelineStatus((p) => ({ ...p, [item.id]: "✅ Commercial ready! Download it below." }));
            done = true;
          } else if (inner.type === "progress") {
            updateItem(item.id, { remotionProgress: Math.round(inner.progress * 100) });
            setPipelineStatus((p) => ({ ...p, [item.id]: `Remotion rendering... ${Math.round(inner.progress * 100)}%` }));
          }
        } catch (pollErr) {
          console.error("Remotion poll error:", pollErr);
        }
      }
      if (!done) throw new Error("Remotion render timed out.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPipelineStatus((p) => ({ ...p, [item.id]: "Remotion error: " + msg }));
      updateItem(item.id, { status: "in_review" });
    }
  };

  const handleDeleteItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
  };

  const handleAddItem = () => {
    const defaultAvatar = findPreferredAvatar(avatars);
    const defaultVoice = findPreferredVoice(voices);
    const newId = Math.max(0, ...items.map((i) => i.id)) + 1;
    const newItem: ContentItem = {
      id: newId,
      title: "New Content",
      platform: "Twitter",
      date: new Date().toISOString().split("T")[0],
      status: "draft",
      avatar: defaultAvatar?.avatar_name || "",
      avatarId: defaultAvatar?.avatar_id || "",
      voice: defaultVoice?.name || "",
      voiceId: defaultVoice?.voice_id || "",
      script: "",
      videoUrl: null,
      heygenVideoId: null,
      generationProgress: 0,
      is_talking_photo: defaultAvatar?.is_talking_photo || false,
      format: "reel",
      formatWidth: 1080,
      formatHeight: 1920,
      remotionRenderId: null,
      remotionBucket: null,
      remotionProgress: 0,
      remotionVideoUrl: null,
    };
    setItems((prev) => [...prev, newItem]);
    setEditingItem(newItem);
  };

  const drafts = items.filter((i) => i.status === "draft" || i.status === "generating_script");
  const generating = items.filter((i) => i.status === "generating" || i.status === "rendering_remotion");
  const completed = items.filter((i) => i.status === "in_review" || i.status === "approved");

  // ─── Derived: Step 2 readiness ────────────────────────────────────────────
  const step2Blocked = (item: ContentItem) =>
    !item.script || avatarsLoading || !item.avatarId ||
    item.status === "generating" || item.status === "generating_script";

  const step2Label = (item: ContentItem) => {
    if (item.status === "generating") return `🎬 HeyGen rendering... ${item.generationProgress}%`;
    if (avatarsLoading) return "Step 2 — Waiting for avatars...";
    if (!item.script) return "Step 2 — Send to HeyGen (need script first)";
    return "Step 2 — Send to HeyGen";
  };

  // ─── Calendar view helpers ────────────────────────────────────────────────
  const calDays = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);
  const itemsByDate: Record<string, ContentItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a1a", color: "#fff", fontFamily: "system-ui" }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: "#111128", padding: "24px 16px", borderRight: "1px solid #222", flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Advantage Media</div>
        <div style={{ fontSize: 12, color: "#818cf8", marginBottom: 4 }}>Content Engine</div>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 32 }}>Claude + HeyGen + Remotion</div>

        <div style={{ marginBottom: 24, padding: "12px", background: "#1a1a3a", borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>{items.length} Total</span><span>{completed.length} Done</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{drafts.length} Drafts</span><span>{generating.length} Active</span>
          </div>
          {avatarsLoading && (
            <div style={{ marginTop: 8, color: "#818cf8", fontSize: 11 }}>
              ⏳ Loading avatars from HeyGen...
            </div>
          )}
          {!avatarsLoading && avatars.length > 0 && (
            <div style={{ marginTop: 8, color: "#10b981", fontSize: 11 }}>
              ✓ {avatars.length} avatars ready
            </div>
          )}
        </div>

        {[
          { id: "generator", label: "🎬 Video Generator" },
          { id: "calendar", label: "📅 Content Calendar" },
          { id: "review", label: "👁 Review Queue" },
          { id: "settings", label: "⚙️ Settings" },
        ].map((nav) => (
          <div key={nav.id}
            onClick={() => setView(nav.id)}
            style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: view === nav.id ? "#2a2a5a" : "transparent", color: view === nav.id ? "#fff" : "#888" }}>
            {nav.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>

        {/* ── VIDEO GENERATOR ── */}
        {view === "generator" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Video Generator</h1>
                <p style={{ color: "#888", margin: "4px 0 0" }}>3-step pipeline: Generate Script → HeyGen Avatar → Remotion Commercial</p>
              </div>
              <button onClick={handleAddItem} style={{ padding: "10px 20px", background: "#818cf8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                + Add Content
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "DRAFTS", count: drafts.length, color: "#f59e0b" },
                { label: "GENERATING", count: generating.length, color: "#3b82f6" },
                { label: "COMPLETED", count: completed.length, color: "#10b981" },
                { label: "TOTAL", count: items.length, color: "#818cf8" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#111128", borderRadius: 12, padding: 20, borderLeft: "3px solid " + s.color }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{s.count}</div>
                </div>
              ))}
            </div>

            {/* Items List */}
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => {
                const sc = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                return (
                  <div key={item.id}
                    style={{ background: "#111128", borderRadius: 12, padding: 20, cursor: "pointer", border: editingItem?.id === item.id ? "1px solid #818cf8" : "1px solid transparent" }}
                    onClick={() => setEditingItem(item)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: (PLATFORM_COLORS[item.platform] || "#666") + "22", color: PLATFORM_COLORS[item.platform] || "#666" }}>
                          {item.platform}
                        </span>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        <span style={{ fontSize: 12, color: "#666" }}>{item.date}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {(item.status === "generating" || item.status === "rendering_remotion") && (
                          <div style={{ width: 100, height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: item.generationProgress + "%", height: "100%", background: item.status === "rendering_remotion" ? "#f59e0b" : "#818cf8", borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                        )}
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, background: sc.bg, color: sc.text }}>
                          {item.status === "rendering_remotion" ? `Remotion ${item.remotionProgress}%` : sc.label}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                      </div>
                    </div>
                    {item.script && <div style={{ marginTop: 8, fontSize: 12, color: "#888", maxHeight: 40, overflow: "hidden" }}>{item.script.slice(0, 120)}...</div>}
                  </div>
                );
              })}
            </div>

            {/* Editing Panel */}
            {editingItem && (
              <div style={{ marginTop: 24, background: "#111128", borderRadius: 12, padding: 24, border: "1px solid #333" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Editing: {editingItem.title}</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Title</label>
                    <input value={editingItem.title} onChange={(e) => updateItem(editingItem.id, { title: e.target.value })}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Platform</label>
                    <select value={editingItem.platform} onChange={(e) => updateItem(editingItem.id, { platform: e.target.value })}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                      Scheduled Date
                    </label>
                    <input type="date" value={editingItem.date}
                      onChange={(e) => updateItem(editingItem.id, { date: e.target.value })}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Video Format</label>
                    <select value={editingItem.format}
                      onChange={(e) => {
                        const fmt = VIDEO_FORMATS.find((f) => f.id === e.target.value);
                        if (fmt) updateItem(editingItem.id, { format: fmt.id, formatWidth: fmt.width, formatHeight: fmt.height });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {VIDEO_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.width}×{f.height})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                      HeyGen Avatar {avatarsLoading && <span style={{ color: "#f59e0b" }}>⏳ loading...</span>}
                      {!avatarsLoading && avatars.length === 0 && <span style={{ color: "#ef4444" }}> — failed to load</span>}
                    </label>
                    <select value={editingItem.avatarId}
                      disabled={avatarsLoading}
                      onChange={(e) => {
                        const av = avatars.find((a) => a.avatar_id === e.target.value);
                        if (av) updateItem(editingItem.id, { avatarId: av.avatar_id, avatar: av.avatar_name, is_talking_photo: av.is_talking_photo });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: avatarsLoading ? "#666" : "#fff" }}>
                      {avatarsLoading
                        ? <option>Loading avatars...</option>
                        : avatars.slice(0, 200).map((a) => <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Voice</label>
                    <select value={editingItem.voiceId}
                      disabled={avatarsLoading}
                      onChange={(e) => {
                        const vc = voices.find((v) => v.voice_id === e.target.value);
                        if (vc) updateItem(editingItem.id, { voiceId: vc.voice_id, voice: vc.name });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: avatarsLoading ? "#666" : "#fff" }}>
                      {avatarsLoading
                        ? <option>Loading voices...</option>
                        : voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* Script */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Script</label>
                  <textarea value={editingItem.script}
                    onChange={(e) => updateItem(editingItem.id, { script: e.target.value })}
                    rows={6} placeholder="Click 'Step 1 — Generate Script' or type your own..."
                    style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", resize: "vertical", boxSizing: "border-box" }} />
                </div>

                {/* ── 3-step buttons ── */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Step 1 */}
                  <button onClick={() => handleGenerateScript(editingItem)}
                    disabled={editingItem.status === "generating_script"}
                    style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: editingItem.status === "generating_script" ? "not-allowed" : "pointer", fontWeight: 600, opacity: editingItem.status === "generating_script" ? 0.5 : 1 }}>
                    {editingItem.status === "generating_script" ? "✍️ Writing script..." : "Step 1 — Generate Script"}
                  </button>

                  {/* Step 2 */}
                  <button onClick={() => handleGenerateVideo(editingItem)}
                    disabled={step2Blocked(editingItem)}
                    title={avatarsLoading ? "Wait for avatars to finish loading" : !editingItem.script ? "Generate a script first" : ""}
                    style={{ padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: step2Blocked(editingItem) ? "not-allowed" : "pointer", fontWeight: 600, opacity: step2Blocked(editingItem) ? 0.4 : 1 }}>
                    {step2Label(editingItem)}
                  </button>

                  {/* Step 3: only after HeyGen video exists */}
                  {editingItem.videoUrl && (
                    <button onClick={() => handleCreateRemotionVideo(editingItem)}
                      disabled={editingItem.status === "rendering_remotion"}
                      style={{ padding: "10px 20px", background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, cursor: editingItem.status === "rendering_remotion" ? "not-allowed" : "pointer", fontWeight: 700, opacity: editingItem.status === "rendering_remotion" ? 0.6 : 1 }}>
                      {editingItem.status === "rendering_remotion" ? `✨ Remotion... ${editingItem.remotionProgress}%` : "Step 3 — Add Remotion Animations"}
                    </button>
                  )}
                </div>

                {/* Status bar */}
                {pipelineStatus[editingItem.id] && (
                  <div style={{ marginTop: 12, padding: 12, background: /error|fail/i.test(pipelineStatus[editingItem.id]) ? "#7f1d1d" : "#1a1a3a", borderRadius: 8, fontSize: 13, color: /error|fail/i.test(pipelineStatus[editingItem.id]) ? "#fca5a5" : "#818cf8" }}>
                    {pipelineStatus[editingItem.id]}
                  </div>
                )}

                {/* Video previews */}
                <div style={{ display: "grid", gridTemplateColumns: editingItem.remotionVideoUrl ? "1fr 1fr" : "1fr", gap: 16, marginTop: 16 }}>
                  {editingItem.videoUrl && (
                    <div>
                      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>HeyGen Avatar Video (preview)</label>
                      <video src={editingItem.videoUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 8, background: "#000" }} />
                    </div>
                  )}
                  {editingItem.remotionVideoUrl && (
                    <div>
                      <label style={{ fontSize: 12, color: "#f59e0b", display: "block", marginBottom: 4, fontWeight: 700 }}>✅ Remotion Commercial (Final)</label>
                      <video src={editingItem.remotionVideoUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 8, background: "#000", border: "2px solid #f59e0b" }} />
                      <a href={editingItem.remotionVideoUrl} download="amp-commercial.mp4"
                        style={{ display: "inline-block", marginTop: 8, padding: "6px 16px", background: "#f59e0b", color: "#000", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                        ⬇ Download Commercial
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CONTENT CALENDAR ── */}
        {view === "calendar" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Content Calendar</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => {
                  const d = new Date(calYear, calMonth - 1, 1);
                  setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
                }} style={{ padding: "8px 16px", background: "#1a1a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>‹</button>
                <span style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: "center" }}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </span>
                <button onClick={() => {
                  const d = new Date(calYear, calMonth + 1, 1);
                  setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
                }} style={{ padding: "8px 16px", background: "#1a1a3a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>›</button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 12, color: "#666", fontWeight: 600, padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {/* Empty cells before first day */}
              {Array.from({ length: calFirstDay }).map((_, i) => (
                <div key={"empty-" + i} style={{ minHeight: 90, background: "#0d0d1f", borderRadius: 8 }} />
              ))}
              {/* Day cells */}
              {Array.from({ length: calDays }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayItems = itemsByDate[dateStr] || [];
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <div key={day} style={{ minHeight: 90, background: "#111128", borderRadius: 8, padding: 8, border: isToday ? "1px solid #818cf8" : "1px solid transparent" }}>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "#818cf8" : "#666", marginBottom: 4 }}>{day}</div>
                    {dayItems.map((item) => {
                      const sc = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
                      return (
                        <div key={item.id}
                          onClick={() => { setEditingItem(item); setView("generator"); }}
                          title={item.title}
                          style={{ marginBottom: 3, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: (PLATFORM_COLORS[item.platform] || "#666") + "33", color: PLATFORM_COLORS[item.platform] || "#888", cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", borderLeft: "2px solid " + sc.text }}>
                          {item.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
              {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
                <div key={platform} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  {platform}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── REVIEW QUEUE ── */}
        {view === "review" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Review Queue</h1>
            {completed.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
                <div style={{ fontSize: 18, marginBottom: 8 }}>No videos ready for review yet</div>
                <div>Generate videos in the Video Generator tab first</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
                {completed.map((item) => (
                  <div key={item.id} style={{ background: "#111128", borderRadius: 12, overflow: "hidden" }}>
                    {(item.remotionVideoUrl || item.videoUrl) && (
                      <video src={item.remotionVideoUrl || item.videoUrl || ""} controls style={{ width: "100%", height: 200, objectFit: "cover" }} />
                    )}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, background: (PLATFORM_COLORS[item.platform] || "#666") + "22", color: PLATFORM_COLORS[item.platform] || "#666" }}>{item.platform}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                        {item.avatar} · {item.date}
                        {item.remotionVideoUrl && <span style={{ marginLeft: 8, color: "#f59e0b", fontWeight: 700 }}>+ Remotion ✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => updateItem(item.id, { status: "approved" })}
                          style={{ flex: 1, padding: 8, background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                          ✓ Approve
                        </button>
                        {item.videoUrl && !item.remotionVideoUrl && (
                          <button onClick={() => handleCreateRemotionVideo(item)}
                            style={{ flex: 1, padding: 8, background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                            Add Remotion
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS ── */}
        {view === "settings" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
            <div style={{ background: "#111128", borderRadius: 12, padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>API Status</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { name: "Claude API", status: "Connected" },
                  { name: "HeyGen API", status: avatarsLoading ? "Loading..." : avatars.length > 0 ? `Connected — ${avatars.length} avatars, ${voices.length} voices` : "Failed to connect" },
                  { name: "Remotion Lambda", status: "Active" },
                ].map((s) => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                    <span>{s.name}</span>
                    <span style={{ color: s.status.startsWith("Failed") ? "#ef4444" : s.status === "Loading..." ? "#f59e0b" : "#10b981" }}>{s.status}</span>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: 24 }}>Default Avatars</h3>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                {PREFERRED_AVATARS.map((pref) => {
                  const match = avatars.find((a) => a.avatar_name.toLowerCase().includes(pref.keyword.toLowerCase()));
                  return (
                    <div key={pref.keyword} style={{ padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{pref.name}</div>
                      <div style={{ fontSize: 12, color: match ? "#10b981" : "#ef4444" }}>
                        {match ? "✓ Found: " + match.avatar_name : "✗ Not found in HeyGen account"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 style={{ marginTop: 24 }}>Default Voice</h3>
              <div style={{ padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Voice ID: {PREFERRED_VOICE_ID}</div>
                <div style={{ fontSize: 12, color: !avatarsLoading && findPreferredVoice(voices) ? "#10b981" : avatarsLoading ? "#f59e0b" : "#ef4444" }}>
                  {avatarsLoading ? "Checking..." : findPreferredVoice(voices) ? "✓ Found: " + findPreferredVoice(voices)?.name : "✗ Not found in HeyGen account"}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
