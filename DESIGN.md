---
name: MCSkinEngine
description: Voxel Minimalist Workspace for Custom Minecraft Skins
colors:
  primary: "#1c1c1d"
  canvas: "#ffffff"
  accent-ai: "#ff2a85"
  surface-soft: "#f4f4f6"
  block-steve: "#b3d7df"
  block-alex: "#ebd3be"
  block-tweed: "#f1e4d3"
  block-lab: "#d2ebd9"
  block-void: "#111112"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 540
    lineHeight: 1.2
    letterSpacing: "-0.4px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 340
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "JetBrains Mono, Geist Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.4px"
rounded:
  card: "10px"
  btn: "6px"
  badge: "4px"
spacing:
  pixel: "4px"
  block-sm: "8px"
  block-md: "16px"
  block-lg: "24px"
  panel: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.btn}"
    padding: "8px 16px"
  button-accent:
    backgroundColor: "{colors.accent-ai}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.btn}"
    padding: "8px 16px"
---

# Design System: MCSkinEngine

## 1. Overview

**Creative North Star: "The Voxel Sandbox Studio"**

MCSkinEngine.dev's design system is a high-contrast voxel studio built on architectural contrast: monochrome chrome serves technical precision while saturated flat pastel block-forms organize parameter inputs. It rejects floating card layouts in favor of space-efficient docked panels and bento grids, avoiding smooth UI curves and decorative gradients in favor of sharp, functional game-inspired lines.

**Key Characteristics:**
- Monochrome core chrome ensuring editing utility focus.
- Saturated flat pastel color blocks clearly separating input sections.
- Strict pixelation constraints for rendering canvases.
- High tactility simulated via vertical button click offsets.

## 2. Colors

A retro-gaming sandbox palette pairing high-contrast monochrome with flat pastel colors.

### Primary
- **Voxel Black** (#1c1c1d): Heavy borders, primary text, and UI frames.
- **Studio White** (#ffffff): Default workspace backgrounds and label layer fills.

### Secondary
- **AI Accent Magenta** (#ff2a85): Reserved exclusively for AI generation triggers and token states.

### Neutral
- **Editor Grid Soft** (#f4f4f6): Off-white background behind inactive panels and drag dropzones.
- **Block Steve** (#b3d7df): Pastel blue-gray block for classic arm configurations.
- **Block Alex** (#ebd3be): Pastel sand block for slim arm configurations.
- **Block Tweed** (#f1e4d3): Pastel cream block for tier labels.
- **Block Lab** (#d2ebd9): Pastel mint block for tool options.
- **Block Void** (#111112): Dark indigo block for console outputs.

### Named Rules
**The Pastel-Block Rule.** Layout color blocks represent explicit parameters; they are flat, solid, and never use gradients.

## 3. Typography

**Display Font:** Inter (sans-serif)
**Body Font:** Inter (sans-serif)
**Label/Mono Font:** JetBrains Mono (monospace)

### Hierarchy
- **Display** (700, 48px, 1.0): Dashboard main titles.
- **Headline** (540, 24px, 1.2): Section headings inside cards.
- **Body** (340, 16px, 1.4): General description texts and inputs.
- **Label** (500, 11px, 1.0): Uppercase labels, grid coordinates, and metadata.

## 4. Elevation

The system is flat by default. Depth is conveyed using heavy solid borders and high-contrast pastel blocks rather than blurs or drop-shadows.

### Named Rules
**The Flat & Tactile Rule.** Elements sit flat on the surface at rest. Actionable elements offset downward by 2px on click rather than showing depth shadows.

## 5. Components

### Buttons
- **Shape:** Soft-rounded edges (6px).
- **Primary:** Solid Voxel Black (#1c1c1d) fill, Studio White (#ffffff) text, 8px 16px padding.
- **Active state:** translate-y of 2px when clicked.

### Cards / Containers
- **Corner Style:** Soft-rounded (10px).
- **Border:** Heavy Solid Voxel Black (4px solid #1c1c1d).
- **Padding:** Generous interior padding (16px to 24px).

### Inputs / Fields
- **Style:** 2px solid border, soft-rounded (6px) corners, white background.

## 6. Do's and Don'ts

### Do:
- **Do** align panels flush into clean bento grids with 12px gaps.
- **Do** use 10px rounded corners on bento panels to ensure a structured, non-sharp feel.
- **Do** offset buttons downward by 2px on active state.

### Don't:
- **Don't** use smooth curves, circular gradients, or blurred drop-shadow elements.
- **Don't** use floating island card layouts with empty margins.
