import Image from "next/image";

import { Avatar } from "@/components/ui/avatar";
import { CheckIcon, HomeIcon } from "@/components/ui/icons";

export function FeedExample() {
  return (
    <article className="rounded-[1.9rem] border border-line/80 bg-cream p-4 shadow-lift sm:p-5">
      <div className="flex items-center justify-end gap-3">
        <span className="flex items-center gap-1.5 text-caption text-stone">
          <HomeIcon size={14} />
          Private collection
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Avatar name="You" size="sm" />
        <div>
          <p className="text-body-sm font-medium text-ink">You</p>
          <p className="text-caption text-stone">Saved this one for Saturday.</p>
        </div>
      </div>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-mist">
        <Image
          src="/landing/feeding-home.jpg"
          alt="Bright living room opening onto a garden"
          fill
          sizes="(min-width: 1024px) 28rem, 90vw"
          className="object-cover"
        />
      </div>

      <p className="mt-4 font-serif text-xl leading-snug tracking-[-0.02em] text-ink">
        “Loved the light. The kitchen felt calm.”
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-caption text-stone">
        <CheckIcon size={14} className="text-moss" />
        Your notes and ratings stay with your private shortlist.
      </div>
    </article>
  );
}
