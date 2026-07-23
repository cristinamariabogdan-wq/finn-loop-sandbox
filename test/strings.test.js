import { describe, it, expect } from "vitest";
import { capitalize, slugify } from "../src/strings.js";

describe("capitalize", () => {
  it("capitalizes the first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });
  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });
  it("leaves the rest of the string untouched", () => {
    expect(capitalize("hELLO")).toBe("HELLO");
  });
});

describe("slugify", () => {
  it("lowercases and dashes spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips non-alphanumerics and trims dashes", () => {
    expect(slugify("  Café & Bar!! ")).toBe("caf-bar");
  });
});
