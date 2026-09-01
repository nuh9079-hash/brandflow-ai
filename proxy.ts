import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/media(.*)", "/api/cron(.*)"]);
const isProtectedRoute = createRouteMatcher(["/","/create(.*)","/history(.*)","/favorites(.*)","/publish(.*)","/profiles(.*)","/media(.*)","/settings(.*)","/billing(.*)","/api(.*)"]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req) && isProtectedRoute(req)) await auth.protect();
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  // Safe public review mode for Vercel/Rocket when Clerk keys are unavailable.
  // Never expose API/data routes in review mode.
  if (!clerkEnabled) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "BrandFlow review mode: API access is disabled." },
        { status: 503 }
      );
    }

    const allowedReviewPage =
      req.nextUrl.pathname === "/" ||
      req.nextUrl.pathname.startsWith("/create") ||
      req.nextUrl.pathname.startsWith("/_next/") ||
      /\.[a-zA-Z0-9]+$/.test(req.nextUrl.pathname);

    if (allowedReviewPage) return NextResponse.next();

    const home = req.nextUrl.clone();
    home.pathname = "/";
    return NextResponse.redirect(home);
  }

  return clerkHandler(req, event);
}

export const config = { matcher: ["/","/create(.*)","/history(.*)","/favorites(.*)","/publish(.*)","/profiles(.*)","/media(.*)","/settings(.*)","/billing(.*)","/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)","/(api|trpc)(.*)","/__clerk/(.*)"] };
