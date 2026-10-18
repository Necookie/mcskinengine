"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { LandingPage, LoadingScreen } from "../components/LandingPage";
import ImageDropzone from "../components/ImageDropzone";
import dynamic from "next/dynamic";
import { 
  Sparkles, LogOut, Maximize,
  Paintbrush, Download, AlertTriangle, CheckCircle, Home, X, Loader2, Copy, Check
} from "lucide-react";

// Dynamically import SkinViewer since it depends on browser canvas APIs (WebGL, ThreeJS)
const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#555558]">Loading mesh...</div> }
);

const PROMPT_TEMPLATES = [
  { label: "Cyberpunk", prompt: "Neon accented cyber jacket with glowing cyan circuit patterns, dark cargo pants, high-top combat sneakers" },
  { label: "Paladin", prompt: "Gilded steel plate armor, deep royal navy cape with gold embroidery, chainmail underlay" },
  { label: "Astronaut", prompt: "Pressurized white astronaut suit with mission patch badge, copper reflective visor, survival utility belt" },
  { label: "Streetwear", prompt: "Oversized pastel pink hoodie with aesthetic barcode graphic, distressed denim jeans, skate shoes" },
  { label: "Ranger", prompt: "Weathered brown leather duster coat, emerald wool vest, brass compass pouch, sturdy trail boots" }
] as const;

interface GenerationHistoryItem {
  id: string;
  prompt: string;
  model: string;
  timestamp: string;
}

