import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";

export default async function Home() {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  if (clerkEnabled) {
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  }

  return <LandingPage clerkEnabled={clerkEnabled} />;
}
