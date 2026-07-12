# Brand System: MCSkinEngine.dev (Voxel Minimalist Workspace)

## Overview

MCSkinEngine.dev's design system is, at the structural level, an ultra-clean, high-contrast voxel studio. The core canvas and chrome — top navbar, text weights, toolbars, and primary CTAs — are monochrome. Layout panels utilize heavy, geometric pixel borders (`border-4 border-[#1c1c1d]`) that mimic retro game inventory slots. Headlines are set in a highly variable, clean sans-serif paired with sharp, lowercase numeric subheaders, while metadata labels use an absolute pixelated monospace font to act as strict taxonomy anchors.

The identity shifts between crisp, high-contrast utility and stylized **Voxel Color-Block Sandbox Sections**. These blocks represent the system's structural inputs: demographic baselines (Races/Ethnicities) and institutional roles (Students/Professors). Instead of loose decorative cards, the page anchors these parameters inside dedicated, full-width pastel panels with crisp geometric corners and generous interior padding. These colored sandbox containers look like oversized, organized sticky notes on a designer’s cutting mat. 

This is a system built on architectural contrast: the monochrome developer chrome ensures the editing tools look precise and professional, while the voxel blocks keep the interface playful, retro, and true to Minecraft's heritage. The workspace never relies on gradients or drop shadows to separate containers; structural thickness, solid color fills, and pixelation handle the depth.

**Key Characteristics:**
- **Monochrome Utility Core:** `{colors.primary}` (Voxel Black) and `{colors.canvas}` (Studio White) carry every interface tool, text baseline, and script output.
- **Voxel Color-Block Panels:** Saturated, flat, retro-pastel backgrounds (`{colors.block-steve}`, `{colors.block-alex}`, `{colors.block-tweed}`, `{colors.block-lab}`) define the visual structure of your input forms and AI dashboards.
- **The Crisp Pixel Constraint:** Every interactive canvas uses an explicit `image-rendering: pixelated;` rule. Sharp $90^{\circ}$ geometry dictates the framework—no smooth vectors or subtle curves.
- **Variable Sans + Monospace Split:** A sharp variable sans typeface modules text weights for high-density tools, while an absolute monospace font (`{fonts.voxel-mono}`) is reserved strictly for coordinate grids, hex tags, and asset layers.
- **Tactile Voxel Press Mechanism:** Interactive inputs do not change opacity on hover; instead, they offset downwards exactly 2 pixels into a darker shadow border (`{colors.border-pressed}`) when clicked, simulating a physical game menu button trigger.

---

## Colors

### Brand & Core Chrome
- **Voxel Black** (`{colors.primary}`): `#1c1c1d`. The absolute frame. Used for heavy borders, code layout fields, primary button surfaces, and text headers on light layouts.
- **Studio White** (`{colors.canvas}`): `#ffffff`. The default canvas color, background surface for editor controls, and the text labeling layer inside inverse panels.
- **AI Accent Magenta** (`{colors.accent-ai}`): `#ff2a85`. A highly saturated, glowing pink reserved exclusively for AI generation states, the "Generate Skin" trigger, and dynamic token counters. Used sparingly.

### Surface & Skin Layers
- **Editor Grid Soft** (`{colors.surface-soft}`): `#f4f4f6`. Off-white panel backgrounds used behind file drag-and-drop areas and inactive tool panels.
- **Transparency Checker-A** (`{colors.checker-light}`): `#ffffff`. First alternating tile in the 2D skin drawing grid.
- **Transparency Checker-B** (`{colors.checker-dark}`): `#e2e2e5`. Second alternating tile in the 2D drawing matrix, creating an authentic 32-bit RGBA transparency grid.
- **Heavy Border** (`{colors.border-flat}`): `#1c1c1d`. 4px flat border outlines wrapped around all major component boxes.
- **Pressed Border** (`{colors.border-pressed}`): `#8a8a93`. The interior shadow border highlighted when a button is physically pressed.

### Voxel Block Spectrum (Dashboard Backgrounds)
- **Block Steve** (`{colors.block-steve}`): `#b3d7df`. Soft retro blue-gray color block used for **Classic 4px Arm** configurations and human/ethnicity variables.
- **Block Alex** (`{colors.block-alex}`): `#ebd3be`. Pale sand color block used for **Slim 3px Arm** configurations and organic asset stencils.
- **Block Tweed** (`{colors.block-tweed}`): `#f1e4d3`. Warm cream color block used for **Faculty/Professor** institutional tier controls.
- **Block Lab** (`{colors.block-lab}`): `#d2ebd9`. Mint-tinted pastel color block used for **STEM/Instructor** tool settings.
- **Block Void** (`{colors.block-void}`): `#111112`. Deep, dark indigo layout block used exclusively for the **Remote MCP Log Console** and JSON response displays.

---

## Typography

### Font Family
- **`workspaceSans`** — Your variable sans-serif baseline; fallback stack `Inter, system-ui, sans-serif`. Handles technical layout density efficiently across subtle, ultra-fine weight variations (320, 340, 480, 540, 700).
- **`voxelMono`** — A blocky, monospace typeface; fallback stack `JetBrains Mono, Geist Mono, monospace`. Used for system logs, asset coordinates, and hex codes. Always uppercase when used for table columns or labels.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `{typography.studio-title}` | 48px | 700 | 1.00 | -1.2px | Main workspace dashboard title |
| `{typography.panel-head}` | 24px | 540 | 1.20 | -0.4px | Titles inside the demographic/role block sections |
| `{typography.body-ui}` | 16px | 340 | 1.40 | 0 | Default text inside workspace forms and labels |
| `{typography.code-log}` | 14px | 400 | 1.30 | 0 | `voxelMono` string output for AI scripts and MCP outputs |
| `{typography.grid-tag}` | 11px | 500 | 1.00 | +0.4px | `voxelMono` uppercase labels marking skin grid areas ($X, Y$ dimensions) |

---

## Layout & Geometry

### Spacing & Grid System
- **Base Grid Unit**: 4px (derived directly from retro asset scaling).
- **Tokens**: `{spacing.pixel}` 4px · `{spacing.block-sm}` 8px · `{spacing.block-md}` 16px · `{spacing.block-lg}` 24px · `{spacing.panel}` 48px.
- **Workspace Proportions**: The viewport uses an explicit three-column bento setup: **Input Controls (Left)** $\rightarrow$ **Dual-Layer HTML5 2D Painting Grid (Center)** $\rightarrow$ **Animated 3D Model Render Engine (Right)**.

### The Minecraft Shape Constraints (No Curves)
- **Border Radius**: Absolute zero for manual drawing surfaces (`{rounded.none}`). Buttons and control panels use a maximum corner rounding of 2px (`{rounded.pixel}`) to match old-school UI design.
- **Image Treatment**: All loaded files and canvas buffers are treated with strict CSS scaling filters:
  ```css
  image-rendering: pixelated;
  image-rendering: crisp-edges;