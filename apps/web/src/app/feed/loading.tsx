export default function FeedLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-5 py-12 sm:px-8 sm:py-16">
      <div className="h-2.5 w-20 rounded-full bg-line" />
      <div className="mt-5 h-10 w-64 rounded-xl bg-line/80" />
      <div className="mt-4 h-4 w-full max-w-xl rounded-md bg-line/60" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-8 sm:grid-cols-2">
          {[0, 1, 2, 3].map((card) => (
            <div key={card}>
              <div className="aspect-[4/3] rounded-card bg-line/60" />
              <div className="mt-4 h-4 w-2/3 rounded-md bg-line" />
              <div className="mt-2 h-3 w-1/2 rounded-md bg-line/60" />
            </div>
          ))}
        </div>
        <div className="h-72 rounded-card bg-line/40" />
      </div>
    </div>
  );
}
