import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchLoading() {
  return (
    <Container className="py-8">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-64" />
      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Skeleton className="mx-auto aspect-[9/16] w-full max-w-[22rem] rounded-panel" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </Container>
  );
}
