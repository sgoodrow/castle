import { describe, expect, it } from "vitest";
import { requesterId, requesterLine } from "./bank-request-author";

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

  it("reads no one from other posts", () => {
    expect(requesterId({ description: "• Pearl (1)" })).toBeNull();
  });
});
