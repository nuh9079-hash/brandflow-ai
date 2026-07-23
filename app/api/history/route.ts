import { auth } from "@clerk/nextjs/server";
import { deleteGeneratedContent, listGeneratedContents } from "@/lib/content-store";

export async function GET() {
  const { userId } = await auth.protect();
  const items = await listGeneratedContents(userId);

  return Response.json({ items });
}

export async function DELETE(req: Request) {
  const { userId } = await auth.protect();
  const body = await req.json();

  if (!body.id) {
    return Response.json({ error: "Content id is required." }, { status: 400 });
  }

  const result = await deleteGeneratedContent(userId, body.id);
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
