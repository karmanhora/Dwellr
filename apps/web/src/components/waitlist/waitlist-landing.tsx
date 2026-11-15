import { HouseMark } from "@/components/brand/logo";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";
import { Container } from "@/components/ui/container";
import { CheckIcon, HomeIcon, MapPinIcon, StarIcon, UserIcon } from "@/components/ui/icons";
import { getVisibleWaitlistCount } from "@/lib/waitlist";

const promises = [
  "A feed built from accounts you follow, the neighborhoods and styles you choose, and community posts",
  "Private shared collections for your partner, family, or friends",
  "Neighborhood-level locations and clearly labelled details",
];

const socialFeatures = [
  {
    title: "Follow the people you trust",
    body: "The feed combines homes from accounts you follow, homes in the neighborhoods and styles you choose, and community posts. It is explicit, not inferred from clicks.",
  },
  {
    title: "Share what you notice",
    body: "Post photos, notes, or a short video about a home or neighborhood. Likes and threaded comments keep the conversation with the home.",
  },
  {
    title: "Keep the decision private",
    body: "Invite your partner, family, or friends into a private collection. Everyone can rate, add pros and cons, and see where opinions split.",
  },
  {
    title: "Know what you are looking at",
    body: "Property details are labelled verified or community-added. Posts and comments stay clearly separate from verified facts.",
  },
];

const steps = [
  {
    number: "01",
    title: "Save the homes you both like",
    body: "Keep the places you are considering in one private shortlist, with the details and notes that matter to you.",
  },
  {
    number: "02",
    title: "Rate them together",
    body: "Each person adds a rating and a note. Differences become a conversation instead of a guess.",
  },
  {
    number: "03",
    title: "Compare side by side",
    body: "Line up the shortlist and decide with the same information in front of everyone.",
  },
];

const reasons = [
  {
    icon: MapPinIcon,
    title: "Private by default",
    body: "dwellr works at the neighborhood level. We do not ask for a street address, and your shortlist is not public.",
  },
  {
    icon: CheckIcon,
    title: "Clear about what is verified",
    body: "Every detail is labelled as verified by dwellr or added by the community, so you know what you are relying on.",
  },
  {
    icon: UserIcon,
    title: "Built for the people deciding",
    body: "Partners, family, and friends can look at the same homes together, instead of passing screenshots back and forth.",
  },
];

const faqs = [
  {
    question: "What is dwellr?",
    answer:
      "dwellr is a social network for home hunting, not a real-estate listing portal. Follow people you trust, share posts about homes and neighborhoods, and keep a private collection for the people deciding with you. We are starting with early access in Seattle / King County.",
  },
  {
    question: "Is dwellr social media?",
    answer:
      "It has a social layer: profiles, follows, posts, likes, and threaded comments. The decision itself stays private. You can follow people and share what you are learning, or use dwellr only with the people in your collection.",
  },
  {
    question: "Is it free?",
    answer:
      "Joining the waitlist is free. We have not announced pricing for the product yet, and we will be clear about it before anyone is asked to pay.",
  },
  {
    question: "What happens to my email?",
    answer:
      "We use it to send early-access updates about dwellr. We do not sell or share it. You can unsubscribe from any email or ask us to delete your details.",
  },
  {
    question: "When does it launch?",
    answer:
      "We are building toward early access in the Seattle area. We do not have a firm public date yet; the waitlist is the first place we will share one.",
  },
  {
    question: "Is my address shared?",
    answer:
      "No. dwellr uses neighborhood-level locations. We do not ask for a street address, and there are no home addresses in the waitlist.",
  },
];

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-caption text-stone">{label}</span>
      <span className="flex items-center gap-0.5" role="img" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            size={13}
            filled={star <= value}
            className={star <= value ? "text-ink" : "text-line-strong"}
          />
        ))}
      </span>
    </div>
  );
}

function ExampleHome({
  name,
  neighborhood,
  facts,
  yourRating,
  partnerRating,
  note,
}: {
  name: string;
  neighborhood: string;
  facts: string;
  yourRating: number;
  partnerRating: number;
  note: string;
}) {
  return (
    <div className="border-t border-line pt-5 first:border-t-0 first:pt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-caption tracking-[0.16em] text-stone uppercase">{name}</p>
      <h3 className="mt-2 text-lg font-medium tracking-[-0.02em] text-ink">{neighborhood}</h3>
      <p className="mt-1 text-body-sm text-stone">{facts}</p>

      <div className="mt-5 space-y-2.5">
        <Rating label="You" value={yourRating} />
        <Rating label="Partner" value={partnerRating} />
      </div>

      <p className="mt-5 border-t border-line pt-4 text-body-sm leading-relaxed text-ink/80">
        “{note}”
      </p>
    </div>
  );
}

