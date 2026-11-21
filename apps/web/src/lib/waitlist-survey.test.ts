import { describe, expect, it } from "vitest";

import { createWaitlistSurveyToken, verifyWaitlistSurveyToken } from "./waitlist-survey";

const signupId = "9b03977f-949a-4af9-bf12-c32aefbb34b3";
const sessionId = "43eb8985-e946-4ea9-8390-77584b76b39e";

function tokenFor(audience: "survey-stage" | "survey-verify") {
  const token = createWaitlistSurveyToken({ signupId, sessionId, audience });
  expect(token).toBeTruthy();
  return token as string;
}

describe("waitlist survey tokens", () => {
  it("round-trips a stage token", () => {
    const reference = verifyWaitlistSurveyToken(tokenFor("survey-stage"));

    expect(reference).toEqual({ signupId, sessionId, audience: "survey-stage" });
  });

  it("keeps the verify audience distinct from the stage audience", () => {
    const reference = verifyWaitlistSurveyToken(tokenFor("survey-verify"));

    expect(reference?.audience).toBe("survey-verify");
    expect(reference?.audience).not.toBe("survey-stage");
  });

  it("rejects a token whose payload was edited", () => {
    const token = tokenFor("survey-stage");
    const splitAt = token.indexOf(".");
    const payload = token.slice(0, splitAt);
    const signature = token.slice(splitAt + 1);
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    const forged = Buffer.from(
      JSON.stringify({ ...claims, aud: "survey-verify" }),
    ).toString("base64url");

    expect(verifyWaitlistSurveyToken(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a token whose signature was edited", () => {
    const token = tokenFor("survey-stage");
    const payload = token.slice(0, token.indexOf("."));

    expect(verifyWaitlistSurveyToken(`${payload}.not-the-signature`)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyWaitlistSurveyToken("")).toBeNull();
    expect(verifyWaitlistSurveyToken("only-one-part")).toBeNull();
    expect(verifyWaitlistSurveyToken("a.b.c")).toBeNull();
  });

  it("refuses to sign a reference that is not a uuid", () => {
    expect(
      createWaitlistSurveyToken({ signupId: "signup", sessionId, audience: "survey-stage" }),
    ).toBeNull();
    expect(
      createWaitlistSurveyToken({ signupId, sessionId: "session", audience: "survey-stage" }),
    ).toBeNull();
  });
});
