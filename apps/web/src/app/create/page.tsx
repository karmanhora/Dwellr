import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/container";
import { ArrowUpRightIcon, HomeIcon, ImageIcon, PlayIcon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create",
  robots: { index: false, follow: false },
};

const options = [
  {
    href: "/create/home",
    eyebrow: "List a home",
    title: "Add a property profile",
    description:
      "Share photos and the facts you know about a home. Every detail starts as Community until it is verified.",
    icon: <HomeIcon size={22} />,
  },
  {
    href: "/create/post",
    eyebrow: "Share a post",
    title: "Write or post photos",
    description:
      "A thought, a renovation, a room you love. Up to eight photos and an optional property or neighborhood tag.",
    icon: <ImageIcon size={22} />,
  },
  {
    href: "/create/video",
    eyebrow: "Share a video",
    title: "Post a short home video",
    description:
      "A 30-second walkthrough, before-and-after, or neighborhood tour for the vertical Watch feed.",
    icon: <PlayIcon size={22} />,
  },
];

export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/create");

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">Create</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Add something to HausCrawl.
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        List a home, share a post, or publish a short video. Community content is always labelled
        as community content — never as a verified property fact.
      </p>

      <ul className="mt-10 space-y-3">
        {options.map((option) => (
          <li key={option.href}>
            <Link
              href={option.href}
              className="group flex items-start gap-4 rounded-panel border border-line bg-paper p-5 transition hover:border-ink hover:bg-mist/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                {option.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-eyebrow text-stone uppercase">{option.eyebrow}</span>
                <span className="mt-1 block text-title font-medium">{option.title}</span>
                <span className="mt-1 block max-w-prose text-body-sm leading-relaxed text-stone">
                  {option.description}
                </span>
              </span>
              <ArrowUpRightIcon
                size={18}
                className="mt-1 shrink-0 text-stone transition group-hover:text-ink"
              />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-caption leading-relaxed text-stone">
        Upload responsibly: no house numbers, license plates, or other identifying details. Read
        the privacy note on the video form before publishing.
      </p>
    </Container>
  );
}
