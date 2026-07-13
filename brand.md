# Brand System: MCSkinEngine (Artist-First Minimalist Studio)

## Overview

MCSkinEngine's design system is a premium, blank studio space optimized for digital artists and voxel creators. The interface stays out of the way, focusing all visual attention on the canvas. The utility chrome—menus, toolbars, and settings—is strictly monochrome and uses low-contrast hairline dividers to prevent interface colors from distorting the artist's perception of their work.

**Core Design Principles:**
1. **UI Minimalism & Visual Hierarchy:**
   *   **Immersive Canvas:** The 3D/2D editing area is the focal point. We use neutral light stone (`#f4f4f5`) and checkerboard backdrops to keep colors accurate.
   *   **Collapsible Toolbars:** All toolbars and properties sidebar columns can be collapsed (standard `Tab` key) to maximize screen space.
   *   **Subtle Contrast:** UI borders use fine, low-contrast `1px` lines. High contrast is reserved strictly for selection states.
2. **Contextual & Adaptive Controls:**
   *   Panels display settings relevant to the active canvas and tool selection, minimizing cognitive load.
3. **Workflow Speed & Ergonomics:**
   *   **Keyboard-First Architecture:** Logical keyboard shortcuts map to industry standards (e.g., `Tab` to hide UI, `B` for Brush, `E` for Eraser, `G` for Grid, and `[` / `]` for brush sizes).
   *   **Infinite History:** Granular history stack supporting standard `Ctrl+Z` (Undo) and `Ctrl+Y` (Redo) so creators can experiment safely.
4. **Clear Feedback & State Awareness:**
   *   Satisfying active states (micro-scaling click offsets) and non-intrusive notifications that never interrupt the creative flow.

---

## Colors

### Utility Core
- **Voxel Black** (`{colors.primary}`): `#1c1c1d`. Heavy outline focus, text baseline, and active selects.
- **Studio White** (`{colors.canvas}`): `#ffffff`. Panel fills.
- **Workspace Gray** (`{colors.workspace}`): `#f4f4f5`. Neutral editor canvas backing.
- **Hairline border** (`{colors.border}`): `rgba(24, 24, 27, 0.12)`. Low-contrast panel dividers.

### Accent
- **AI Accent Magenta** (`{colors.accent-ai}`): `#ff2a85`. Single-shot color for prompt highlights.

---

## Typography

### Font Family
- **`workspaceSans`** (Inter): Variable sans-serif, using weight variations to carry hierarchy.
- **`voxelMono`** (JetBrains Mono): Uppercase blocky monospace for coordinates, hex keys, and labels.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `{typography.display-lg}` | 24px | 600 | 1.20 | -0.4px | Tool header and window titles |
| `{typography.headline}` | 20px | 540 | 1.20 | -0.3px | Secondary card titles |
| `{typography.body}` | 14px | 340 | 1.40 | 0 | Description and settings options |
| `{typography.eyebrow}` | 11px | 500 | 1.00 | +0.54px | Monospace uppercase labels |