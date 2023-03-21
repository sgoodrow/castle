import { truncate } from "lodash";

export const code = "```";

const NEWLINES = /[\r\n]+/g;

export const compactDescription = (description: string) =>
  truncate(description.replace(NEWLINES, " "), {
    length: 100,
  });
