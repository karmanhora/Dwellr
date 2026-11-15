import { NextResponse } from "next/server";

import { getPropertyOptions } from "@/lib/posts";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  const results = await getPropertyOptions(query);
  return NextResponse.json({ results });
}
