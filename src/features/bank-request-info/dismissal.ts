import { truncate } from "lodash";
import { quote } from "../../shared/string-util";

// The DM a member gets when their bank requests are removed unfilled, quoting each one.
// A DM holds 2,000 characters.
const MAX_DM = 2000;

export const dismissal = (requests: string[], why = "", what = "bank request") =>
  truncate(
    `Your <Castle> ${what} has been dismissed${why}.

**Sorry we missed you!** Please post your ${what} again the next time you are available to have it fulfilled.

${requests.map(quote).join("\n\n")}`,
    { length: MAX_DM }
  );
