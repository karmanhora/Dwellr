import { CollectionMockup } from "@/components/landing/collection-mockup";
import { FeedExample } from "@/components/landing/feed-example";
import { HeroHomeCards } from "@/components/landing/hero-home-cards";
import { NeighborhoodStrip } from "@/components/landing/neighborhood-strip";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { Container } from "@/components/ui/container";
import { CheckIcon, HomeIcon, MapPinIcon, UserIcon } from "@/components/ui/icons";
import { getWaitlistCount } from "@/lib/waitlist";

const steps = [
  {
    number: "01",
    title: "Follow people you trust",
    body: "The feed brings together homes from the people you follow, the neighborhoods and styles you choose, and community posts.",
  },
  {
    number: "02",
    title: "Rate the homes together",
    body: "Everyone adds a rating and a note. The shortlist keeps both perspectives in view, so differences become a conversation.",
  },
  {
    number: "03",
    title: "Decide in one private place",
    body: "Your shared collection stays private to the people you invite. Everyone sees the same homes and the same notes.",
  },
];

const featureRows = [
  {
    icon: UserIcon,
    title: "Follow the people whose taste you trust",
    body: "The feed is shaped by the accounts and neighborhoods you choose, never by clicks you did not mean to share.",
  },
  {
    icon: HomeIcon,
    title: "Keep the details with the home",
    body: "Save a home, add a note, and come back to the conversation around it instead of another lost tab.",
  },
  {
    icon: MapPinIcon,
    title: "Know what you are looking at",
    body: "Details are marked verified or community-added. Posts stay separate from the facts that came from a source.",
  },
];

const privacyPoints = [
  {
    icon: MapPinIcon,
    title: "Neighborhood-level, not street-level",
    body: "HausCrawl works with general locations. We do not ask for a street address, and there are no home addresses in the waitlist.",
  },
  {
    icon: UserIcon,
    title: "Yours to control",
    body: "Your shortlist is private. Waitlist email is used for early-access updates, and every message includes an unsubscribe link.",
  },
  {
    icon: CheckIcon,
    title: "Minimal by design",
    body: "The form asks only for an email plus optional context. We hash IP addresses for abuse limits and use cookieless analytics.",
  },
];

const faqs = [
  {
    question: "What is HausCrawl?",
    answer:
      "HausCrawl is a social network for home hunting, not a real-estate listing portal. Follow people you trust, share posts about homes and neighborhoods, and keep a private collection for the people deciding with you. We are starting with early access in Seattle / King County.",
  },
  {
    question: "Is HausCrawl social media?",
    answer:
      "It has a social layer: profiles, follows, posts, likes, and threaded comments. The decision itself stays private. You can follow people and share what you are learning, or use HausCrawl only with the people in your collection.",
  },
  {
    question: "Is it free?",
    answer:
      "Joining the waitlist is free. We have not announced pricing for the product yet, and we will be clear about it before anyone is asked to pay.",
  },
  {
    question: "What happens to my email?",
    answer:
      "We use it to send early-access updates about HausCrawl. We do not sell or share it. You can unsubscribe from any email or ask us to delete your details.",
  },
  {
    question: "When does it launch?",
    answer:
      "We are building toward early access in the Seattle area. We do not have a firm public date yet; the waitlist is the first place we will share one.",
  },
  {
    question: "Is my address shared?",
    answer:
      "No. HausCrawl uses neighborhood-level locations. We do not ask for a street address, and there are no home addresses in the waitlist.",
  },
];

