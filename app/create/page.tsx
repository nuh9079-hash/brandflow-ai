import { auth } from "@clerk/nextjs/server";
import BrandFlowDashboard from "../BrandFlowDashboard";

export default async function CreatePage() {
  await auth.protect();

  return <BrandFlowDashboard />;
}
