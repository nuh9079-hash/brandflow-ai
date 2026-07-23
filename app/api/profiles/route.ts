import { auth } from "@clerk/nextjs/server";
import { createUserProfile, listUserProfiles } from "@/lib/profiles/server";
import { profileInputError, sanitizeProfileInput } from "@/lib/profiles/validation";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const { storage, profiles } = await listUserProfiles(userId);
  return Response.json({ storage, profiles });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const body = await req.json();
  const input = sanitizeProfileInput(body);
  const validationError = profileInputError(input);

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const { storage, profile } = await createUserProfile(userId, input);
  return Response.json({ storage, profile });
}
