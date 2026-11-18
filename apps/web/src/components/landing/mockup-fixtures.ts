import type { CollectionEvaluation, PropertySummary } from "@hauscrawl/core";

export interface MockupHome {
  property: PropertySummary;
  evaluations: CollectionEvaluation[];
  photo: string;
  photoAlt: string;
}

export const MOCKUP_MEMBERS = [
  { id: "you", name: "You" },
  { id: "partner", name: "Partner" },
] as const;

function evaluation(
  propertyId: string,
  userId: string,
  rating: number,
  note: string | null = null,
): CollectionEvaluation {
  return {
    propertyId,
    userId,
    rating,
    note,
    pros: [],
    cons: [],
    updatedAt: "2026-11-16T10:00:00.000Z",
  };
}

export const MOCKUP_HOMES: MockupHome[] = [
  {
    photo: "/landing/maple-hollow.jpg",
    photoAlt: "Modern home surrounded by trees at dusk",
    property: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Maple Hollow",
      listingStatus: "for_sale",
      priceCents: null,
      currency: "USD",
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      propertyType: "house",
      neighborhood: "Ballard",
      city: "Seattle",
      state: "WA",
      createdAt: "2026-11-16T09:00:00.000Z",
      coverPhoto: null,
      photoCount: 0,
      verification: "user_submitted",
      priceCut: null,
    },
    evaluations: [
      evaluation("11111111-1111-4111-8111-111111111111", "you", 5, "The light was lovely."),
      evaluation(
        "11111111-1111-4111-8111-111111111111",
        "partner",
        5,
        "The light was lovely.",
      ),
    ],
  },
  {
    photo: "/landing/alder-bend.jpg",
    photoAlt: "Warmly lit craftsman home in the evening",
    property: {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Alder Bend",
      listingStatus: "for_sale",
      priceCents: null,
      currency: "USD",
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      propertyType: "townhouse",
      neighborhood: "Fremont",
      city: "Seattle",
      state: "WA",
      createdAt: "2026-11-16T09:05:00.000Z",
      coverPhoto: null,
      photoCount: 0,
      verification: "user_submitted",
      priceCut: null,
    },
    evaluations: [
      evaluation("22222222-2222-4222-8222-222222222222", "you", 4),
      evaluation(
        "22222222-2222-4222-8222-222222222222",
        "partner",
        2,
        "Loved the garden. The street felt busy.",
      ),
    ],
  },
];
