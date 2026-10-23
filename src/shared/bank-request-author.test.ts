import { describe, expect, it } from "vitest";
import { requestBody, requesterId, requesterLine } from "./bank-request-author";

describe("requesterId", () => {
  it("reads the member from the line a bank request opens with", () => {
    const description = `${requesterLine("123", "Alice")}\n\n• Pearl (1)`;
    expect(requesterId({ description })).toBe("123");
  });

  it("drops brackets from a name, so the link's text stays whole", () => {
    expect(requesterId({ description: requesterLine("123", "Al[ice]") })).toBe(
      "123"
    );
  });

  it("still reads posts titled with the member's profile link", () => {
    expect(
      requesterId({
        url: "https://discord.com/users/456",
        description: "• Pearl (1)",
      })
    ).toBe("456");
  });

  it("still reads posts that opened with a mention", () => {
    expect(
      requesterId({
        description: "<@789> has placed a bank request.\n\n• Pearl (1)",
      })
    ).toBe("789");
  });

  it("drops a trailing backslash too, so the closing bracket stays a bracket", () => {
    expect(requesterId({ description: requesterLine("123", "Al\\") })).toBe(
      "123"
    );
  });

  it("reads no one from other posts", () => {
    expect(requesterId({ description: "• Pearl (1)" })).toBeNull();
  });

  describe("requestBody", () => {
    it("leaves out the line naming the member", () => {
      const description = `${requesterLine("123", "Alice")}\n\n• Pearl (1)`;
      expect(requestBody(description)).toBe("• Pearl (1)");
    });

    it("leaves other requests as they are", () => {
      expect(requestBody("• Pearl (1)")).toBe("• Pearl (1)");
    });
  });
});
