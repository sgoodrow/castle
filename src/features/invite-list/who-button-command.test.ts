import { Invite } from "../../db/invite";
import { sortInvites } from "./update-action";

const invite = (date: number, interviewed: boolean, main?: string) => {
  const i = new Invite();
  i.name = `${date === 0 ? "old" : "new"}${
    interviewed ? "invite" : "interview"
  }${main ? main : "main"}`;
  i.createdAt = new Date(date);
  i.interviewed = interviewed;
  i.main = main;
  return i;
};

describe("sortInvites", () => {
  it("should prioritize mains over alts, invites over interviews, old over new", () => {
    const unsorted = [
      invite(0, true, "alt"),
      invite(1, true, "alt"),
      invite(0, false, "alt"), // should not happen
      invite(1, false, "alt"), // should not happen
      invite(0, false, undefined),
      invite(1, false, undefined),
      invite(1, true, undefined),
      invite(0, true, undefined),
    ];
    const sorted = unsorted.sort(sortInvites);
    expect(sorted.map((s) => s.name)).toEqual([
      "oldinvitemain",
      "newinvitemain",
      "oldinterviewmain",
      "newinterviewmain",
      "oldinvitealt",
      "newinvitealt",
      "oldinterviewalt",
      "newinterviewalt",
    ]);
  });
});