export default function AiStudioPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const {
    geminiPrompt,
    hasGeminiKey,
    hasOpenaiKey,
    isGenerating,
    role,
    ethnicity,
    modelType,
    setGeminiPrompt,
    setIsGenerating,
    setSkinArray,
    setRole,
    setEthnicity,
    setModelType,
    fetchSkin,
    fetchSettings,
    saveSettings,
    saveSkin,
    skinArray,
    pushUndo
  } = useSkinStore();

  const [refImage, setRefImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [viewer, setViewer] = useState<any>(null);
  const [showAiSetup, setShowAiSetup] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [promptHistory, setPromptHistory] = useState<GenerationHistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mcskinengine_prompt_history");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Initialize data on sign-in
  useEffect(() => {
    if (isSignedIn) {
      fetchSkin();
      fetchSettings();
    }
  // Intentionally run once on sign-in status change;
  // fetchSkin/fetchSettings are stable Zustand store refs that never change identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Initialize Setup Guide state depending on keys
  useEffect(() => {
    setShowAiSetup(!hasGeminiKey && !hasOpenaiKey);
  }, [hasGeminiKey, hasOpenaiKey]);

  // Sync texture changes to the 3D viewer using loadSkin
  useEffect(() => {
    if (!viewer || !skinArray) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 64;
    tempCanvas.height = 64;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(64, 64);
      imgData.data.set(skinArray);
      ctx.putImageData(imgData, 0, 0);
      viewer.loadSkin(tempCanvas.toDataURL(), modelType === "alex" ? "slim" : "classic");
    }
  }, [viewer, skinArray, modelType]);

  const handleGenerateSkin = async () => {
    const isOpenAI = selectedModel.startsWith("gpt");
    const hasKey = isOpenAI ? hasOpenaiKey : hasGeminiKey;
    if (!hasKey) {
      setErrorMsg(`Please configure your ${isOpenAI ? "OpenAI" : "Gemini"} API Key in Settings first.`);
      setShowAiSetup(true);
      return;
    }
    
    setErrorMsg("");
    setSuccessMsg("");
    setIsGenerating(true);
    pushUndo(skinArray);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: geminiPrompt,
          image: refImage,
          demographic: ethnicity,
          isAlex: modelType === "alex",
          provider: isOpenAI ? "openai" : "gemini",
          model: selectedModel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      // Convert generated base64 skin back to array and load it
      const { base64ToSkin } = await import("@/lib/skinEngine");
      setSkinArray(base64ToSkin(data.skin));
      
      // Update store traits
      if (data.apparel) {
        setRole(data.apparel.stencilKey);
        if (data.apparel.enhancedPrompt) {
          setEnhancedPrompt(data.apparel.enhancedPrompt);
        } else {
          setEnhancedPrompt("");
        }
      } else {
        setEnhancedPrompt("");
      }

      setSuccessMsg(`Skin generated successfully!`);
      const newHistoryItem: GenerationHistoryItem = {
        id: Date.now().toString(),
        prompt: geminiPrompt,
        model: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setPromptHistory((prev) => {
        const updated = [newHistoryItem, ...prev.filter((p) => p.prompt !== geminiPrompt)].slice(0, 5);
        try {
          localStorage.setItem("mcskinengine_prompt_history", JSON.stringify(updated));
        } catch {
          // ignore localStorage write errors
        }
        return updated;
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred during generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    await saveSettings(
      geminiKeyInput || undefined,
      openaiKeyInput || undefined
    );
    setSuccessMsg("API keys saved securely!");
    setGeminiKeyInput("");
    setOpenaiKeyInput("");
    setSettingsOpen(false);
    setShowAiSetup(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleOpenInEditor = async () => {
    if (skinArray) {
      await saveSkin(skinArray);
    }
    router.push("/editor");
  };

  const handleCopyEnhancedPrompt = async () => {
    if (!enhancedPrompt) return;
    try {
      await navigator.clipboard.writeText(enhancedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // fallback
    }
  };

  const downloadSkin = () => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 64;
    tempCanvas.height = 64;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(64, 64);
      imgData.data.set(skinArray);
      ctx.putImageData(imgData, 0, 0);
      
      const link = document.createElement("a");
      link.download = `skin_${modelType}_${role}.png`;
      link.href = tempCanvas.toDataURL("image/png");
      link.click();
    }
  };

  if (isSignedIn === undefined) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-layout-wrap">
        {/* SIDEBAR */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-brand">MCSE</div>
            <span className="text-grid-tag" style={{ color: "#555558", fontSize: "9px" }}>
              AI Studio
            </span>
          </div>

          <nav className="sidebar-nav">
            <a href="/" className="sidebar-link">
              <Home size={14} strokeWidth={2} />
              <span>Dashboard</span>
            </a>
            <a href="/editor" className="sidebar-link">
              <Paintbrush size={14} strokeWidth={2} />
              <span>3D Editor</span>
            </a>
            <a href="/ai-studio" className="sidebar-link active">
              <Sparkles size={14} strokeWidth={2} />
              <span>AI Studio</span>
            </a>
          </nav>

          <div className="sidebar-footer">
            <span className="text-grid-tag" style={{ fontSize: "9px", color: "#555558" }}>
              User: {user?.username || user?.firstName || "Steve"}
            </span>
            <SignOutButton>
              <button
                className="voxel-btn"
                style={{ width: "100%", padding: "8px 0", backgroundColor: "#fce8e6", color: "#c53030", borderRadius: "2px" }}
              >
                <LogOut size={12} strokeWidth={2} />
                <span>Log Out</span>
              </button>
            </SignOutButton>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="dashboard-main-content">
          {/* Welcome/Header Banner */}
          <div className="dashboard-welcome-banner">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="text-grid-tag" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>
                  Cognitive Studio
                </div>
                <h1 className="text-display-lg" style={{ textTransform: "uppercase", margin: 0, lineHeight: 1.0 }}>
                  AI Skin Generator
                </h1>
                <div style={{ marginTop: "8px" }}>
                  <span className="text-grid-tag" style={{ color: "#555558" }}>
                    Active Mesh: {modelType} | Arm Size: {modelType === "steve" ? "4px" : "3px"} | Stencil Base: {role}
                  </span>
                </div>
              </div>
              <a href="/" className="voxel-btn" style={{ textDecoration: "none" }}>
                <Home size={14} strokeWidth={2} />
                <span>Back to Dashboard</span>
              </a>
            </div>
          </div>

          {/* Bento Columns */}
          <div className="dashboard-grid-layout">
            {/* Column 1: AI Prompt Input Bento Card */}
            <div className="dashboard-action-card" style={{ flexGrow: 1, backgroundColor: "#ffffff" }}>
              {showAiSetup ? (
                /* Setup Guide Onboarding */
                <div className="ai-setup-guide">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-accent-ai)" }}>
                    <Sparkles size={14} strokeWidth={2} />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">AI Setup Guide</span>
                  </div>
                  
                  <p style={{ fontSize: "10px", lineHeight: "1.5", color: "#555558", fontFamily: "var(--font-sans)" }}>
                    Enter your Gemini API key to enable AI skin generation.
                  </p>

                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="voxel-btn text-[10px]"
                    style={{ justifyContent: "center", width: "100%", textDecoration: "none", backgroundColor: "var(--color-surface-soft)", color: "var(--color-primary)" }}
                  >
                    Get Gemini API Key (Free) ↗
                  </a>

                  <div className="form-group" style={{ marginTop: "4px" }}>
                    <label className="form-group-label">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="voxel-input"
                    />
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={!geminiKeyInput}
                    className="voxel-btn btn-accent"
                    style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
                  >
                    Save Key
                  </button>

                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      onClick={() => setShowAiSetup(false)}
                      className="voxel-btn"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      ← Skip
                    </button>
                    <a
                      href="/"
                      className="voxel-btn"
                      style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
                    >
                      ← Exit
                    </a>
                  </div>
                </div>
              ) : (
                /* Prompts generator interface */
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p className="ai-section-desc" style={{ marginBottom: 0 }}>
                      Describe apparel features to generate your skin.
                    </p>
                    <button
                      onClick={() => setShowAiSetup(true)}
                      className="text-[9px] text-[#ff2a85] hover:underline font-mono uppercase font-bold"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      Keys
                    </button>
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <label className="form-group-label" style={{ margin: 0 }}>AI Engine Model</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span className={`provider-status-badge ${hasGeminiKey ? "connected" : "missing"}`}>
                          Gemini {hasGeminiKey ? "✓" : "!"}
                        </span>
                        <span className={`provider-status-badge ${hasOpenaiKey ? "connected" : "missing"}`}>
                          OpenAI {hasOpenaiKey ? "✓" : "!"}
                        </span>
                      </div>
                    </div>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="voxel-input font-mono text-[10px]"
                      style={{ padding: "6px", width: "100%", textTransform: "none", borderRadius: "2px" }}
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>

                  {/* Demographic & Model Archetype Grid */}
                  <div className="archetype-selector-row">
                    <div className="archetype-group">
                      <label className="form-group-label">Mesh Silhouette</label>
                      <div className="archetype-pills">
                        <button
                          type="button"
                          onClick={() => setModelType("steve")}
                          className={`archetype-pill ${modelType === "steve" ? "active" : ""}`}
                        >
                          Steve (4px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModelType("alex")}
                          className={`archetype-pill ${modelType === "alex" ? "active" : ""}`}
                        >
                          Alex (3px)
                        </button>
                      </div>
                    </div>

                    <div className="archetype-group">
                      <label className="form-group-label">Demographic Base</label>
                      <div className="archetype-pills">
                        {(["East Asian", "South Asian", "Caucasian", "Black"] as const).map((eth) => (
                          <button
                            key={eth}
                            type="button"
                            onClick={() => setEthnicity(eth)}
                            className={`archetype-pill ${ethnicity === eth ? "active" : ""}`}
                          >
                            {eth}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="form-group-label" style={{ margin: 0 }}>Prompt Description</label>
                      <span className="text-grid-tag" style={{ color: "#8a8a93", fontSize: "9px" }}>Quick Presets</span>
                    </div>

                    <div className="prompt-template-pills">
                      {PROMPT_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.label}
                          type="button"
                          onClick={() => setGeminiPrompt(tmpl.prompt)}
                          className={`prompt-template-pill ${geminiPrompt === tmpl.prompt ? "active" : ""}`}
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={geminiPrompt}
                      onChange={(e) => setGeminiPrompt(e.target.value)}
                      placeholder="e.g. Blue hoodie with pink stripes, black jeans, white sneakers"
                      rows={3}
                      className="voxel-textarea"
                    />

                    {promptHistory.length > 0 && (
                      <div className="prompt-history-tray">
                        <div className="prompt-history-header">
                          <span className="prompt-history-label">Recent History</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPromptHistory([]);
                              try {
                                localStorage.removeItem("mcskinengine_prompt_history");
                              } catch {}
                            }}
                            className="prompt-history-clear-btn"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="prompt-history-list">
                          {promptHistory.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setGeminiPrompt(item.prompt)}
                              className="prompt-history-item"
                              title={`Restore prompt: ${item.prompt}`}
                            >
                              <span className="prompt-history-text">{item.prompt}</span>
                              <span className="prompt-history-time">{item.timestamp}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-group-label">Reference Image (Optional)</label>
                    {refImage ? (
                      <div className="reference-image-preview-card">
                        <img
                          src={refImage}
                          alt="Reference preview"
                          className="reference-image-thumb"
                        />
                        <div className="reference-image-info">
                          <span className="reference-image-status">Image Attached</span>
                          <span className="reference-image-hint">Visual guide for generation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRefImage(null)}
                          className="voxel-tool-btn"
                          title="Remove reference image"
                        >
                          <X size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <ImageDropzone onImageLoaded={(base64) => setRefImage(base64)} />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateSkin}
                    disabled={isGenerating || !geminiPrompt.trim()}
                    className={`voxel-btn btn-accent ${isGenerating ? "voxel-btn-loading" : ""}`}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={13} className="spin-icon" />
                        <span>Synthesizing Skin Texture...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Generate Skin</span>
                      </>
                    )}
                  </button>

                  {enhancedPrompt && (
                    <div className="enhanced-prompt-card">
                      <div className="enhanced-prompt-header">
                        <div className="enhanced-prompt-badge">
                          <Sparkles size={10} />
                          <span>Enhanced Stencil Prompt</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyEnhancedPrompt}
                          className="enhanced-prompt-copy-btn"
                          title="Copy enhanced prompt"
                        >
                          {copiedPrompt ? <Check size={10} /> : <Copy size={10} />}
                          <span>{copiedPrompt ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="enhanced-prompt-text">{enhancedPrompt}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Column 2: 3D Preview Panel Bento Card */}
            <div className="dashboard-preview-panel">
              <div className="dashboard-preview-header" style={{ justifyContent: "space-between" }}>
                <span className="font-bold">Active Avatar</span>
                <button
                  type="button"
                  onClick={downloadSkin}
                  className="voxel-tool-btn"
                  title="Quick export skin PNG"
                  style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                >
                  <Download size={11} strokeWidth={2} />
                  <span>Export</span>
                </button>
              </div>
              <div className="dashboard-preview-body">
                <div className="dashboard-avatar-preview-box">
                  <ReactSkinview3d
                    skinUrl=""
                    height={220}
                    width={160}
                    onReady={(viewerInstance: any) => {
                      if (viewerInstance.skinTexture) {
                        viewerInstance.skinTexture.minFilter = 1003;
                        viewerInstance.skinTexture.magFilter = 1003;
                        viewerInstance.skinTexture.needsUpdate = true;
                      }

                      viewerInstance.background = null;
                      viewerInstance.autoRotate = true;
                      viewerInstance.autoRotateSpeed = 0.6;

                      import("skinview3d").then((sv) => {
                        viewerInstance.animations.add(sv.IdleAnimation);
                        sv.createOrbitControls(viewerInstance);
                      });

                      setViewer(viewerInstance);
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <button
                    onClick={downloadSkin}
                    className="voxel-btn"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}
                  >
                    <Download size={13} strokeWidth={2} />
                    <span>Download PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenInEditor}
                    className="voxel-btn btn-accent"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}
                  >
                    <Paintbrush size={12} strokeWidth={2} />
                    <span>Open in 3D Editor</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* API settings popup status alerts */}
      {(errorMsg || successMsg) && (
        <div className={`alert-overlay ${errorMsg ? "alert-overlay-error" : "alert-overlay-success"}`} style={{ borderRadius: "2px" }}>
          {errorMsg ? <AlertTriangle size={13} strokeWidth={2} /> : <CheckCircle size={13} strokeWidth={2} />}
          <span style={{ flexGrow: 1 }}>{errorMsg || successMsg}</span>
          <button 
            onClick={() => { setErrorMsg(""); setSuccessMsg(""); }}
            style={{ background: "none", border: "none", fontWeight: "bold", cursor: "pointer", fontSize: "12px", color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
