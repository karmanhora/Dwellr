import { NextResponse } from "next/server";

import { getWatchPage } from "@/lib/posts";

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  const page = await getWatchPage({ cursor });
  return NextResponse.json(page, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
