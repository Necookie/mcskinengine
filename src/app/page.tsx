"use client";

import React, { useEffect, useState } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { motion } from "framer-motion";
import TraitSelector from "./components/TraitSelector";
import PixelEditor2D from "./components/PixelEditor2D";
import ModelPreview3D from "./components/ModelPreview3D";
import ImageDropzone from "./components/ImageDropzone";
import { 
  Sparkles, Terminal, Settings, LogOut, CheckCircle, AlertTriangle,
  Paintbrush, Eraser, Undo, Redo, RotateCcw, Grid3X3, ZoomIn, ZoomOut, Maximize,
  ChevronUp, ChevronDown, Key, User
} from "lucide-react";

export default function WorkspacePage() {
  const { isSignedIn, user } = useUser();
  const {
    skinBase64,
    geminiPrompt,
    geminiKey,
    isGenerating,
    mcpLogs,
    role,
    ethnicity,
    modelType,
    setGeminiPrompt,
    setGeminiKey,
    setIsGenerating,
    setSkinArray,
    setRole,
    setEthnicity,
    setModelType,
    fetchSkin,
    fetchLogs,
    fetchSettings,
    saveSettings,
    saveSkin,
    skinArray,
    undoStack,
    redoStack,
    activeTool,
    setActiveTool,
    showGuides,
    setShowGuides,
    zoom2D,
    setZoom2D,
    pushUndo,
    undo,
    redo
  } = useSkinStore();

  const [refImage, setRefImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [sections, setSections] = useState({
    ai: true,
    config: true,
    preview: true,
  });

  const [consoleExpanded, setConsoleExpanded] = useState(false);

  const toggleSection = (sec: "ai" | "config" | "preview") => {
    setSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Initialize data on sign-in
  useEffect(() => {
    if (isSignedIn) {
      fetchSkin();
      fetchSettings();
      fetchLogs();

      // Poll MCP logs every 5 seconds
      const interval = setInterval(() => {
        fetchLogs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (geminiKey) {
      setKeyInput(geminiKey);
    }
  }, [geminiKey]);

  // Handle Gemini Skin Generation
  const handleGenerateSkin = async () => {
    if (!geminiKey) {
      setErrorMsg("Please configure your Gemini API Key in Settings first.");
      setSettingsOpen(true);
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
          isAlex: modelType === "alex"
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
      }

      setSuccessMsg("Skin generated and applied successfully!");
      fetchLogs();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during generation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    await saveSettings(keyInput);
    setSuccessMsg("Gemini API key saved securely!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleClearCanvas = () => {
    if (confirm("Are you sure you want to clear the canvas? This will reset all pixels.")) {
      pushUndo(skinArray);
      const blank = new Uint8Array(64 * 64 * 4);
      setSkinArray(blank);
      setTimeout(() => saveSkin(), 100);
    }
  };

  // Loading state — Clerk hasn't resolved auth yet
  if (isSignedIn === undefined) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f4f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `
          linear-gradient(45deg, #e2e2e5 25%, transparent 25%),
          linear-gradient(-45deg, #e2e2e5 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e2e2e5 75%),
          linear-gradient(-45deg, transparent 75%, #e2e2e5 75%)
        `,
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "4px solid #1c1c1d",
          borderTopColor: "transparent",
          animation: "spin 0.6s linear infinite",
        }} />
      </div>
    );
  }

  // Render Landing page if not signed in
  if (!isSignedIn) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f4f4f6",
        backgroundImage: `
          linear-gradient(45deg, #e2e2e5 25%, transparent 25%),
          linear-gradient(-45deg, #e2e2e5 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e2e2e5 75%),
          linear-gradient(-45deg, transparent 75%, #e2e2e5 75%)
        `,
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        userSelect: "none",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{
            maxWidth: 520,
            width: "100%",
            backgroundColor: "#ffffff",
            border: "4px solid #1c1c1d",
            boxShadow: "8px 8px 0px 0px #1c1c1d",
            padding: "0",
            overflow: "hidden",
          }}
        >
          {/* Card Header Band */}
          <div style={{
            backgroundColor: "#1c1c1d",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: "#f4f4f6",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}>MCSE.dev — v2.0</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px 40px 32px" }}>
            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{
                backgroundColor: "#ebd3be",
                border: "4px solid #1c1c1d",
                padding: "14px 20px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 28,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#1c1c1d",
                letterSpacing: "-1px",
                boxShadow: "4px 4px 0px 0px #1c1c1d",
              }}>
                MCSE
              </div>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 38,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#1c1c1d",
              letterSpacing: "-1.2px",
              lineHeight: 1.0,
              textAlign: "center",
              marginBottom: 12,
            }}>MCSkinEngine</h1>
            <p style={{
              fontSize: 13,
              color: "#555558",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 32,
              maxWidth: 360,
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              The next-generation retro-voxel Minecraft skin editor. Design with precision 2D tools or generate skins with Gemini AI.
            </p>

            {/* Feature Pills */}
            <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 32,
            }}>
              {["✦ Pixel Editor", "✦ AI Generator", "✦ 3D Preview", "✦ Turso Sync"].map(feat => (
                <span key={feat} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#1c1c1d",
                  backgroundColor: "#f4f4f6",
                  border: "2px solid #1c1c1d",
                  padding: "4px 10px",
                  letterSpacing: "0.5px",
                }}>{feat}</span>
              ))}
            </div>

            {/* CTA Button */}
            <SignInButton mode="modal">
              <button style={{
                width: "100%",
                padding: "14px 0",
                backgroundColor: "#1c1c1d",
                color: "#ffffff",
                border: "4px solid #1c1c1d",
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                cursor: "pointer",
                boxShadow: "0 4px 0 0 #000000",
                transform: "translateY(-4px)",
                transition: "all 0.05s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.filter = "brightness(0.85)";
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.filter = "brightness(1)";
              }}
              onMouseDown={e => {
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 0 0 0 #000000";
              }}
              onMouseUp={e => {
                (e.target as HTMLButtonElement).style.transform = "translateY(-4px)";
                (e.target as HTMLButtonElement).style.boxShadow = "0 4px 0 0 #000000";
              }}
              >
                ⬛ Launch Workspace
              </button>
            </SignInButton>
          </div>

          {/* Card Footer */}
          <div style={{
            borderTop: "2px solid #e2e2e5",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}>
            {["Free to use", "Clerk Auth", "Gemini AI"].map((item, i) => (
              <span key={item} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#8a8a93",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                {i > 0 && <span style={{ color: "#e2e2e5" }}>·</span>}
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="workspace-container">
      {/* MONOCHROME TOP BAR NAVBAR (h-14) */}
      <header className="workspace-header">
        <div className="header-logo-group">
          <div className="header-logo">
            MCSE
          </div>
          <span className="header-title">
            MCSkinEngine.dev // Voxel Workspace
          </span>
        </div>

        {/* User Actions */}
        <div className="header-actions">
          {/* Zoom Indicator */}
          <div className="header-badge-zoom">
            <span>ZOOM: {Math.round(zoom2D * 100)}%</span>
          </div>

          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`voxel-btn ${settingsOpen ? "btn-primary" : ""}`}
            style={{ padding: "6px 12px", fontSize: "10px", borderRadius: 0, borderWidth: "2px" }}
            title="Settings"
          >
            <Settings size={12} />
            <span>Settings</span>
          </button>
          
          <div className="header-divider" />

          {/* User Display & Logout */}
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

      {/* WORKSPACE MAIN COLUMNS */}
      <div className="workspace-main">
        {/* COLUMN 1: LEFT SIDEBAR (TOOL DOCK) */}
        <aside className="tool-dock">
          {/* Drawing Tools */}
          <div className="tool-dock-section">
            <span className="tool-dock-label">Tools</span>
            <button
              onClick={() => setActiveTool("brush")}
              className={`tool-btn ${activeTool === "brush" ? "active" : ""}`}
              title="Paint Brush"
            >
              <Paintbrush size={15} />
            </button>
            <button
              onClick={() => setActiveTool("eraser")}
              className={`tool-btn ${activeTool === "eraser" ? "active" : ""}`}
              title="Eraser"
            >
              <Eraser size={15} />
            </button>
          </div>

          <div className="tool-dock-divider" />

          {/* Actions: Undo/Redo & Reset */}
          <div className="tool-dock-section">
            <span className="tool-dock-label">Edit</span>
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="tool-btn"
              title="Undo Last Action"
            >
              <Undo size={15} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="tool-btn"
              title="Redo Next Action"
            >
              <Redo size={15} />
            </button>
            <button
              onClick={handleClearCanvas}
              className="tool-btn hover:text-red-600 hover:border-red-500"
              title="Reset/Clear Canvas"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="tool-dock-divider" />

          {/* Canvas Guides & Zoom */}
          <div className="tool-dock-section">
            <span className="tool-dock-label">View</span>
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`tool-btn ${showGuides ? "active" : ""}`}
              title="Toggle Symmetry/Grid Guides"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setZoom2D(Math.min(3, zoom2D + 0.25))}
              className="tool-btn"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              onClick={() => setZoom2D(Math.max(0.5, zoom2D - 0.25))}
              className="tool-btn"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              onClick={() => setZoom2D(1)}
              className="tool-btn"
              title="Zoom Reset (Fit)"
            >
              <Maximize size={15} />
            </button>
          </div>
        </aside>

        {/* COLUMN 2: CENTER CANVAS COLUMN */}
        <main className="canvas-column">
          {/* Conditional Settings Panel overlay */}
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-group-label">Gemini Developer API Key</label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
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
          <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", paddingBottom: consoleExpanded ? "240px" : "56px" }}>
            <PixelEditor2D />
          </div>

          {/* Collapsible Bottom console tray locked inside the canvas card container */}
          <aside 
            className="console-tray"
            style={{ height: consoleExpanded ? "220px" : "36px" }}
          >
            <div 
              onClick={() => setConsoleExpanded(!consoleExpanded)}
              className="console-header text-xs text-[#00ff66] font-mono"
            >
              <div className="flex items-center gap-2">
                <Terminal size={13} />
                <span className="font-bold uppercase tracking-wider">Remote MCP Console</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchLogs();
                  }}
                  className="text-[10px] text-[#00ff66] hover:text-white underline"
                >
                  refresh
                </button>
                {consoleExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </div>

            {consoleExpanded && (
              <div className="console-content custom-scrollbar">
                {mcpLogs.length === 0 ? (
                  <div className="text-gray-600 uppercase text-center py-12">No remote MCP calls logged.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {mcpLogs.map((log) => (
                      <div key={log.id} className="border-b border-[#2c2c2d]/40 pb-2 last:border-b-0">
                        <div className="flex items-center justify-between text-[10px] text-gray-500">
                          <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className="text-[#00ff66] font-bold">STATUS: {log.status.toUpperCase()}</span>
                        </div>
                        <span className="text-yellow-400 font-bold text-[11px]">{log.toolName}</span>
                        <div className="text-gray-300 text-[10px] pl-2 mt-1 break-all bg-black/30 p-1.5 border border-[#2c2c2d]/40 rounded font-mono">
                          {JSON.stringify(log.arguments)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </main>

        {/* COLUMN 3: RIGHT SIDEBAR (FLOATING CONTROL CARDS) */}
        <aside className="right-sidebar-container custom-scrollbar">
          {/* Card A: 3D Model Preview (Always Visible at the top) */}
          <div className="workspace-card">
            <div className="card-header" style={{ borderLeft: "4px solid var(--color-block-steve)", cursor: "default" }}>
              <div className="flex items-center gap-2">
                <Maximize size={14} className="text-sky-700" />
                <span className="font-bold">3D Model Preview</span>
              </div>
            </div>
            <div className="card-body" style={{ backgroundColor: "#f4f4f6" }}>
              <ModelPreview3D />
            </div>
          </div>

          {/* Card B: Character Configurator */}
          <div className="workspace-card">
            <div 
              className="card-header" 
              onClick={() => toggleSection("config")}
              style={{ borderLeft: `4px solid var(--color-block-alex)` }}
            >
              <div className="flex items-center gap-2">
                <User size={14} className="text-amber-700" />
                <span className="font-bold">Character Configurator</span>
              </div>
              {sections.config ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {sections.config && (
              <div 
                className="card-body" 
                style={{ 
                  backgroundColor: role === "blazer" ? "#f1e4d3" : role === "labcoat" ? "#d2ebd9" : modelType === "steve" ? "#b3d7df" : "#ebd3be" 
                }}
              >
                <TraitSelector />
              </div>
            )}
          </div>

          {/* Card C: AI Generator */}
          <div className="workspace-card">
            <div 
              className="card-header" 
              onClick={() => toggleSection("ai")}
              style={{ borderLeft: `4px solid var(--color-accent-ai)` }}
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#ff2a85]" />
                <span className="font-bold">AI Generator</span>
              </div>
              {sections.ai ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {sections.ai && (
              <div className="card-body" style={{ backgroundColor: "#ffffff" }}>
                <p className="ai-section-desc">
                  Describe uniform features or upload a reference image to procedure-generate details.
                </p>
                <div className="form-group">
                  <label className="form-group-label">Aesthetic Prompt</label>
                  <textarea
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    placeholder="e.g. A blue school hoodie with neon pink stripes on sleeves, black jeans, white sneakers"
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
                  {isGenerating ? "GENERATING SKIN..." : "GENERATE SKIN"}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
