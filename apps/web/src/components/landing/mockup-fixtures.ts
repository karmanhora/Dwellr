import type { CollectionEvaluation, PropertySummary } from "@hauscrawl/core";

export type MockupIllustration = "gable" | "courtyard" | "tower";

export interface MockupHome {
  property: PropertySummary;
  evaluations: CollectionEvaluation[];
  illustration: MockupIllustration;
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
    illustration: "gable",
    property: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Maple Hollow",
      listingStatus: "for_sale",
      priceCents: null,
      currency: "USD",
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1480,
      propertyType: "house",
      neighborhood: "Maple Hollow",
      city: "Seattle",
      state: "WA",
      createdAt: "2026-11-16T09:00:00.000Z",
      coverPhoto: null,
      photoCount: 0,
      verification: "user_submitted",
      priceCut: null,
    },
    evaluations: [
      evaluation("11111111-1111-4111-8111-111111111111", "you", 4),
      evaluation("11111111-1111-4111-8111-111111111111", "partner", 5),
    ],
  },
  {
    illustration: "courtyard",
    property: {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Alder Bend",
      listingStatus: "for_sale",
      priceCents: null,
      currency: "USD",
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 960,
      propertyType: "townhouse",
      neighborhood: "Alder Bend",
      city: "Seattle",
      state: "WA",
      createdAt: "2026-11-16T09:05:00.000Z",
      coverPhoto: null,
      photoCount: 0,
      verification: "user_submitted",
      priceCut: null,
    },
    evaluations: [
      evaluation("22222222-2222-4222-8222-222222222222", "you", 5),
      evaluation(
        "22222222-2222-4222-8222-222222222222",
        "partner",
        2,
        "Loved the light. The street felt busy.",
      ),
    ],
  },
  {
    illustration: "tower",
    property: {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Northbank",
      listingStatus: "for_sale",
      priceCents: null,
      currency: "USD",
      bedrooms: 4,
      bathrooms: 2.5,
      squareFeet: 2050,
      propertyType: "house",
      neighborhood: "Northbank",
      city: "Seattle",
      state: "WA",
      createdAt: "2026-11-16T09:10:00.000Z",
      coverPhoto: null,
      photoCount: 0,
      verification: "user_submitted",
      priceCut: null,
    },
    evaluations: [
      evaluation("33333333-3333-4333-8333-333333333333", "you", 4),
      evaluation("33333333-3333-4333-8333-333333333333", "partner", 4),
    ],
  },
];
