"use client";

import React, { useEffect, useState } from "react";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useSkinStore } from "@/lib/store";
import { motion } from "framer-motion";
import TraitSelector from "./components/TraitSelector";
import PixelEditor3D from "./components/PixelEditor3D";
import ModelPreview3D from "./components/ModelPreview3D";
import ImageDropzone from "./components/ImageDropzone";
import { LandingPage, LoadingScreen } from "./components/LandingPage";
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
    hasGeminiKey,
    hasOpenaiKey,
    isGenerating,
    mcpLogs,
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
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
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

  const handleGenerateSkin = async () => {
    const isOpenAI = selectedModel.startsWith("gpt");
    const hasKey = isOpenAI ? hasOpenaiKey : hasGeminiKey;
    if (!hasKey) {
      setErrorMsg(`Please configure your ${isOpenAI ? "OpenAI" : "Gemini"} API Key in Settings first.`);
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
      }

      const phpCost = data.cost !== undefined ? data.cost * 58.5 : 0;
      const costStr = data.cost !== undefined ? `${phpCost.toFixed(4)} PHP` : "unknown";
      const usageStr = data.usage ? `${data.usage.promptTokenCount} in, ${data.usage.candidatesTokenCount} out` : "unknown";
      setSuccessMsg(`Skin generated! Cost: ${costStr} (${usageStr} tokens)`);
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

  const handleClearCanvas = () => {
    if (confirm("Are you sure you want to clear the canvas? This will reset all pixels.")) {
      pushUndo(skinArray);
      const blank = new Uint8Array(64 * 64 * 4);
      for (let i = 0; i < blank.length; i += 4) {
        blank[i] = 255;
        blank[i + 1] = 255;
        blank[i + 2] = 255;
        blank[i + 3] = 255;
      }
      setSkinArray(blank);
      setTimeout(() => saveSkin(), 100);
    }
  };

  if (isSignedIn === undefined) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <LandingPage />;
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
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-group-label">Gemini Developer API Key</label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder={hasGeminiKey ? "•••••••• (Saved)" : "AIzaSy..."}
                  className="voxel-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-group-label">OpenAI API Key</label>
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
          <div className="editor-container-wrap">
            <PixelEditor3D />
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
                {!hasGeminiKey && !hasOpenaiKey ? (
                  /* Setup Onboarding view */
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-accent-ai)" }}>
                      <Sparkles size={16} />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">AI Studio Setup Guide</span>
                    </div>
                    
                    <p style={{ fontSize: "10px", lineHeight: "1.5", color: "#555558", fontFamily: "var(--font-sans)" }}>
                      To generate Minecraft skins using Gemini, you need a free API Key. Paste your key below to initialize the AI creator module.
                    </p>

                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="voxel-btn text-[10px]"
                      style={{ padding: "6px 0", fontSize: "10px", borderRadius: 0, borderWidth: "2px", justifyContent: "center", width: "100%", textDecoration: "none", backgroundColor: "var(--color-surface-soft)", color: "var(--color-primary)" }}
                    >
                      Get Gemini API Key (Free) ↗
                    </a>

                    <div className="form-group" style={{ marginTop: "4px" }}>
                      <label className="form-group-label">PASTE API KEY HERE</label>
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
                      SAVE AND ACTIVATE AI
                    </button>
                  </div>
                ) : (
                  /* Normal Generator Interface View */
                  <>
                    <p className="ai-section-desc">
                      Describe uniform features or upload a reference image to procedure-generate details.
                    </p>
                    <div className="form-group">
                      <label className="form-group-label">AI Model & Provider</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="voxel-input font-mono text-[10px]"
                        style={{ padding: "6px", width: "100%", textTransform: "none" }}
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (~0.150 PHP per generation) [LATEST]</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (~0.006 PHP per generation)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (~0.095 PHP per generation)</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (~0.006 PHP per generation)</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (~0.006 PHP per generation)</option>
                        <option value="gpt-4o-mini">OpenAI GPT-4o Mini (~0.011 PHP per generation)</option>
                        <option value="gpt-4o">OpenAI GPT-4o (~0.190 PHP per generation)</option>
                      </select>
                    </div>
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
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
