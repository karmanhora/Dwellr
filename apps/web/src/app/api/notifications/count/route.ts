import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const count = await getUnreadNotificationCount(user.id);
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
