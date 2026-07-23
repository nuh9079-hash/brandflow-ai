import { auth } from "@clerk/nextjs/server";
import BrandFlowDashboard from "./BrandFlowDashboard";

export default async function Home() {
  await auth.protect();

  return <BrandFlowDashboard />;
}
