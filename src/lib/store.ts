import { create } from "zustand";
import { base64ToSkin, skinToBase64 } from "./skinEngine";

interface LogEntry {
  id: number;
  timestamp: string;
  userId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: string;
}

interface SkinState {
  skinArray: Uint8Array;
  skinBase64: string;
  role: string;
  ethnicity: string;
  modelType: "steve" | "alex";
  selectedColor: string;
  brushSize: number;
  
  geminiPrompt: string;
  hasGeminiKey: boolean;
  hasOpenaiKey: boolean;
  isGenerating: boolean;
  mcpLogs: LogEntry[];

  undoStack: Uint8Array[];
  redoStack: Uint8Array[];

  activeTool: "brush" | "eraser";
  showGuides: boolean;
  zoom2D: number;

  setSkinArray: (arr: Uint8Array) => void;
  setPixel: (x: number, y: number, colorHex: string, alpha: number) => void;
  setRole: (role: string) => void;
  setEthnicity: (ethnicity: string) => void;
  setModelType: (type: "steve" | "alex") => void;
  setSelectedColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setGeminiPrompt: (prompt: string) => void;
  setIsGenerating: (val: boolean) => void;
  setMcpLogs: (logs: LogEntry[]) => void;

  pushUndo: (arr: Uint8Array) => void;
  undo: () => void;
  redo: () => void;

  setActiveTool: (tool: "brush" | "eraser") => void;
  setShowGuides: (val: boolean) => void;
  setZoom2D: (val: number) => void;

  fetchSkin: () => Promise<void>;
  saveSkin: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  saveSettings: (geminiKey?: string, openaiKey?: string) => Promise<void>;
}

// Initial default blank/transparent skin (white base for mannequin visibility)
const createEmptySkin = () => {
  const arr = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < arr.length; i += 4) {
    arr[i] = 255;     // R
    arr[i + 1] = 255; // G
    arr[i + 2] = 255; // B
    arr[i + 3] = 255; // A
  }
  return arr;
};

export const useSkinStore = create<SkinState>((set, get) => ({
  skinArray: createEmptySkin(),
  skinBase64: "",
  role: "hoodie",
  ethnicity: "East Asian",
  modelType: "steve",
  selectedColor: "#1c1c1d",
  brushSize: 1,
  
  geminiPrompt: "",
  hasGeminiKey: false,
  hasOpenaiKey: false,
  isGenerating: false,
  mcpLogs: [],

  undoStack: [],
  redoStack: [],

  activeTool: "brush",
  showGuides: true,
  zoom2D: 1,

  setActiveTool: (activeTool) => set({ activeTool }),
  setShowGuides: (showGuides) => set({ showGuides }),
  setZoom2D: (zoom2D) => set({ zoom2D }),

  pushUndo: (arr) => {
    const { undoStack } = get();
    const newStack = [...undoStack, new Uint8Array(arr)].slice(-50);
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, skinArray } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [new Uint8Array(skinArray), ...redoStack].slice(0, 50);
    set({
      skinArray: prev,
      skinBase64: skinToBase64(prev),
      undoStack: newUndo,
      redoStack: newRedo
    });
    get().saveSkin();
  },

  redo: () => {
    const { undoStack, redoStack, skinArray } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const newUndo = [...undoStack, new Uint8Array(skinArray)].slice(-50);
    set({
      skinArray: next,
      skinBase64: skinToBase64(next),
      undoStack: newUndo,
      redoStack: newRedo
    });
    get().saveSkin();
  },

  setSkinArray: (arr) => {
    const b64 = skinToBase64(arr);
    set({ skinArray: arr, skinBase64: b64 });
  },

  setPixel: (x, y, colorHex, alpha = 255) => {
    const state = get();
    const newArray = new Uint8Array(state.skinArray);
    
    const hex = colorHex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    const brushSize = state.brushSize;
    const half = Math.floor(brushSize / 2);

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < 64 && py >= 0 && py < 64) {
          const idx = (py * 64 + px) * 4;
          newArray[idx] = r;
          newArray[idx + 1] = g;
          newArray[idx + 2] = b;
          newArray[idx + 3] = alpha;
        }
      }
    }

    set({ skinArray: newArray });
  },

  setRole: (role) => set({ role }),
  setEthnicity: (ethnicity) => set({ ethnicity }),
  setModelType: (modelType) => set({ modelType }),
  setSelectedColor: (selectedColor) => set({ selectedColor }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setGeminiPrompt: (geminiPrompt) => set({ geminiPrompt }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setMcpLogs: (mcpLogs) => set({ mcpLogs }),

  fetchSkin: async () => {
    try {
      const res = await fetch("/api/user-skin");
      if (res.ok) {
        const data = await res.json();
        if (data.skin && typeof data.skin === "string") {
          set({
            skinBase64: data.skin,
            skinArray: base64ToSkin(data.skin),
            role: data.role || "hoodie",
            ethnicity: data.ethnicity || "East Asian",
            modelType: data.modelType || "steve",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching user skin:", err);
    }
  },

  saveSkin: async () => {
    const { skinArray, role, ethnicity, modelType } = get();
    if (skinArray.length === 0) return;
    const skinBase64 = skinToBase64(skinArray);
    try {
      const res = await fetch("/api/save-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skin: skinBase64,
          role,
          ethnicity,
          modelType,
        }),
      });
      if (!res.ok) {
        console.error("Save skin failed:", res.status);
      }
    } catch (err) {
      console.error("Error saving skin:", err);
    }
  },

  fetchLogs: async () => {
    try {
      const res = await fetch("/api/mcp-logs");
      if (res.ok) {
        const data = await res.json();
        set({ mcpLogs: data.logs || [] });
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  },

  fetchSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set({ 
          hasGeminiKey: data.hasGeminiKey || false,
          hasOpenaiKey: data.hasOpenaiKey || false
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  },

  saveSettings: async (geminiKey, openaiKey) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey, openaiKey }),
      });
      if (res.ok) {
        const updates: Partial<SkinState> = {};
        if (geminiKey !== undefined) updates.hasGeminiKey = !!geminiKey;
        if (openaiKey !== undefined) updates.hasOpenaiKey = !!openaiKey;
        set(updates);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  },
}));
