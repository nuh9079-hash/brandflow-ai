import { auth } from "@clerk/nextjs/server";
import CommandCenter from "./CommandCenter";

export default async function Home() {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  if (clerkEnabled) await auth.protect();

  return <CommandCenter clerkEnabled={clerkEnabled} />;
}