export async function WaitlistLanding() {
  const count = await getWaitlistCount();

  return (
    <div className="overflow-x-clip bg-mist">
      <section className="relative overflow-hidden">
        <Container className="relative grid gap-12 pt-10 pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center lg:gap-14 lg:pt-14 lg:pb-20">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] text-stone uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-ink/30" />
              A social network for home hunting
            </p>

            <h1 className="mt-5 font-serif text-[3.6rem] leading-[0.92] font-normal tracking-[-0.055em] text-ink sm:text-[5rem]">
              Find a home
              <br />
              <span className="text-moss italic">together.</span>
            </h1>

            <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-stone sm:text-lg">
              Follow people whose taste you trust, save and react to the homes you are considering,
              and make the decision together in one private place. Early access starts in Seattle.
            </p>

            {count !== null ? (
              <p className="mt-4 inline-flex items-center gap-2 text-caption leading-relaxed text-stone">
                <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
                {count.toLocaleString("en-US")} people have joined the waitlist
              </p>
            ) : null}

            <div id="join" className="mt-4 max-w-[35rem] scroll-mt-24">
              <WaitlistForm
                idPrefix="hero"
                surface="plain"
                layout="inline"
                buttonVariant="moss"
                trackPageView
              />
              <p className="mt-4 text-caption leading-relaxed text-stone">
                Early access is starting in the Seattle area.
              </p>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroHomeCards />
          </div>
        </Container>
      </section>

      <NeighborhoodStrip />

      <section className="bg-mist">
        <Container className="py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
              How it works
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              A calmer way to choose a home.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">
              Home hunting happens in group chats and saved tabs. HausCrawl brings the useful parts
              into one considered place.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-[1.5rem] border border-line/80 bg-cream p-6 sm:p-7"
              >
                <span className="font-serif text-4xl leading-none text-brass/90 italic">
                  {step.number}
                </span>
                <h3 className="mt-7 font-serif text-[1.65rem] leading-tight tracking-[-0.03em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-body-sm leading-relaxed text-stone">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-y border-line/70 bg-sand">
        <Container className="grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <FeedExample />

          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
              More than a shortlist
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              Home hunting, with the people who matter.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-stone">
              Keep the homes you are considering, the notes you leave, and the people deciding with
              you in the same place. It is a record of the search, not another feed to scroll past.
            </p>

            <div className="mt-9 divide-y divide-line border-y border-line">
              {featureRows.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex gap-4 py-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-cream text-moss">
                      <Icon size={17} />
                    </span>
                    <div>
                      <h3 className="text-body-sm font-medium text-ink">{feature.title}</h3>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-stone">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-moss text-cream">
        <Container className="py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.2em] text-cream/60 uppercase">
              Privacy by default
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.045em] text-cream sm:text-5xl">
              Private where it matters.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-cream/75">
              The waitlist should ask for very little. The product should make the private parts
              obvious. These are the commitments we are building around.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {privacyPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="border-t border-cream/20 pt-5">
                  <Icon size={19} className="text-cream/70" />
                  <h3 className="mt-4 font-serif text-xl leading-tight tracking-[-0.02em] text-cream">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-body-sm leading-relaxed text-cream/70">{point.body}</p>
                </div>
              );
            })}
          </div>

          <a
            href="/privacy"
            className="mt-10 inline-flex text-body-sm font-medium text-cream underline decoration-cream/35 underline-offset-4 transition hover:decoration-cream"
          >
            Read the privacy policy
          </a>
        </Container>
      </section>

      <section className="bg-mist">
        <Container className="grid gap-12 py-20 sm:py-28 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
              A shared shortlist
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
              Everyone&apos;s take, in one place.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone">
              A shared shortlist keeps the homes, ratings, and notes together. This is an example of
              the interface, not a real listing.
            </p>

            <ul className="mt-7 space-y-3 text-body-sm text-stone">
              {[
                "Neighborhood-level location only",
                "No prices or addresses invented",
                "See where you agree and where you don't",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon size={15} className="mt-0.5 shrink-0 text-moss" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <CollectionMockup />
        </Container>
      </section>

      <section className="border-t border-line/70 bg-cream">
        <Container size="narrow" className="py-20 sm:py-24">
          <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">FAQ</p>
          <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.045em] text-ink sm:text-5xl">
            A few straight answers.
          </h2>

          <div className="mt-9 divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-[15px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/15">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="text-xl font-normal text-stone transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl pr-8 text-body-sm leading-relaxed text-stone">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-ink text-cream">
        <Container className="grid gap-10 py-20 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-cream/55 uppercase">
              Join the waitlist
            </p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl leading-[1.02] tracking-[-0.045em] sm:text-5xl">
              Start with a better shortlist.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-cream/65">
              We are opening early access in Seattle / King County first. Add your email and we will
              tell you when it is ready.
            </p>
          </div>

          <div id="join-bottom" className="scroll-mt-24">
            <WaitlistForm
              idPrefix="bottom"
              eyebrow="Early access"
              surface="card"
              layout="stacked"
              buttonVariant="moss"
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
