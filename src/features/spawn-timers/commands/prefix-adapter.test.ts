import { buildTodAdapter } from "./prefix-adapter";

function fakeMessage(content: string): any {
  return { content, author: { id: "1", username: "tester" } };
}

describe("buildTodAdapter", () => {
  it("should extract a trailing #<n> as skip_count", () => {
    const adapter = buildTodAdapter(fakeMessage("!tod lodi 7/26 04:04:10#1"));
    expect(adapter.options.getString("mob")).toBe("lodi");
    expect(adapter.options.getString("time")).toBe("7/26 04:04:10");
    expect(adapter.options.getInteger("skip_count")).toBe(1);
  });

  it("should extract #<n> when separated by a space", () => {
    const adapter = buildTodAdapter(fakeMessage("!tod lodi 7/26 04:04:10 #2"));
    expect(adapter.options.getString("mob")).toBe("lodi");
    expect(adapter.options.getString("time")).toBe("7/26 04:04:10");
    expect(adapter.options.getInteger("skip_count")).toBe(2);
  });

  it("should extract #<n> from the negative-minutes shorthand", () => {
    const adapter = buildTodAdapter(fakeMessage("!tod lodi -20#1"));
    expect(adapter.options.getString("mob")).toBe("lodi");
    expect(adapter.options.getString("time")).toBe("-20");
    expect(adapter.options.getInteger("skip_count")).toBe(1);
  });

  it("should extract #<n> when no time is given", () => {
    const adapter = buildTodAdapter(fakeMessage("!tod lodi #1"));
    expect(adapter.options.getString("mob")).toBe("lodi");
    expect(adapter.options.getString("time")).toBe(null);
    expect(adapter.options.getInteger("skip_count")).toBe(1);
  });

  it("should default skip_count to null when no #<n> is present", () => {
    const adapter = buildTodAdapter(fakeMessage("!tod lodi 7/26 04:04:10"));
    expect(adapter.options.getString("mob")).toBe("lodi");
    expect(adapter.options.getString("time")).toBe("7/26 04:04:10");
    expect(adapter.options.getInteger("skip_count")).toBe(null);
  });
});
