import { describe, expect, it } from "vitest";

import { centsToDollarInput, dollarsToCents, parseOptionalNumber } from "./money";

describe("dollarsToCents", () => {
  it.each([
    ["450000", 45_000_000],
    ["450,000", 45_000_000],
    ["$1,250,000.50", 125_000_050],
    [" 685000 ", 68_500_000],
    ["0", 0],
  ])("parses %j as %i cents", (input, expected) => {
    expect(dollarsToCents(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "-5", "1.234", "1e5", "$"])("rejects %j", (input) => {
    expect(dollarsToCents(input)).toBeNull();
  });

  it("rejects prices above the shared cap", () => {
    expect(dollarsToCents("1000000001")).toBeNull();
  });
});

describe("centsToDollarInput", () => {
  it("drops trailing cents when they are zero", () => {
    expect(centsToDollarInput(45_000_000)).toBe("450000");
  });

  it("keeps real cents", () => {
    expect(centsToDollarInput(45_000_050)).toBe("450000.50");
  });

  it("renders nothing for a missing price", () => {
    expect(centsToDollarInput(null)).toBe("");
  });
});

describe("parseOptionalNumber", () => {
  it.each([
    ["2", 2],
    ["2.5", 2.5],
    ["1,200", 1200],
    [" 0 ", 0],
  ])("parses %j", (input, expected) => {
    expect(parseOptionalNumber(input)).toBe(expected);
  });

  it.each(["", "  ", "abc", "-1", "1.2.3"])("returns null for %j", (input) => {
    expect(parseOptionalNumber(input)).toBeNull();
  });
});
