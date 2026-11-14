import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { updatePropertyAction } from "@/app/p/[id]/actions";
import { PropertyForm } from "@/components/property/property-form";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedProperty } from "@/lib/properties";
import { propertyPhotoUrl } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Edit post",
  robots: { index: false, follow: false },
};

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/p/${id}/edit`);

  const result = await getOwnedProperty(id, user.id);
  if (result.status === "missing") notFound();

  if (result.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="This post didn't load"
          description="We couldn't read this property. Try again in a moment."
        />
      </Container>
    );
  }

  const property = result.property;

  return (
    <Container size="narrow" className="py-10 sm:py-14">
      <ButtonLink href={`/p/${property.id}`} variant="ghost" size="sm" className="-ml-3">
        Back to the post
      </ButtonLink>

      <h1 className="mt-4 text-headline font-medium tracking-[-0.03em] sm:text-display">
        Edit this home.
      </h1>
      <p className="mt-3 max-w-prose text-body leading-relaxed text-stone">
        Changing a fact resets it to community-added. dwellr never keeps a verification on a number
        you have edited.
      </p>

      <div className="mt-10">
        <PropertyForm
          mode="edit"
          userId={user.id}
          propertyId={property.id}
          action={updatePropertyAction}
          initial={{
            title: property.title,
            description: property.description,
            listingStatus: property.listingStatus,
            priceCents: property.priceCents,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            squareFeet: property.squareFeet,
            propertyType: property.propertyType,
            neighborhood: property.location.neighborhood,
            city: property.location.city,
            state: property.location.state,
            postalCode: property.location.postalCode,
            latitude: property.location.latitude,
            longitude: property.location.longitude,
          }}
          existingPhotos={property.photos.map((photo) => ({
            id: photo.id,
            url: propertyPhotoUrl(photo.storagePath),
            altText: photo.altText,
          }))}
        />
      </div>
    </Container>
  );
}
