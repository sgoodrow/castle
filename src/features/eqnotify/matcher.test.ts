import { isFiltered, matchesTags, normalizeTag } from "./matcher";

describe("eqnotify matcher", () => {
  describe("isFiltered", () => {
    it("filters buff batphones", () => {
      expect(isFiltered("@everyone Vindi BUFFS up")).toBe(true);
    });

    it("filters RTE batphones", () => {
      expect(isFiltered("Statue RTE bnp and park")).toBe(true);
    });

    it("is case insensitive", () => {
      expect(isFiltered("aary Buff")).toBe(true);
    });

    it("does not filter normal pop batphones", () => {
      expect(isFiltered("@everyone VULAK VULAK POP POP")).toBe(false);
    });
  });

  describe("matchesTags", () => {
    it("matches a tag that is a substring of the batphone", () => {
      expect(matchesTags("@everyone VULAK POP", ["vulak", "kt"])).toBe(true);
    });

    it("is case insensitive against the content", () => {
      expect(matchesTags("King Tormax is up", ["tormax"])).toBe(true);
    });

    it("does not match when no tag is present", () => {
      expect(matchesTags("Dain pop", ["vulak", "kt"])).toBe(false);
    });

    it("matches everything when the 'all' tag is present", () => {
      expect(matchesTags("anything at all", ["all"])).toBe(true);
    });

    it("does not match an empty tag list", () => {
      expect(matchesTags("Vulak pop", [])).toBe(false);
    });

    it("ignores empty-string tags", () => {
      expect(matchesTags("Vulak pop", [""])).toBe(false);
    });
  });

  describe("normalizeTag", () => {
    it("trims and lowercases", () => {
      expect(normalizeTag("  VuLaK  ")).toBe("vulak");
    });
  });
});
