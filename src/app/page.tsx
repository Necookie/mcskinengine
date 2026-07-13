"use client";

import React, { useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { motion } from "framer-motion";
import { LandingPage, LoadingScreen } from "./components/LandingPage";
import dynamic from "next/dynamic";
import { 
  Sparkles, Settings, LogOut, Maximize, User, Key, Cpu,
  Paintbrush, Download, ShieldCheck, Database, AlertTriangle, CheckCircle, ArrowRight, Home
} from "lucide-react";

// Dynamically import SkinViewer since it depends on browser canvas APIs (WebGL, ThreeJS)
const ReactSkinview3d = dynamic(
  () => import("react-skinview3d"),
  { ssr: false, loading: () => <div className="text-grid-tag text-[#555558]">Loading mesh...</div> }
);

export default function DashboardPage() {
  const { isSignedIn, user } = useUser();
  const {
    skinBase64,
    hasGeminiKey,
    hasOpenaiKey,
    role,
    ethnicity,
    modelType,
    fetchSkin,
    fetchSettings,
    saveSettings,
    skinArray
  } = useSkinStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [viewer, setViewer] = useState<any>(null);

  // Initialize data on sign-in
  useEffect(() => {
    if (isSignedIn) {
      fetchSkin();
      fetchSettings();
    }
  }, [isSignedIn]);

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
              Dashboard
            </span>
          </div>

          <nav className="sidebar-nav">
            <a href="/" className="sidebar-link active">
              <Home size={14} strokeWidth={2} />
              <span>Dashboard</span>
            </a>
            <a href="/editor" className="sidebar-link">
              <Paintbrush size={14} strokeWidth={2} />
              <span>3D Editor</span>
            </a>
            <a href="/ai-studio" className="sidebar-link">
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
          <div className="dashboard-window">
            {/* Welcome Banner */}
            <div className="dashboard-welcome-banner" style={{ padding: "32px 24px" }}>
              <div className="text-grid-tag" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>
                Active Session
              </div>
              <h1 className="text-display-lg" style={{ textTransform: "uppercase", margin: 0, lineHeight: 1.0 }}>
                Welcome, {user?.firstName || user?.username || "Creator"}.
              </h1>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
                <span className="text-grid-tag" style={{ color: "#555558" }}>Mesh: {modelType === "steve" ? "Steve (4px)" : "Alex (3px)"}</span>
                <span className="text-grid-tag" style={{ color: "#555558" }}>Active Base: {role}</span>
                <span className="text-grid-tag" style={{ color: "#555558" }}>Demographic: {ethnicity}</span>
              </div>
            </div>

            {/* Action Grid */}
            <div className="dashboard-grid-layout">
              {/* Column 1: Action Cards */}
              <div className="dashboard-card-column">
                {/* Launch Editor Card */}
                <div className="dashboard-action-card steve" style={{ padding: "28px 24px", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span className="text-grid-tag" style={{ color: "var(--color-primary)", display: "block", marginBottom: "6px" }}>
                        Studio Canvas
                      </span>
                      <h2 className="text-panel-head" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                        3D Skin Studio
                      </h2>
                      <p className="text-body-ui" style={{ fontSize: "12px", color: "#2d2d2f", lineHeight: "1.5" }}>
                        Paint directly onto a 3D model. Choose brush sizes, toggle pixel grids, and preview your changes in real time.
                      </p>
                    </div>
                    <Paintbrush size={20} strokeWidth={2} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "4px" }} />
                  </div>
                  <a
                    href="/editor"
                    className="voxel-btn btn-primary"
                    style={{ width: "max-content", padding: "10px 20px", fontSize: "10px", textDecoration: "none", borderRadius: "9999px" }}
                  >
                    <span>Open Editor</span>
                    <ArrowRight size={12} strokeWidth={2} />
                  </a>
                </div>

                {/* AI Generator Card */}
                <div className="dashboard-action-card alex" style={{ padding: "28px 24px", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span className="text-grid-tag" style={{ color: "var(--color-primary)", display: "block", marginBottom: "6px" }}>
                        Cognitive Textures
                      </span>
                      <h2 className="text-panel-head" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                        AI Skin Studio
                      </h2>
                      <p className="text-body-ui" style={{ fontSize: "12px", color: "#2d2d2f", lineHeight: "1.5" }}>
                        Generate clothing textures and stencil designs from a text description using Gemini AI.
                      </p>
                    </div>
                    <Sparkles size={20} strokeWidth={2} style={{ color: "var(--color-accent-ai)", flexShrink: 0, marginTop: "4px" }} />
                  </div>
                  <a
                    href="/ai-studio"
                    className="voxel-btn"
                    style={{ width: "max-content", padding: "10px 20px", fontSize: "10px", textDecoration: "none", backgroundColor: "#fff", color: "#1c1c1d", borderRadius: "9999px" }}
                  >
                    <span>Generate with AI</span>
                    <ArrowRight size={12} strokeWidth={2} />
                  </a>
                </div>

                {/* Credentials / Keys Card */}
                <div className="dashboard-action-card" style={{ padding: "28px 24px", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span className="text-grid-tag" style={{ color: "var(--color-primary)", display: "block", marginBottom: "6px" }}>
                        System Registry
                      </span>
                      <h2 className="text-panel-head" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                        API Configuration
                      </h2>
                      <p className="text-body-ui" style={{ fontSize: "12px", color: "#2d2d2f", lineHeight: "1.5", marginBottom: "8px" }}>
                        Provide API keys to run Gemini and OpenAI generation features.
                      </p>
                      
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "2px solid var(--color-primary)", padding: "4px 8px", backgroundColor: hasGeminiKey ? "var(--color-block-lab)" : "#fce8e6", borderRadius: "8px" }}>
                          <span className="dashboard-stat-label">Gemini API Key</span>
                          <span className="dashboard-stat-value" style={{ fontSize: "9px", color: hasGeminiKey ? "#15803d" : "#b91c1c" }}>
                            {hasGeminiKey ? "CONNECTED" : "MISSING"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "2px solid var(--color-primary)", padding: "4px 8px", backgroundColor: hasOpenaiKey ? "var(--color-block-lab)" : "#fce8e6", borderRadius: "8px" }}>
                          <span className="dashboard-stat-label">OpenAI API Key</span>
                          <span className="dashboard-stat-value" style={{ fontSize: "9px", color: hasOpenaiKey ? "#15803d" : "#b91c1c" }}>
                            {hasOpenaiKey ? "CONNECTED" : "MISSING"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Key size={20} strokeWidth={2} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "4px" }} />
                  </div>
                  
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="voxel-btn"
                    style={{ width: "max-content", padding: "10px 20px", fontSize: "10px", backgroundColor: "var(--color-surface-soft)", color: "var(--color-primary)", borderRadius: "9999px" }}
                  >
                    API Settings
                  </button>
                </div>
              </div>

              {/* Column 2: 3D Preview Panel */}
              <div className="dashboard-preview-panel">
                <div className="dashboard-preview-header">
                  <span className="font-bold">Active Avatar</span>
                </div>
                <div className="dashboard-preview-body">
                  {skinArray ? (
                    <div className="dashboard-avatar-preview-box">
                      <ReactSkinview3d
                        skinUrl=""
                        height={150}
                        width={110}
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
                      style={{ width: "100%", justifyContent: "center", fontSize: "10px", borderRadius: "9999px" }}
                    >
                      <Download size={13} strokeWidth={2} />
                      <span>Download PNG</span>
                    </button>

                    <a
                      href="/editor"
                      className="voxel-btn btn-accent"
                      style={{ width: "100%", justifyContent: "center", fontSize: "10px", textDecoration: "none", borderRadius: "9999px" }}
                    >
                      <Maximize size={12} strokeWidth={2} />
                      <span>Open in Editor</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Settings Modal Dialog */}
      {settingsOpen && (
        <div className="modal-backdrop">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="settings-overlay"
          >
            <div className="settings-overlay-header">
              <div className="settings-overlay-title">
                <Key size={13} className="text-yellow-500" style={{ marginRight: "4px" }} />
                <span>API Settings</span>
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="settings-overlay-close"
              >
                ✕
              </button>
            </div>
            
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="form-group-label" style={{ marginBottom: 0 }}>Gemini Developer API Key</label>
                {hasGeminiKey && (
                  <button 
                    onClick={async () => {
                      await saveSettings("", undefined);
                      setGeminiKeyInput("");
                      setSuccessMsg("Gemini API key removed.");
                      setTimeout(() => setSuccessMsg(""), 3000);
                    }}
                    style={{ fontSize: "9px", color: "#ff2a85", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={hasGeminiKey ? "•••••••• (Saved)" : "AIzaSy..."}
                className="voxel-input"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="form-group-label" style={{ marginBottom: 0 }}>OpenAI API Key</label>
                {hasOpenaiKey && (
                  <button 
                    onClick={async () => {
                      await saveSettings(undefined, "");
                      setOpenaiKeyInput("");
                      setSuccessMsg("OpenAI API key removed.");
                      setTimeout(() => setSuccessMsg(""), 3000);
                    }}
                    style={{ fontSize: "9px", color: "#ff2a85", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="password"
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKeyInput(e.target.value)}
                placeholder={hasOpenaiKey ? "•••••••• (Saved)" : "sk-proj-..."}
                className="voxel-input"
              />
            </div>
            
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSettingsOpen(false)}
                className="voxel-btn"
                style={{ padding: "6px 12px", fontSize: "10px", borderRadius: "6px", borderWidth: "2px", backgroundColor: "#fff" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings} 
                className="voxel-btn btn-primary"
                style={{ padding: "6px 12px", fontSize: "10px", borderRadius: "6px", borderWidth: "2px" }}
              >
                Save Key
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Feedback Status */}
      {(errorMsg || successMsg) && (
        <div className={`alert-overlay ${errorMsg ? "alert-overlay-error" : "alert-overlay-success"}`}>
          {errorMsg ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
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
