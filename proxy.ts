import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/media(.*)",
  "/api/billing/webhook(.*)",
  "/api/stripe/webhook",
  "/api/connections/instagram/deauthorize",
  "/api/connections/instagram/data-deletion(.*)",
  "/api/connections/instagram/callback",
  "/api/cron/scheduled-publishes",
]);
const isProtectedRoute = createRouteMatcher([
  "/",
  "/create(.*)",
  "/history(.*)",
  "/favorites(.*)",
  "/publish(.*)",
  "/profiles(.*)",
  "/media(.*)",
  "/settings(.*)",
  "/billing(.*)",
  "/team(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req) && isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/",
    "/create(.*)",
    "/history(.*)",
    "/favorites(.*)",
    "/publish(.*)",
    "/profiles(.*)",
    "/media(.*)",
    "/settings(.*)",
    "/billing(.*)",
    "/team(.*)",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
