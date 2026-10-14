"use client";

import React from "react";
import { X, Command } from "lucide-react";

interface ShortcutGroup {
  category: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: "Drawing & Tools",
    shortcuts: [
      { key: "B", description: "Select Paintbrush tool" },
      { key: "E", description: "Select Eraser tool" },
      { key: "I", description: "Select Eyedropper / Color Sampler" },
      { key: "1 - 4", description: "Quick switch brush size (1px to 4px)" },
      { key: "G", description: "Toggle pixel guide overlays" }
    ]
  },
  {
    category: "History & Navigation",
    shortcuts: [
      { key: "Ctrl + Z", description: "Undo last stroke" },
      { key: "Ctrl + Y", description: "Redo stroke (or Shift+Ctrl+Z)" },
      { key: "Tab", description: "Collapse or expand sidebar panels" },
      { key: "?", description: "Toggle this shortcut cheat sheet" }
    ]
  },
  {
    category: "3D Viewport Controls",
    shortcuts: [
      { key: "Left Drag", description: "Orbit and rotate 3D mannequin" },
      { key: "Right Drag", description: "Pan mannequin across viewport" },
      { key: "Scroll Wheel", description: "Zoom in and out of 3D scene" }
    ]
  }
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose}>
      <div
        className="shortcuts-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
      >
        {/* Header */}
        <div className="shortcuts-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Command size={16} strokeWidth={2.5} style={{ color: "var(--color-primary)" }} />
            <h2 className="text-panel-head" style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="voxel-tool-btn"
            style={{ padding: "4px 8px" }}
            aria-label="Close shortcuts modal"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content Groups */}
        <div className="shortcuts-modal-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="shortcuts-group-section">
              <span className="shortcuts-category-title">{group.category}</span>
              <div className="shortcuts-list">
                {group.shortcuts.map((item) => (
                  <div key={item.key} className="shortcut-row">
                    <span className="shortcut-description">{item.description}</span>
                    <kbd className="voxel-keycap">{item.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shortcuts-modal-footer">
          <span className="text-grid-tag" style={{ color: "#555558", fontSize: "10px" }}>
            Press <kbd className="voxel-keycap" style={{ display: "inline-block", margin: "0 4px" }}>ESC</kbd> or click outside to dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
