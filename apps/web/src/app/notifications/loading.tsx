export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-5 py-12 sm:px-8 sm:py-16">
      <div className="h-2.5 w-24 rounded-full bg-line" />
      <div className="mt-5 h-9 w-52 rounded-xl bg-line/80" />
      <div className="mt-8 divide-y divide-line border-y border-line">
        {[0, 1, 2].map((row) => (
          <div key={row} className="space-y-2 py-5">
            <div className="h-4 w-20 rounded-full bg-line" />
            <div className="h-4 w-3/4 rounded-md bg-line/80" />
            <div className="h-3 w-24 rounded-md bg-line/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
