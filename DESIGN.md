---
name: MCSkinEngine
description: Artist-First Minimalist Workspace Studio for Minecraft Skin Creators
colors:
  primary: "#1c1c1d"
  canvas: "#ffffff"
  workspace: "#f4f4f5"
  border: "rgba(24, 24, 27, 0.12)"
  accent-ai: "#ff2a85"
typography:
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.4px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 540
    lineHeight: 1.2
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 340
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, Geist Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.54px"
rounded:
  lg: "16px"
  md: "8px"
  sm: "4px"
  pill: "9999px"
spacing:
  pixel: "4px"
  block-sm: "8px"
  block-md: "16px"
  block-lg: "20px"
  panel: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
---

# Design System: MCSkinEngine

## 1. Overview

**Creative North Star: "The Artist's Workbench Studio"**

MCSkinEngine's workspace is designed to disappear, focusing all visual attention on the skin canvas. The layout is optimized for speed, precision, and ergonomics:
- **UI Minimalism & Visual Hierarchy:** Immersive canvas workspace sitting on a neutral grey background to ensure color accuracy. Low-contrast `1px` lines divide tool groups.
- **Collapsible Toolbars:** Toggle both toolbars and panels via the `Tab` key to maximize workspace area.
- **Keyboard-First Architecture:** logical, software-standard shortcuts mapped to tools.
- **Infinite History Stack:** Undo/redo (`Ctrl+Z` / `Ctrl+Y`) lets artists experiment without fear.
- **Feedback:** Satisfying button micro-interactions and non-intrusive overlays.

## 2. Colors

A low-contrast monochrome base designed to keep the focus on the skin artwork.

- **Voxel Black** (#1c1c1d): Heavy outlines, text baseline, and active selections.
- **Studio White** (#ffffff): Default panel backgrounds.
- **Workspace Gray** (#f4f4f5): Neutral editor canvas backing.
- **Hairline border** (rgba(24, 24, 27, 0.12)): 1px borders between panels.
- **AI Accent Magenta** (#ff2a85): Reserved for AI prompt configurations.

## 3. Typography

- **Display-LG** (600, 24px, 1.2): Tool headers and panel titles.
- **Headline** (540, 20px, 1.2): Secondary sections and card heads.
- **Body** (340, 14px, 1.4): Option labels and descriptions.
- **Label** (500, 11px, 1.0): Uppercase monospace for coordinate tags.

## 4. Components

### Buttons
- **Shape:** Pill-shaped (9999px border-radius).
- **Primary:** Solid Voxel Black fill, Studio White text, 6px 14px padding.
- **Secondary:** Solid Studio White fill, Voxel Black text, 1px border.

### Sidebar / Workspace Panels
- **Borders:** Thin hairline dividers (`1px solid rgba(24, 24, 27, 0.12)`).
- **Roundings:** None for flush docked containers, `8px` or `12px` for nested tools.

## 5. Keyboard Shortcuts Checklist

- `Tab` — Toggle sidebar collapse (Immersive Canvas mode).
- `B` / `P` — Paintbrush / Draw tool.
- `E` — Eraser tool.
- `G` — Toggle grid overlay.
- `[` / `]` — Decrease / Increase brush size.
- `Ctrl + Z` — Undo stroke.
- `Ctrl + Y` — Redo stroke.
