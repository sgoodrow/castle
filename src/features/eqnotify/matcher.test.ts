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
    it("matches a tag that appears as a whole word", () => {
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

    describe("word-start (prefix) boundaries", () => {
      it("matches a short tag as a standalone word", () => {
        expect(matchesTags("CT CT POP POP", ["ct"])).toBe(true);
        expect(matchesTags("KT up now", ["kt"])).toBe(true);
      });

      it("does not match a short tag embedded mid-word", () => {
        // The reported false positive: "ct" inside ordinary words.
        expect(matchesTags("please make contact with the raid", ["ct"])).toBe(
          false
        );
        expect(matchesTags("protect the cleric", ["ct"])).toBe(false);
        expect(matchesTags("check the market board", ["kt"])).toBe(false);
      });

      it("matches tags at the start of a word (abbreviations/prefixes)", () => {
        // These are intentional: default tags rely on prefix matching.
        expect(matchesTags("Dozekar the Cursed pop", ["doze"])).toBe(true);
        expect(matchesTags("Cazic-Thule pop", ["cazic"])).toBe(true);
        expect(matchesTags("Dain Frostreaver IV", ["dain"])).toBe(true);
      });

      it("matches tags bounded by punctuation", () => {
        expect(matchesTags("@everyone VULAK, POP!", ["vulak"])).toBe(true);
        expect(matchesTags("VULAK`AERR is up", ["vulak"])).toBe(true);
      });

      it("matches tags that themselves contain punctuation", () => {
        expect(matchesTags("VULAK`AERR is up", ["vulak`aerr"])).toBe(true);
      });

      it("does not match when the tag only appears mid-word", () => {
        // Tradeoff of word-start matching: "quake" no longer hits "earthquake".
        expect(matchesTags("earthquake incoming", ["quake"])).toBe(false);
      });
    });
  });

  describe("normalizeTag", () => {
    it("trims and lowercases", () => {
      expect(normalizeTag("  VuLaK  ")).toBe("vulak");
    });
  });
});
