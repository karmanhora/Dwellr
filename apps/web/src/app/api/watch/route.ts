import { after, NextResponse } from "next/server";

import { posthogLogger, posthogLoggerProvider, SeverityNumber } from "../../../../instrumentation";
import { getWatchPage } from "@/lib/posts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  const page = await getWatchPage({ cursor });

  posthogLogger.emit({
    body: "watch feed page served",
    severityNumber: SeverityNumber.INFO,
    attributes: {
      event: "watch_feed_page_served",
      paginated: Boolean(cursor),
    },
  });
  after(() => posthogLoggerProvider.forceFlush().catch(() => undefined));

  return NextResponse.json(page, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
