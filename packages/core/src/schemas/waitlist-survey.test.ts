import { describe, expect, it } from "vitest";

import {
  toWaitlistSurveyAnswersPayload,
  waitlistSurveyBranch,
} from "../services/waitlist-survey";
import {
  waitlistSurveyAnswersSchema,
  waitlistSurveySubmissionSchema,
} from "./waitlist-survey";

describe("waitlistSurveyAnswersSchema", () => {
  it("requires the routing role", () => {
    expect(waitlistSurveyAnswersSchema.safeParse({}).success).toBe(false);
    expect(waitlistSurveyAnswersSchema.safeParse({ role: "landlord" }).success).toBe(false);
  });

  it("accepts a role-only answer so an abandoned survey still saves", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({ role: "just_browsing" });
    expect(result.success).toBe(true);
  });

  it("normalizes whitespace and drops empty answers", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({
      role: "actively_looking",
      region: "  Seattle  ",
      displayName: "   ",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.region).toBe("Seattle");
    expect(result.data.displayName).toBeUndefined();
    expect(result.data.notes).toBeUndefined();
  });

  it("accepts the agent branch fields", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({
      role: "agent_or_broker",
      displayName: "Alex Reed",
      brokerage: "Cascade Realty",
      workRegion: "King County",
      contactMethod: "text",
      phone: "(206) 555-0100",
      promoInterest: "maybe",
      notes: "I post two listing reels a month.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts the creator branch fields", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({
      role: "creator",
      creatorFocus: "listing_videos",
      creatorChannel: "@alexbuilds",
      promoInterest: "yes",
    });

    expect(result.success).toBe(true);
  });

  it("accepts the hunter branch fields", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({
      role: "planning_next_12_months",
      searchingWith: "partner",
      timeline: "next_6_12_months",
      useCase: "compare_neighborhoods",
      region: "Bellevue",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown enum values", () => {
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "actively_looking", timeline: "someday" })
        .success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "creator", creatorFocus: "podcasts" }).success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "agent_or_broker", contactMethod: "fax" })
        .success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "creator", promoInterest: "definitely" })
        .success,
    ).toBe(false);
  });

  it("rejects oversized fields and line breaks in single-line answers", () => {
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "creator", creatorChannel: "x".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "creator", notes: "x".repeat(501) }).success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "agent_or_broker", brokerage: "A\nB" }).success,
    ).toBe(false);
    expect(
      waitlistSurveyAnswersSchema.safeParse({ role: "actively_looking", region: "Seattle\nWA" })
        .success,
    ).toBe(false);
  });

  it("allows free text with line breaks only in the notes answer", () => {
    const result = waitlistSurveyAnswersSchema.safeParse({
      role: "creator",
      notes: "Line one\nLine two",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("Line one\nLine two");
  });
});

describe("waitlistSurveySubmissionSchema", () => {
  it("requires a survey reference", () => {
    expect(
      waitlistSurveySubmissionSchema.safeParse({ answers: { role: "just_browsing" } }).success,
    ).toBe(false);
  });

  it("accepts a reference with answers", () => {
    expect(
      waitlistSurveySubmissionSchema.safeParse({
        ref: "payload.signature",
        answers: { role: "just_browsing" },
      }).success,
    ).toBe(true);
  });

  it("rejects an oversized reference", () => {
    expect(
      waitlistSurveySubmissionSchema.safeParse({
        ref: "x".repeat(513),
        answers: { role: "just_browsing" },
      }).success,
    ).toBe(false);
  });
});

describe("toWaitlistSurveyAnswersPayload", () => {
  it("maps answers to the snake_case RPC payload with null for missing answers", () => {
    const payload = toWaitlistSurveyAnswersPayload({
      role: "agent_or_broker",
      brokerage: "Cascade Realty",
      contactMethod: "email",
    });

    expect(payload.role).toBe("agent_or_broker");
    expect(payload.brokerage).toBe("Cascade Realty");
    expect(payload.contact_method).toBe("email");
    expect(payload.searching_with).toBeNull();
    expect(payload.phone).toBeNull();
    expect(payload.notes).toBeNull();
  });
});

describe("waitlistSurveyBranch", () => {
  it("routes each role to its question set", () => {
    expect(waitlistSurveyBranch("agent_or_broker")).toBe("agent");
    expect(waitlistSurveyBranch("creator")).toBe("creator");
    expect(waitlistSurveyBranch("actively_looking")).toBe("hunter");
    expect(waitlistSurveyBranch("just_browsing")).toBe("hunter");
    expect(waitlistSurveyBranch("planning_next_12_months")).toBe("hunter");
  });
});
