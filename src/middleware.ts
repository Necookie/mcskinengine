import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Hardwire Clerk credentials in middleware
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_REDACTED";
process.env.CLERK_SECRET_KEY = "sk_test_REDACTED";

// The MCP server wrapper must be accessible over the internet by external AI agents,
// and the main landing page should be public. All other routes require authentication.
const isPublicRoute = createRouteMatcher(["/", "/api/mcp"]);

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
