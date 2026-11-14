export default function LoadingProfile() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse px-5 py-12 sm:px-8 sm:py-16">
      <div className="h-2.5 w-24 rounded-full bg-line" />
      <div className="mt-5 h-9 w-56 rounded-xl bg-line/80" />

      <div className="mt-8 rounded-[1.75rem] border border-line p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-line sm:h-20 sm:w-20" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded-md bg-line" />
            <div className="h-3 w-24 rounded-md bg-line/70" />
          </div>
        </div>
        <div className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
          <div className="h-10 w-32 rounded-md bg-line/70" />
          <div className="h-10 w-32 rounded-md bg-line/70" />
        </div>
      </div>
    </div>
  );
}
