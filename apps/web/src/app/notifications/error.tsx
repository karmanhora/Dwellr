"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

export default function NotificationsError({ reset }: { reset: () => void }) {
  return (
    <Container size="narrow" className="py-16">
      <ErrorState
        title="Notifications didn't load"
        description="Something interrupted the request. Your notifications are still there."
        action={
          <Button type="button" variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </Container>
  );
}
