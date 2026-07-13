"use client";

import React, { useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { motion } from "framer-motion";
import { LandingPage, LoadingScreen } from "../components/LandingPage";
import ImageDropzone from "../components/ImageDropzone";
import dynamic from "next/dynamic";
import { 
  Sparkles, Settings, LogOut, Maximize, User, Key, Cpu,
  Paintbrush, Download, AlertTriangle, CheckCircle, ArrowRight, Home
} from "lucide-react";

// Dynamically import SkinViewer since it depends on browser canvas APIs (WebGL, ThreeJS)
const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#555558]">Loading mesh...</div> }
);

export default function AiStudioPage() {
  const { isSignedIn, user } = useUser();
  const {
    skinBase64,
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
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [viewer, setViewer] = useState<any>(null);
  const [showAiSetup, setShowAiSetup] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");

  // Initialize data on sign-in
  useEffect(() => {
    if (isSignedIn) {
      fetchSkin();
      fetchSettings();
    }
  }, [isSignedIn]);

  // Initialize Setup Guide state depending on keys
  useEffect(() => {
    setShowAiSetup(!hasGeminiKey && !hasOpenaiKey);
  }, [hasGeminiKey, hasOpenaiKey]);

  // Sync texture changes to the 3D viewer
  useEffect(() => {
    if (!viewer || !skinArray) return;
    const ctx = viewer.skinCanvas.getContext("2d");
    if (ctx) {
      const imgData = ctx.createImageData(64, 64);
      imgData.data.set(skinArray);
      ctx.putImageData(imgData, 0, 0);
      viewer.skinTexture.needsUpdate = true;
    }
  }, [viewer, skinArray]);

  // Synchronize model type (Steve vs Alex)
  useEffect(() => {
    if (viewer && skinArray) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 64;
      tempCanvas.height = 64;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        const imgData = ctx.createImageData(64, 64);
        imgData.data.set(skinArray);
        ctx.putImageData(imgData, 0, 0);
        viewer.loadSkin(tempCanvas.toDataURL(), { model: modelType === "alex" ? "slim" : "classic" });
      }
    }
  }, [viewer, modelType, skinArray]);

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
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during generation");
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
                style={{ width: "100%", padding: "8px 0", backgroundColor: "#fce8e6", color: "#c53030", borderRadius: "9999px" }}
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

          {/* Bento Columns */}
          <div className="dashboard-grid-layout">
            {/* Column 1: AI Prompt Input Bento Card */}
            <div className="dashboard-action-card" style={{ flexGrow: 1, backgroundColor: "#ffffff" }}>
              {showAiSetup ? (
                /* Setup Guide Onboarding */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                    <label className="form-group-label">AI Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="voxel-input font-mono text-[10px]"
                      style={{ padding: "6px", width: "100%", textTransform: "none", borderRadius: "8px" }}
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-group-label">Prompt</label>
                    <textarea
                      value={geminiPrompt}
                      onChange={(e) => setGeminiPrompt(e.target.value)}
                      placeholder="e.g. Blue hoodie with pink stripes, black jeans, white sneakers"
                      rows={3}
                      className="voxel-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-group-label">Reference Image (Optional)</label>
                    <ImageDropzone onImageLoaded={(base64) => setRefImage(base64)} />
                  </div>

                  <button
                    onClick={handleGenerateSkin}
                    disabled={isGenerating || !geminiPrompt}
                    className="voxel-btn btn-accent"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {isGenerating ? "Generating..." : "Generate Skin"}
                  </button>

                  {enhancedPrompt && (
                    <div style={{ marginTop: "12px", padding: "8px", border: "1px dashed var(--color-accent-ai)", backgroundColor: "#fff9fb", borderRadius: "8px" }}>
                      <div className="font-mono text-[9px] font-bold text-[#ff2a85] uppercase tracking-wider mb-1">AI Prompt</div>
                      <p className="text-[10px] italic leading-relaxed text-[#555558] font-sans">{enhancedPrompt}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Column 2: 3D Preview Panel Bento Card */}
            <div className="dashboard-preview-panel">
              <div className="dashboard-preview-header">
                <span className="font-bold">Active Avatar</span>
              </div>
              <div className="dashboard-preview-body">
                {skinArray ? (
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

                        viewerInstance.background = 0xffffff;
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
                ) : (
                  <div className="text-grid-tag text-center">Loading 3D mesh...</div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <button
                    onClick={downloadSkin}
                    className="voxel-btn"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}
                  >
                    <Download size={13} strokeWidth={2} />
                    <span>Download PNG</span>
                  </button>

                  <a
                    href="/editor"
                    className="voxel-btn btn-accent"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px", textDecoration: "none" }}
                  >
                    <Maximize size={12} strokeWidth={2} />
                    <span>Open in Editor</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* API settings popup status alerts */}
      {(errorMsg || successMsg) && (
        <div className={`alert-overlay ${errorMsg ? "alert-overlay-error" : "alert-overlay-success"}`} style={{ borderRadius: "8px" }}>
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
