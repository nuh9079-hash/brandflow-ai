import { auth } from "@clerk/nextjs/server";
import { deleteUserProfile, getUserProfile, updateUserProfile } from "@/lib/profiles/server";
import { profileInputError, sanitizeProfileInput } from "@/lib/profiles/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const { id } = await context.params;
  const { storage, profile } = await getUserProfile(userId, id);

  if (storage === "supabase" && !profile) {
    return Response.json({ error: "Profil bulunamadı." }, { status: 404 });
  }

  return Response.json({ storage, profile });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();
  const input = sanitizeProfileInput(body);
  const validationError = profileInputError(input);

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const { storage, profile } = await updateUserProfile(userId, id, input);
  return Response.json({ storage, profile });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Profil için giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const { id } = await context.params;
  const { storage, ok } = await deleteUserProfile(userId, id);
  return Response.json({ storage, ok });
}
