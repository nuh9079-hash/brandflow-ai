import { SignUp } from "@clerk/nextjs";
import { appearance, AuthShell } from "../../sign-in/AuthShell";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp appearance={appearance} path="/sign-up" routing="path" signInUrl="/sign-in" />
    </AuthShell>
  );
}
