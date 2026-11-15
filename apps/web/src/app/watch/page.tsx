import type { Metadata } from "next";

import { WatchFeed } from "@/components/posts/watch-feed";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";
import { getWritableCollections } from "@/lib/collections";
import { getWatchPage } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Watch homes",
  description:
    "Short home walkthroughs, renovations, and neighborhood tours from the dwellr community.",
};

export default async function WatchPage() {
  const user = await getCurrentUser();
  const [page, collections] = await Promise.all([
    getWatchPage(),
    user ? getWritableCollections(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="bg-mist/40">
      <Container className="py-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-eyebrow text-stone uppercase">Watch</p>
            <h1 className="mt-2 text-headline font-medium tracking-[-0.03em]">
              Homes in motion.
            </h1>
            <p className="mt-2 max-w-xl text-body-sm leading-relaxed text-stone">
              Community videos about real homes and neighborhoods. The ranking is simple and shown
              under each video: followed people, chosen neighborhoods, engagement, then recency.
            </p>
          </div>
        </div>

        <WatchFeed
          initialItems={page.items}
          initialCursor={page.nextCursor}
          failed={page.failed}
          viewerId={user?.id ?? null}
          collections={collections}
        />
      </Container>
    </div>
  );
}
