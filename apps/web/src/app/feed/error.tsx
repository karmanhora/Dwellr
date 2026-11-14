"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";

export default function FeedError({ reset }: { reset: () => void }) {
  return (
    <Container className="py-16">
      <ErrorState
        title="Your feed didn't load"
        description="Something interrupted the request. Your preferences and follows are still saved."
        action={
          <Button type="button" variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </Container>
  );
}
