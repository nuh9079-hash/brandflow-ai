import { auth } from "@clerk/nextjs/server";
import CommandCenter from "./CommandCenter";

export default async function Home() {
  await auth.protect();
  return <CommandCenter />;
}
