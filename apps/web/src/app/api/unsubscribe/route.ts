import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hashUnsubscribeToken } from "@/lib/waitlist-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4_096) {
    return NextResponse.json(
      { ok: false, message: "That unsubscribe link is not valid." },
      { status: 400, headers: NO_STORE },
    );
  }

  let token: string;
  try {
    const body: unknown = JSON.parse(raw);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid body");
    }
    const value = (body as Record<string, unknown>).token;
    if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
      throw new Error("invalid token");
    }
    token = value;
  } catch {
    return NextResponse.json(
      { ok: false, message: "That unsubscribe link is not valid." },
      { status: 400, headers: NO_STORE },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("unsubscribe_waitlist", {
    p_token_hash: hashUnsubscribeToken(token),
  });

  if (error) {
    console.error("[waitlist] unsubscribe failed:", error.code ?? "unknown");
    return NextResponse.json(
      { ok: false, message: "We couldn't update your preferences. Try again." },
      { status: 500, headers: NO_STORE },
    );
  }

  // A valid token that no longer matches a row returns the same success shape;
  // this avoids turning the endpoint into a token oracle.
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
