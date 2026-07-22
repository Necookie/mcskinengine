import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes that do not require authentication.
 * - "/"            : Landing page (shows sign-in CTA)
 * - "/api/mcp"     : MCP tool endpoint consumed by external agents
 * - "/api/health"  : Health check for uptime monitors / Cloudflare
 * - "/sign-in(.*)" : Clerk-managed sign-in flow
 * - "/sign-up(.*)" : Clerk-managed sign-up flow
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/mcp",
  "/api/health",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[\\w]+$|_next/image).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
