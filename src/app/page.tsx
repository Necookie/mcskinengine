"use client";

import React, { useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { motion } from "framer-motion";
import { LandingPage, LoadingScreen } from "./components/LandingPage";
import dynamic from "next/dynamic";
import { 
  Sparkles, Settings, LogOut, Maximize, User, Key, Cpu,
  Paintbrush, Download, ShieldCheck, Database, AlertTriangle, CheckCircle, ArrowRight
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
      {/* NAVBAR */}
      <header className="workspace-header">
        <div className="header-logo-group">
          <div className="header-logo">
            MCSE
          </div>
          <span className="header-title">
            MCSkinEngine.dev // User Dashboard
          </span>
        </div>

        <div className="header-actions">
          <button
            onClick={() => setSettingsOpen(true)}
            className={`voxel-btn ${settingsOpen ? "btn-primary" : ""}`}
            style={{ padding: "6px 12px", fontSize: "10px", borderRadius: 0, borderWidth: "2px" }}
            title="Settings"
          >
            <Settings size={12} />
            <span>Settings</span>
          </button>
          
          <div className="header-divider" />

          <div className="header-actions">
            <span className="header-badge-user">
              User: {user?.username || user?.firstName || "Steve"}
            </span>
            <SignOutButton>
              <button
                className="voxel-btn"
                style={{ padding: "6px 10px", backgroundColor: "#fce8e6", color: "#c53030", borderRadius: 0, borderWidth: "2px" }}
              >
                <LogOut size={12} />
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard-main-content">
        {/* Welcome Banner */}
        <div className="dashboard-welcome-banner">
          <h1 className="text-panel-head" style={{ fontWeight: 700, textTransform: "uppercase" }}>
            Welcome back, {user?.firstName || user?.username || "Mannequin Master"}!
          </h1>
          <span className="text-grid-tag" style={{ color: "#555558" }}>
            AVATAR CONFIGURATION: {modelType.toUpperCase()} ({modelType === "steve" ? "4PX ARMS" : "3PX ARMS"}) | BASE STENCIL: {role.toUpperCase()} | ETHNICITY PROFILE: {ethnicity.toUpperCase()}
          </span>
        </div>

        {/* Action Grid */}
        <div className="dashboard-grid-layout">
          {/* Column 1: Action Cards */}
          <div className="dashboard-card-column">
            {/* Launch Editor Card */}
            <div className="dashboard-action-card steve">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 className="text-panel-head" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                    3D Skin Canvas Editor
                  </h2>
                  <p className="text-body-ui" style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4" }}>
                    Draw, repaint, and custom-craft your Minecraft skin directly on a 3D mannequin block model. Supports pixel-perfect grid guides, custom brush sizing, and live feedback updates.
                  </p>
                </div>
                <Paintbrush size={24} className="text-sky-700" style={{ flexShrink: 0 }} />
              </div>
              <a
                href="/editor"
                className="voxel-btn btn-primary"
                style={{ width: "max-content", marginTop: "4px", fontSize: "10px", textDecoration: "none" }}
              >
                <span>Launch Skin Studio</span>
                <ArrowRight size={12} />
              </a>
            </div>

            {/* AI Generator Card */}
            <div className="dashboard-action-card alex">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 className="text-panel-head" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                    AI Generator Studio
                  </h2>
                  <p className="text-body-ui" style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4" }}>
                    Use the Gemini developer APIs to generate Minecraft clothing designs from textual descriptions and prompts. Import clothing patterns, hats, coats, and streetwear details.
                  </p>
                </div>
                <Sparkles size={24} className="text-amber-700" style={{ flexShrink: 0 }} />
              </div>
              <a
                href="/editor"
                className="voxel-btn"
                style={{ width: "max-content", marginTop: "4px", fontSize: "10px", textDecoration: "none", backgroundColor: "#fff", color: "#1c1c1d" }}
              >
                <span>Generate with AI</span>
                <ArrowRight size={12} />
              </a>
            </div>

            {/* Credentials / Keys Card */}
            <div className="dashboard-action-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 className="text-panel-head" style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                    API Connection Status
                  </h2>
                  <p className="text-body-ui" style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4", marginBottom: "8px" }}>
                    Ensure your developer key connections are configured to enable procedural AI generated stencils.
                  </p>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "2px solid var(--color-primary)", padding: "4px 8px", backgroundColor: hasGeminiKey ? "var(--color-block-lab)" : "#fce8e6" }}>
                      <span className="dashboard-stat-label">Gemini Key:</span>
                      <span className="dashboard-stat-value" style={{ fontSize: "9px", color: hasGeminiKey ? "#15803d" : "#b91c1c" }}>
                        {hasGeminiKey ? "CONNECTED" : "MISSING"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", border: "2px solid var(--color-primary)", padding: "4px 8px", backgroundColor: hasOpenaiKey ? "var(--color-block-lab)" : "#fce8e6" }}>
                      <span className="dashboard-stat-label">OpenAI Key:</span>
                      <span className="dashboard-stat-value" style={{ fontSize: "9px", color: hasOpenaiKey ? "#15803d" : "#b91c1c" }}>
                        {hasOpenaiKey ? "CONNECTED" : "MISSING"}
                      </span>
                    </div>
                  </div>
                </div>
                <Key size={24} className="text-gray-500" style={{ flexShrink: 0 }} />
              </div>
              
              <button
                onClick={() => setSettingsOpen(true)}
                className="voxel-btn"
                style={{ width: "max-content", marginTop: "4px", fontSize: "10px", backgroundColor: "var(--color-surface-soft)", color: "var(--color-primary)" }}
              >
                Configure Keys
              </button>
            </div>
          </div>

          {/* Column 2: 3D Preview Box */}
          <div className="dashboard-card-column">
            <div className="workspace-card" style={{ height: "100%" }}>
              <div className="card-header" style={{ borderLeft: "4px solid var(--color-block-lab)" }}>
                <span className="font-bold">Active Avatar</span>
              </div>
              <div className="card-body" style={{ backgroundColor: "#f4f4f6", display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center", height: "100%" }}>
                {skinArray ? (
                  <div className="dashboard-avatar-preview-box">
                    <ReactSkinview3d
                      skinUrl=""
                      height={150}
                      width={110}
                      onReady={(viewerInstance: any) => {
                        // NearestFilter for retro pixelated look
                        if (viewerInstance.skinTexture) {
                          viewerInstance.skinTexture.minFilter = 1003;
                          viewerInstance.skinTexture.magFilter = 1003;
                          viewerInstance.skinTexture.needsUpdate = true;
                        }

                        viewerInstance.background = 0xffffff;
                        viewerInstance.autoRotate = true;
                        viewerInstance.autoRotateSpeed = 0.6;

                        // Orbit controls
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

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={downloadSkin}
                    className="voxel-btn"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px" }}
                  >
                    <Download size={13} />
                    <span>Download PNG</span>
                  </button>

                  <a
                    href="/editor"
                    className="voxel-btn btn-accent"
                    style={{ width: "100%", justifyContent: "center", fontSize: "10px", textDecoration: "none" }}
                  >
                    <Maximize size={12} />
                    <span>Open in Editor</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
                style={{ padding: "6px 12px", fontSize: "10px", borderRadius: 0, borderWidth: "2px", backgroundColor: "#fff" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSettings} 
                className="voxel-btn btn-primary"
                style={{ padding: "6px 12px", fontSize: "10px", borderRadius: 0, borderWidth: "2px" }}
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
