import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/media(.*)"]);
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
