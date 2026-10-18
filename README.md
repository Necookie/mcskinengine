# MCSkinEngine — Minecraft Skin Workspace & Studio

MCSkinEngine is a retro-voxel Minecraft skin editor and AI generation suite built with Next.js 16 (App Router), deployed on Cloudflare Workers, and styled according to strict tactile voxel design tokens.

---

## Key Features

- **2D Pixel Editor:** 64×64 pixel-perfect drawing surface with 4px grid lines, 0px border radius, and `image-rendering: pixelated`.
- **Horizontal Symmetry Mode:** Real-time mirroring of drawing strokes across Minecraft UV regions (Face front, Face overlay, Torso front/back, and 8px block tiles).
- **Interactive 3D Mannequin:** Three.js / skinview3d viewport with camera angle snaps (Front, Back, Isometric, Top), auto-rotation speed steppers, 360° turntable spin, and secondary outer layer toggles.
- **Palette Presets & History:** Studio presets (Voxel, Biome, Arcade, Pastel), live Hex code input field, and recent color history swatches with tactile press feedback.
- **AI Texture Synthesis:** Powered by Google Gemini and OpenAI to generate Minecraft clothing stencils and apparel descriptions.
- **Creator Dashboard:** Mannequin preview, quick starter archetype presets (Classic Steve, Classic Alex, Nether Knight, Cyber Runner, Woodland Ranger), and real-time edge runtime ping indicator.
- **Tactile Voxel Design System:** Clean hairline borders (`rgba(24, 24, 27, 0.12)`), tactile 2px translateY active press, max 2px control border radius, JetBrains Mono labels, and full focus-visible accessibility.
- **Toast Feedback System:** Non-intrusive toast notifications for actions including Undo, Redo, Canvas Reset, Color Sampling, and Texture Export.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, CSS Design Tokens (`brand.md`), Framer Motion
- **Authentication:** Clerk (`@clerk/nextjs`)
- **3D Graphics:** react-skinview3d, Three.js
- **State Management:** Zustand
- **Database:** libSQL / Turso (`@libsql/client`)
- **Edge Deployment:** Cloudflare Workers (`wrangler.toml`)

---

## Development Commands

```bash
# Start local dev server
npm run dev

# Run type check & build
npm run build

# Run linter
npm run lint

# Deploy to Cloudflare Workers
npx wrangler deploy
```

---

## Design System Tokens (`brand.md`)

- **Base Grid:** 4px (tight controls 24px/32px, standard buttons 40px)
- **Border Radius:** 0px for drawing canvas surfaces; max 2px for buttons, pills, and input controls
- **Tactile Feedback:** 2px `translateY` offset on active click
- **Typography:** JetBrains Mono for data labels, coordinates, and tags; Inter for body and navigation
- **Color Tokens:**
  - Canvas: `#fcfcfd`
  - Primary: `#18181b`
  - Surface Soft: `#f4f4f5`
  - Accent AI: `#ff2a85`
  - Steve Block: `#b3d7df`
  - Alex Block: `#ebd3be`
  - Lab Block: `#c4e538`