export async function WaitlistLanding() {
  const count = await getVisibleWaitlistCount();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <HouseMark className="pointer-events-none absolute -top-16 -right-20 h-[26rem] w-[26rem] text-ink/[0.035] sm:-right-10 lg:top-10 lg:right-[-4rem] lg:h-[34rem] lg:w-[34rem]" />

        <Container className="relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-20 lg:py-24">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] text-stone uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-ink/30" />
              A social network for home hunting · Seattle / King County
            </p>

            <h1 className="mt-7 text-[3rem] leading-[0.95] font-medium tracking-[-0.05em] text-ink sm:text-6xl lg:text-[5.25rem]">
              Find a home
              <br />
              together.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-stone sm:text-xl">
              dwellr is a social network for home hunting. Follow people whose taste you trust, save and react to the homes you are considering, and make the decision together in one private place.
            </p>

            <ul className="mt-9 space-y-3">
              {promises.map((promise) => (
                <li key={promise} className="flex items-start gap-3 text-body-sm text-ink/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
                    <CheckIcon size={13} />
                  </span>
                  {promise}
                </li>
              ))}
            </ul>

            {count !== null ? (
              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-body-sm text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" aria-hidden="true" />
                {count.toLocaleString("en-US")} people have joined the waitlist
              </p>
            ) : null}
          </div>

          <div id="join" className="scroll-mt-24 lg:pt-8">
            <WaitlistForm idPrefix="hero" eyebrow="Be first in line" trackPageView />
            <p className="mt-4 px-1 text-caption leading-relaxed text-stone">
              Early access is starting in the Seattle area. Join the list and we&apos;ll email you
              when it opens.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
                More than a shortlist
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-medium tracking-[-0.035em] text-ink sm:text-4xl">
                A social network for the home hunt.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone">
                Home search already happens in group chats, saved tabs, and screenshots. dwellr
                brings the useful social parts together: people you trust, homes worth discussing,
                and a private place to decide.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {socialFeatures.map((feature) => (
                <div key={feature.title} className="border-t border-line pt-5">
                  <h3 className="text-base font-medium text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-stone">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
                What we&apos;re building
              </p>
              <h2 className="mt-4 max-w-xl text-3xl leading-tight font-medium tracking-[-0.035em] text-ink sm:text-4xl">
                A calmer way to choose a home.
              </h2>
            </div>
            <p className="max-w-sm text-body-sm leading-relaxed text-stone sm:text-right">
              Not a listings portal. A social place to work through the homes you are actually
              considering.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <li key={step.number} className="border-t border-line pt-6">
                <span className="text-xs font-medium text-stone">{step.number}</span>
                <h3 className="mt-4 text-lg font-medium tracking-[-0.02em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-stone">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-b border-line bg-mist/60">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
                Why dwellr
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-medium tracking-[-0.035em] text-ink sm:text-4xl">
                Built for a decision you make together.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone">
                Home hunting is rarely a solo project. dwellr is designed around the people who
                will live with the choice.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              {reasons.map((reason) => {
                const Icon = reason.icon;
                return (
                  <div key={reason.title} className="flex gap-4 border-t border-line pt-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink">
                      <Icon size={17} />
                    </span>
                    <div>
                      <h3 className="text-base font-medium text-ink">{reason.title}</h3>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-stone">{reason.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
            <div>
              <p className="inline-flex rounded-full bg-mist px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-ink uppercase">
                Illustrative example
              </p>
              <h2 className="mt-5 text-3xl leading-tight font-medium tracking-[-0.035em] text-ink sm:text-4xl">
                The shortlist, with everyone&apos;s point of view.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-stone">
                A shared card like this keeps the homes, reactions, and notes in one place. It is
                an example of the interface, not a real listing.
              </p>
              <ul className="mt-6 space-y-2 text-body-sm text-stone">
                <li>Neighborhood-level location only</li>
                <li>No prices or addresses invented</li>
                <li>See where you agree and where you don&apos;t</li>
              </ul>
            </div>

            <div className="rounded-[1.8rem] border border-line bg-paper p-6 shadow-soft sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
                <div>
                  <p className="text-caption tracking-[0.16em] text-stone uppercase">
                    Example shortlist
                  </p>
                  <p className="mt-1 text-lg font-medium text-ink">Saturday, 2 homes</p>
                </div>
                <span className="rounded-full border border-line px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-stone uppercase">
                  Not a real listing
                </span>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-0">
                <ExampleHome
                  name="Home A"
                  neighborhood="Ballard"
                  facts="3 bed · 2 bath · Townhouse"
                  yourRating={4}
                  partnerRating={3}
                  note="Loved the light. The kitchen felt small."
                />
                <ExampleHome
                  name="Home B"
                  neighborhood="West Seattle"
                  facts="3 bed · 2 bath · House"
                  yourRating={3}
                  partnerRating={5}
                  note="The garden won us over. Longer commute for me."
                />
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-caption text-stone">
                <HomeIcon size={15} />
                Your notes and ratings stay with your private shortlist.
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container size="narrow" className="py-16 sm:py-20">
          <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">FAQ</p>
          <h2 className="mt-4 text-3xl leading-tight font-medium tracking-[-0.035em] text-ink sm:text-4xl">
            A few straight answers.
          </h2>

          <div className="mt-8 divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/15">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="text-lg font-normal text-stone transition group-open:rotate-45"
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

      <section className="bg-ink text-paper">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-paper/55 uppercase">
              Join the waitlist
            </p>
            <h2 className="mt-4 max-w-lg text-3xl leading-tight font-medium tracking-[-0.035em] sm:text-4xl">
              Start with a better shortlist.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-paper/65">
              We are opening early access in Seattle / King County first. Add your email and we
              will tell you when it is ready.
            </p>
          </div>

          <div id="join-bottom" className="scroll-mt-24">
            <WaitlistForm idPrefix="bottom" eyebrow="Early access" />
          </div>
        </Container>
      </section>
    </div>
  );
}
