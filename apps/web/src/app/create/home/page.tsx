import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createPropertyAction } from "@/app/create/actions";
import { PropertyForm } from "@/components/property/property-form";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "List a home",
  description: "Add a home to HausCrawl with photos and the details you know.",
  robots: { index: false, follow: false },
};

export default async function CreatePropertyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/create/home");

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <p className="text-eyebrow text-stone uppercase">List a home</p>
      <h1 className="mt-3 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Tell us about the home.
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Only add facts you know to be true. Everything you write is labelled as community-added
        until HausCrawl can verify it against a source.
      </p>

      <div className="mt-10">
        <PropertyForm mode="create" userId={user.id} action={createPropertyAction} />
      </div>
    </Container>
  );
}
