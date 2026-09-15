import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
});

describe("encryptToken / decryptToken", () => {
  it("розшифровує те, що зашифрував; шифротекст не містить оригінал", async () => {
    const { decryptToken, encryptToken } = await import("@/lib/crypto");
    const token = "uXm-testToken123";
    const encrypted = encryptToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted)).toBe(token);
  });
  it("два шифрування дають різні рядки (випадковий IV)", async () => {
    const { encryptToken } = await import("@/lib/crypto");
    expect(encryptToken("x")).not.toBe(encryptToken("x"));
  });
});
