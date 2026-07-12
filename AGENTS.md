# AGENTS.md — MCSkinEngine Project

## Project Overview
MCSkinEngine is a Minecraft skin editor/generator built with Next.js 16 (App Router), deployed on Cloudflare Workers. Features a 2D pixel editor, 3D model preview (Three.js/skinview3d), AI skin generation, Clerk authentication, Zustand state, and an MCP API layer.

## Tech Stack
- **Framework:** Next.js 16 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, HeroUI, Framer Motion
- **Auth:** Clerk (`@clerk/nextjs`)
- **3D:** react-skinview3d (Three.js)
- **State:** Zustand
- **Database:** libSQL (`@libsql/client`)
- **Deployment:** Cloudflare Workers (`wrangler.toml`)
- **API:** MCP (`@modelcontextprotocol/sdk`)

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Lint (Next.js ESLint)
- `npx wrangler deploy` — Deploy to Cloudflare

---

## Skill Routing Rules

### ALWAYS — Design & UI Tasks
For ANY design, UI, styling, layout, visual, or frontend polish task:
1. **ALWAYS load the `impeccable` skill** (or `i-impeccable` for project-local variant)
2. **ALWAYS read and follow `brand.md`** in the project root for design tokens, colors, typography, spacing, and layout constraints
3. Key brand rules: pixel-perfect geometry (no curves), `image-rendering: pixelated`, 4px base grid, voxel monospace for labels, variable sans for body, tactile press mechanism (2px offset on click), no gradients/shadows

### Next.js / App Router Tasks
When working on routes, pages, layouts, server components, server actions, API routes, middleware, data fetching, caching, or any `src/app/**` files:
- **Load skill:** `nextjs-app-router-patterns`

### Clerk Auth Tasks
When working on authentication, user management, sign-in/sign-up flows, session handling, or any Clerk-related code (`src/middleware.ts`, auth API routes):
- **Load skill:** `clerk-nextjs-patterns`

### Clerk Testing Tasks
When writing tests for authentication flows, protected routes, or Clerk integrations:
- **Load skill:** `clerk-testing`

### Cloudflare Workers Tasks
When working on `wrangler.toml`, Workers configuration, edge deployment, KV/D1/R2 bindings, or Worker-specific code:
- **Load skill:** `workers-best-practices`

### TypeScript Tasks
When writing complex types, generics, utility types, type-safe APIs, or reviewing TypeScript patterns:
- **Load skill:** `typescript-advanced-types`

### 3D / Three.js Tasks
When working on `ModelPreview3D.tsx`, skinview3d integration, 3D rendering, camera controls, or WebGL-related code:
- **Load skill:** `threejs-3d-generator`

### Testing Tasks
When writing or running any tests (unit, integration, e2e):
- **Load skill:** `webapp-testing`

### Documentation Lookup (Any Library/Framework)
When needing up-to-date documentation for ANY dependency in this project (Next.js, React, Clerk, Cloudflare, Three.js, Zustand, libSQL, MCP SDK, HeroUI, Framer Motion, etc.):
- **Load skill:** `context7-mcp`
- Use context7 to fetch current docs instead of relying on potentially outdated knowledge

---

## File Conventions
- API routes: `src/app/api/*/route.ts`
- Components: `src/app/components/*.tsx`
- Lib/utilities: `src/lib/*.ts`
- Global styles: `src/app/globals.css`
- Layout: `src/app/layout.tsx`
- Main page: `src/app/page.tsx`

## Important Notes
- Never commit `.env` — it contains Clerk secrets
- All pixel art rendering must use `image-rendering: pixelated`
- Follow brand.md color tokens exactly — no ad-hoc colors
- Buttons use the tactile voxel press mechanism (2px translateY on active)
- Border radius is 0 for canvas/drawing surfaces, max 2px for controls
