"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function UnsubscribeForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function unsubscribe() {
    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        setStatus("error");
        setMessage("That link is invalid or has expired. Email us and we will remove you manually.");
        return;
      }

      setStatus("success");
      setMessage("You're unsubscribed. You won't receive further waitlist emails at this address.");
    } catch {
      setStatus("error");
      setMessage("We couldn't update your preferences. Check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-xl border border-moss/25 bg-moss-soft px-4 py-3 text-body-sm text-ink"
      >
        {message}
      </p>
    );
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        loading={status === "submitting"}
        onClick={unsubscribe}
        className="w-full sm:w-auto"
      >
        {status === "submitting" ? "Updating…" : "Unsubscribe me"}
      </Button>

      {message ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
