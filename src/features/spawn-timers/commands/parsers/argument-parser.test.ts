import { parseArguments } from "./argument-parser";

describe("ArgumentParser", () => {
  it("should parse mob name with pipe-separated time", () => {
    expect(
      parseArguments("nortlav the scalekeeper|2022-06-01 00:23:11 -0400")
    ).toEqual(["nortlav the scalekeeper", "2022-06-01 00:23:11 -0400"]);
  });

  it("should parse mob name with comma-separated time", () => {
    expect(parseArguments("bob, 10 am")).toEqual(["bob", "10 am"]);
    expect(parseArguments("bob, may 13th")).toEqual(["bob", "may 13th"]);
  });

  it("should parse mob name with pipe-separated time (with space)", () => {
    expect(parseArguments("bob| may 13th")).toEqual(["bob", "may 13th"]);
  });

  it("should parse mob name alone", () => {
    expect(parseArguments("bloodgill marauder")).toEqual([
      "bloodgill marauder",
      null,
    ]);
  });

  it("should parse mob name with negative minutes", () => {
    expect(parseArguments("venril -20")).toEqual(["venril", "-20"]);
  });

  it("should parse mob name with relative time", () => {
    expect(parseArguments("venril 3 days ago")).toEqual([
      "venril",
      "3 days ago",
    ]);
  });

  it("should parse mob name with date", () => {
    expect(parseArguments("vessel June 1, 2022 4:09 AM")).toEqual([
      "vessel",
      "June 1, 2022 4:09 AM",
    ]);
  });

  it("should replace backticks with quotes in mob name", () => {
    expect(parseArguments("`mob`|10 am")).toEqual(["'mob'", "10 am"]);
  });
});
