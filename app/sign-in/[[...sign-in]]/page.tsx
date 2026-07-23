import { SignIn } from "@clerk/nextjs";
import { appearance, AuthShell } from "../AuthShell";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn appearance={appearance} path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthShell>
  );
}
