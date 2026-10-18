import { describe, it, expect } from "vitest";
import { remainingToday, validateFileMeta, validateDimensions } from "./plans";

describe("plan rules", () => {
  it("free plan allows 5 images per day", () => {
    expect(remainingToday("free", 0)).toBe(5);
    expect(remainingToday("free", 5)).toBe(0);
    expect(remainingToday("free", 7)).toBe(0);
  });
  it("pro plan is unlimited", () => {
    expect(remainingToday("pro", 1000)).toBeNull();
  });
  it("rejects files over 10 MB", () => {
    expect(validateFileMeta("image/png", 10 * 1024 * 1024 + 1)).not.toBeNull();
    expect(validateFileMeta("image/png", 10 * 1024 * 1024)).toBeNull();
  });
  it("only accepts JPG, PNG, WEBP", () => {
    expect(validateFileMeta("image/gif", 100)).not.toBeNull();
    expect(validateFileMeta("image/webp", 100)).toBeNull();
  });
  it("rejects images larger than 5000x5000", () => {
    expect(validateDimensions(5001, 100)).not.toBeNull();
    expect(validateDimensions(5000, 5000)).toBeNull();
  });
});
