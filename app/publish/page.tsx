import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { listGeneratedContents } from "@/lib/content-store";
import { listMedia } from "@/lib/media/server";
import { getSocialProviderStatuses } from "@/lib/social/providers";
import { PublishCenterClient } from "./PublishCenterClient";
import { getDraft, getLatestDraft } from "@/lib/drafts/server";

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { userId } = await auth.protect();
  const { draft: draftId } = await searchParams;
  const [items, providerStatuses, media, draft, latestDraft] = await Promise.all([
    listGeneratedContents(userId, { limit: 50 }),
    getSocialProviderStatuses(userId),
    listMedia(userId, { sort: "newest" }),
    draftId ? getDraft(userId, draftId) : Promise.resolve(null),
    draftId ? Promise.resolve(null) : getLatestDraft(userId),
  ]);

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
          <Navbar title="Paylaşım Merkezi">
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Üretilen içeriklerini platformlara göre hazırla, kopyala ve paket olarak indir. Gerçek hesap bağlantısı olmadan paylaşım yapılmaz.
            </p>
          </Navbar>
          <div className="pt-6">
            <PublishCenterClient
              initialItems={items}
              providerStatuses={providerStatuses}
              mediaAssets={media.ok ? media.data : []}
              initialDraft={draft?.ok ? draft.data : null}
              initialDraftError={draft && !draft.ok ? draft.error : ""}
              resumeDraft={latestDraft?.ok ? latestDraft.data : null}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
