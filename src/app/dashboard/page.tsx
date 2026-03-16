"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  generateScript,
  listHeyGenAvatars,
  listHeyGenVoices,
  generateHeyGenVideo,
  checkHeyGenVideoStatus,
} from "@/lib/content-engine-api";

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
};

type HeyGenAvatar = {
  avatar_id: string;
  avatar_name: string;
  is_talking_photo: boolean;
  format: string;
  formatWidth: number;
  formatHeight: number;
};

type HeyGenVoice = {
  voice_id: string;
  name: string;
};

const PLATFORMS = ["Twitter", "LinkedIn", "Facebook"];
const PLATFORM_COLORS: Record<string, string> = {
  Twitter: "#1DA1F2",
  LinkedIn: "#0A66C2",
  Facebook: "#1877F2",
};

const VIDEO_FORMATS = [
  { id: "reel", label: "Reel / Short (9:16)", width: 1080, height: 1920 },
  { id: "square", label: "Square (1:1)", width: 1080, height: 1080 },
  { id: "wide", label: "Widescreen (16:9)", width: 1920, height: 1080 },
  { id: "story", label: "Story (9:16 Full)", width: 1080, height: 1920 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState("generator");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [pollingIntervals, setPollingIntervals] = useState<Record<number, NodeJS.Timeout>>({});
  const [pipelineStatus, setPipelineStatus] = useState<Record<number, string>>({});

  const runFullPipeline = async (item: ContentItem) => {
    if (!item.title) { alert("Add a title first"); return; }
    try {
      // Step 1: Generate Script
      setPipelineStatus(p => ({ ...p, [item.id]: "Writing script with Claude..." }));
      const scriptRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "script", title: item.title, platform: item.platform, avatarName: item.avatar, voiceName: item.voice }),
      });
      const scriptData = await scriptRes.json();
      if (scriptData.error) throw new Error(scriptData.error);
      updateItem(item.id, { script: scriptData.script, status: "generating" });

      // Step 2: Submit to HeyGen
      setPipelineStatus(p => ({ ...p, [item.id]: "Generating avatar video with HeyGen..." }));
      const heygenRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "heygen", script: scriptData.script, avatarId: item.avatarId, voiceId: item.voiceId, isTalkingPhoto: item.is_talking_photo, width: item.formatWidth, height: item.formatHeight }),
      });
      const heygenData = await heygenRes.json();
      if (heygenData.error) throw new Error(heygenData.error);
      updateItem(item.id, { heygenVideoId: heygenData.videoId });

      // Step 3: Poll until done
      setPipelineStatus(p => ({ ...p, [item.id]: "Waiting for HeyGen render (2-10 min)..." }));
      const pollRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "poll", videoId: heygenData.videoId }),
      });
      const pollData = await pollRes.json();
      if (pollData.error) throw new Error(pollData.error);
      updateItem(item.id, { videoUrl: pollData.videoUrl, status: "in_review", generationProgress: 100 });

      setPipelineStatus(p => ({ ...p, [item.id]: "Pipeline complete! Video ready for review." }));
    } catch (e: any) {
      setPipelineStatus(p => ({ ...p, [item.id]: "Error: " + e.message }));
      updateItem(item.id, { status: "draft" });
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [avs, vcs] = await Promise.all([listHeyGenAvatars(), listHeyGenVoices()]);
        setAvatars(avs);
        setVoices(vcs);
        const mockItems: ContentItem[] = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          title: ["5 AI Marketing Trends", "Social Media ROI", "Brand Voice Guide", "Video Content Tips", "Audience Growth"][i],
          platform: PLATFORMS[i % 3],
          date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
          status: "draft",
          avatar: avs[0]?.avatar_name || "Default",
          avatarId: avs[0]?.avatar_id || "",
          voice: vcs[0]?.name || "Default",
          voiceId: vcs[0]?.voice_id || "",
          script: "",
          videoUrl: null,
          heygenVideoId: null,
          generationProgress: 0,
          is_talking_photo: avs[0]?.is_talking_photo || false,
          format: "reel",
          formatWidth: 1080,
          formatHeight: 1920,
        }));
        setItems(mockItems);
      } catch (e) {
        console.error("Failed to load HeyGen data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const updateItem = useCallback((id: number, updates: Partial<ContentItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    setEditingItem(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, []);

  const handleGenerateScript = async (item: ContentItem) => {
    updateItem(item.id, { status: "generating_script" });
    try {
      const script = await generateScript({
        title: item.title,
        platform: item.platform,
        avatarName: item.avatar,
        voiceName: item.voice,
      });
      updateItem(item.id, { script, status: "draft" });
    } catch (e: any) {
      alert("Script error: " + e.message);
      updateItem(item.id, { status: "draft" });
    }
  };

  const handleGenerateVideo = async (item: ContentItem) => {
    if (!item.script) { alert("Generate a script first!"); return; }
    updateItem(item.id, { status: "generating", generationProgress: 0 });
    try {
      const videoId = await generateHeyGenVideo({
        script: item.script,
        avatarId: item.avatarId,
        voiceId: item.voiceId,
      });
      updateItem(item.id, { heygenVideoId: videoId });
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 60) { clearInterval(interval); updateItem(item.id, { status: "draft" }); return; }
        try {
          const status = await checkHeyGenVideoStatus(videoId);
          updateItem(item.id, { generationProgress: Math.min(95, attempts * 3) });
          if (status.status === "completed") {
            clearInterval(interval);
            updateItem(item.id, { status: "in_review", generationProgress: 100, videoUrl: status.videoUrl });
          } else if (status.status === "failed") {
            clearInterval(interval);
            updateItem(item.id, { status: "draft", generationProgress: 0 });
            alert("Video generation failed");
          }
        } catch (e) { console.error("Polling error:", e); }
      }, 10000);
      setPollingIntervals(prev => ({ ...prev, [item.id]: interval }));
    } catch (e: any) {
      alert("Video error: " + e.message);
      updateItem(item.id, { status: "draft" });
    }
  };

  const handleCreateRemotionVideo = (item: ContentItem) => {
    if (!item.videoUrl) { alert("Generate a HeyGen video first!"); return; }
    const prompt = "Create a 30-second TV commercial for \"" + item.title + "\". Include the HeyGen avatar video from this URL: " + item.videoUrl + ". Add a bold ADVANTAGE MEDIA intro, animated text overlays with key points, smooth transitions between scenes, and a call-to-action ending. Platform: " + item.platform + ".";
    const params = new URLSearchParams({ prompt, model: "gpt-5.2-low" });
    router.push("/generate?" + params.toString());
  };

  const handleDeleteItem = (id: number) => {
    if (pollingIntervals[id]) clearInterval(pollingIntervals[id]);
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
  };

  const handleAddItem = () => {
    const newId = Math.max(0, ...items.map(i => i.id)) + 1;
    const newItem: ContentItem = {
      id: newId, title: "New Content", platform: "Twitter",
      date: new Date().toISOString().split("T")[0], status: "draft",
      avatar: avatars[0]?.avatar_name || "", avatarId: avatars[0]?.avatar_id || "",
      voice: voices[0]?.name || "", voiceId: voices[0]?.voice_id || "",
      script: "", videoUrl: null, heygenVideoId: null, generationProgress: 0,
      is_talking_photo: avatars[0]?.is_talking_photo || false,
      format: "reel", formatWidth: 1080, formatHeight: 1920,
    };
    setItems(prev => [...prev, newItem]);
    setEditingItem(newItem);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a1a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>Loading Content Engine...</div>
          <div style={{ color: "#888" }}>Connecting to HeyGen API</div>
        </div>
      </div>
    );
  }

  const drafts = items.filter(i => i.status === "draft" || i.status === "generating_script");
  const generating = items.filter(i => i.status === "generating");
  const completed = items.filter(i => i.status === "in_review" || i.status === "approved");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a1a", color: "#fff", fontFamily: "system-ui" }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: "#111128", padding: "24px 16px", borderRight: "1px solid #222" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Advantage Media</div>
        <div style={{ fontSize: 12, color: "#818cf8", marginBottom: 4 }}>Content Engine</div>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 32 }}>Remotion + HeyGen + Claude</div>

        <div style={{ marginBottom: 24, padding: "12px", background: "#1a1a3a", borderRadius: 8, fontSize: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>{items.length} Total</span><span>{completed.length} Done</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{drafts.length} Drafts</span><span>{generating.length} Active</span>
          </div>
        </div>

        {[
          { id: "generator", label: "Video Generator" },
          { id: "review", label: "Review Queue" },
          { id: "remotion", label: "Remotion Studio" },
          { id: "settings", label: "Settings" },
        ].map(nav => (
          <div key={nav.id}
            onClick={() => nav.id === "remotion" ? router.push("/") : setView(nav.id)}
            style={{
              padding: "10px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
              background: view === nav.id ? "#2a2a5a" : "transparent",
              color: view === nav.id ? "#fff" : "#888",
            }}>
            {nav.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {view === "generator" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Video Generator</h1>
                <p style={{ color: "#888", margin: "4px 0 0" }}>Pipeline: Claude Script → HeyGen Avatar → Remotion Composition</p>
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
              ].map(s => (
                <div key={s.label} style={{ background: "#111128", borderRadius: 12, padding: 20, borderLeft: "3px solid " + s.color }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{s.count}</div>
                </div>
              ))}
            </div>

            {/* Items List */}
            <div style={{ display: "grid", gap: 12 }}>
              {items.map(item => (
                <div key={item.id} style={{ background: "#111128", borderRadius: 12, padding: 20, cursor: "pointer", border: editingItem?.id === item.id ? "1px solid #818cf8" : "1px solid transparent" }}
                  onClick={() => setEditingItem(item)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: PLATFORM_COLORS[item.platform] + "22", color: PLATFORM_COLORS[item.platform] }}>
                        {item.platform}
                      </span>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{item.avatar}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.status === "generating" && (
                        <div style={{ width: 100, height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: item.generationProgress + "%", height: "100%", background: "#818cf8", borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                      )}
                      <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11,
                        background: item.status === "draft" ? "#333" : item.status === "generating" || item.status === "generating_script" ? "#2563eb33" : "#10b98133",
                        color: item.status === "draft" ? "#888" : item.status === "generating" || item.status === "generating_script" ? "#60a5fa" : "#34d399"
                      }}>
                        {item.status === "generating_script" ? "Writing script..." : item.status}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>x</button>
                    </div>
                  </div>
                  {item.script && <div style={{ marginTop: 8, fontSize: 12, color: "#888", maxHeight: 40, overflow: "hidden" }}>{item.script.slice(0, 120)}...</div>}
                </div>
              ))}
            </div>

            {/* Editing Panel */}
            {editingItem && (
              <div style={{ marginTop: 24, background: "#111128", borderRadius: 12, padding: 24, border: "1px solid #333" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Editing: {editingItem.title}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Title</label>
                    <input value={editingItem.title} onChange={e => { const v = e.target.value; updateItem(editingItem.id, { title: v }); }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Platform</label>
                    <select value={editingItem.platform} onChange={e => updateItem(editingItem.id, { platform: e.target.value })}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>HeyGen Avatar</label>
                    <select value={editingItem.avatarId}
                      onChange={e => {
                        const av = avatars.find(a => a.avatar_id === e.target.value);
                        if (av) updateItem(editingItem.id, { avatarId: av.avatar_id, avatar: av.avatar_name, is_talking_photo: av.is_talking_photo });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {avatars.slice(0, 200).map(a => <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Voice</label>
                    <select value={editingItem.voiceId}
                      onChange={e => {
                        const vc = voices.find(v => v.voice_id === e.target.value);
                        if (vc) updateItem(editingItem.id, { voiceId: vc.voice_id, voice: vc.name });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Video Format</label>
                    <select value={editingItem.format}
                      onChange={e => {
                        const fmt = VIDEO_FORMATS.find(f => f.id === e.target.value);
                        if (fmt) updateItem(editingItem.id, { format: fmt.id, formatWidth: fmt.width, formatHeight: fmt.height });
                      }}
                      style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
                      {VIDEO_FORMATS.map(f => <option key={f.id} value={f.id}>{f.label} ({f.width}x{f.height})</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Script</label>
                  <textarea value={editingItem.script}
                    onChange={e => updateItem(editingItem.id, { script: e.target.value })}
                    rows={6} placeholder="Click Generate Script or type your own..."
                    style={{ width: "100%", padding: 8, background: "#0a0a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => handleGenerateScript(editingItem)}
                    disabled={editingItem.status === "generating_script"}
                    style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, opacity: editingItem.status === "generating_script" ? 0.5 : 1 }}>
                    {editingItem.status === "generating_script" ? "Writing..." : "Generate Script with Claude"}
                  </button>
                  <button onClick={() => handleGenerateVideo(editingItem)}
                    disabled={!editingItem.script || editingItem.status === "generating"}
                    style={{ padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, opacity: !editingItem.script || editingItem.status === "generating" ? 0.5 : 1 }}>
                    {editingItem.status === "generating" ? "Generating... " + editingItem.generationProgress + "%" : "Generate Video with HeyGen"}
                  </button>
                  <button onClick={() => runFullPipeline(editingItem)}
                    disabled={pipelineStatus[editingItem.id]?.includes("...")}
                    style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, opacity: pipelineStatus[editingItem.id]?.includes("...") ? 0.6 : 1 }}>
                    {pipelineStatus[editingItem.id]?.includes("...") ? pipelineStatus[editingItem.id] : "Run Full Pipeline"}
                  </button>
                  {editingItem.videoUrl && (
                    <button onClick={() => handleCreateRemotionVideo(editingItem)}
                      style={{ padding: "10px 20px", background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                      Create Full Commercial with Remotion
                    </button>
                  )}
                </div>
                {pipelineStatus[editingItem.id] && (
                  <div style={{ marginTop: 12, padding: 12, background: pipelineStatus[editingItem.id]?.includes("Error") ? "#7f1d1d" : "#1a1a3a", borderRadius: 8, fontSize: 13, color: pipelineStatus[editingItem.id]?.includes("Error") ? "#fca5a5" : "#818cf8" }}>
                    {pipelineStatus[editingItem.id]}
                  </div>
                )}
                {editingItem.videoUrl && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>HeyGen Avatar Video Preview</label>
                    <video src={editingItem.videoUrl} controls style={{ width: "100%", maxHeight: 300, borderRadius: 8, background: "#000" }} />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view === "review" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Review Queue</h1>
            {completed.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>No videos ready for review</div>
                <div>Generate videos in the Video Generator tab first</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350, 1fr))", gap: 16 }}>
                {completed.map(item => (
                  <div key={item.id} style={{ background: "#111128", borderRadius: 12, overflow: "hidden" }}>
                    {item.videoUrl && <video src={item.videoUrl} controls style={{ width: "100%", height: 200, objectFit: "cover" }} />}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, background: PLATFORM_COLORS[item.platform] + "22", color: PLATFORM_COLORS[item.platform] }}>{item.platform}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{item.avatar} | {item.date}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => updateItem(item.id, { status: "approved" })}
                          style={{ flex: 1, padding: 8, background: "#10b981", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleCreateRemotionVideo(item)}
                          style={{ flex: 1, padding: 8, background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Enhance with Remotion</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === "settings" && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Settings</h1>
            <div style={{ background: "#111128", borderRadius: 12, padding: 24 }}>
              <h3 style={{ marginTop: 0 }}>API Status</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                  <span>Claude API</span><span style={{ color: "#10b981" }}>Connected</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                  <span>HeyGen API</span><span style={{ color: "#10b981" }}>Connected ({avatars.length} avatars, {voices.length} voices)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                  <span>Remotion Studio</span><span style={{ color: "#10b981" }}>Active</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: 12, background: "#0a0a1a", borderRadius: 8 }}>
                  <span>OpenAI (Remotion)</span><span style={{ color: "#10b981" }}>Connected</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}