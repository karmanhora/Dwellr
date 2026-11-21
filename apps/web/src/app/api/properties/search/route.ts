import { after, NextResponse } from "next/server";

import { posthogLogger, posthogLoggerProvider, SeverityNumber } from "../../../../../instrumentation";
import { getPropertyOptions } from "@/lib/posts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  const results = await getPropertyOptions(query);

  posthogLogger.emit({
    body: "property search completed",
    severityNumber: SeverityNumber.INFO,
    attributes: {
      event: "property_search_completed",
      query_present: Boolean(query),
      result_count: results.length,
    },
  });
  after(() => posthogLoggerProvider.forceFlush().catch(() => undefined));

  return NextResponse.json({ results });
}
