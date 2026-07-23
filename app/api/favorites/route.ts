import { auth } from "@clerk/nextjs/server";
import { listGeneratedContents, setFavorite } from "@/lib/content-store";

export async function GET() {
  const { userId } = await auth.protect();
  const items = await listGeneratedContents(userId, { favoritesOnly: true });

  return Response.json({ items });
}

export async function POST(req: Request) {
  const { userId } = await auth.protect();
  const body = await req.json();

  if (!body.contentId) {
    return Response.json({ error: "Content id is required." }, { status: 400 });
  }

  const result = await setFavorite(userId, body.contentId, Boolean(body.favorite));
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
