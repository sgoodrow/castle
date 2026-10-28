const actions = vi.hoisted(() =>
  Array.from({ length: 9 }, () => vi.fn())
);

vi.mock("../features/gatehouse-tags/reaction", () => ({ tryGatehouseReactionAction: actions[0] }));
vi.mock("../features/auctions/auction-finished-reaction", () => ({ tryAuctionFinishedReactionAction: actions[1] }));
vi.mock("../features/bank-inventory/actions/bank-request-complete-reaction", () => ({ tryBankRequestComplete: actions[2] }));
vi.mock("../features/invite-list/invite-request-finished-reaction", () => ({ tryInviteRequestFinishedReactionAction: actions[3] }));
vi.mock("../features/raider-enlistment/raider-enlisted-reaction", () => ({ tryRaiderEnlistedReactionAction: actions[4] }));
vi.mock("../features/dkp-records/request-revision/approve-raid-report-revision-reaction", () => ({ tryApproveRaidReportRevisionReactionAction: actions[5] }));
vi.mock("../features/dkp-records/request-bonus/approve-raid-bonus-request-reaction", () => ({ tryApproveRaidBonusRequestReactionAction: actions[6] }));
vi.mock("../features/dkp-records/finish/finish-raid-report-reaction", () => ({ tryRaidReportFinishedReactionAction: actions[7] }));
vi.mock("../features/bank-request-info/bank-plan-reaction", () => ({ tryBankPlanReaction: actions[8] }));

import { messageReactionAddListener } from "./message-reaction-add-listener";

const reaction = { client: { user: { id: "bot" } } } as any;

describe("messageReactionAddListener", () => {
  beforeEach(() => actions.forEach((a) => a.mockReset()));

  it("runs every reaction action for a member's reaction", async () => {
    await messageReactionAddListener(reaction, { id: "member" } as any);
    actions.forEach((a) => expect(a).toHaveBeenCalledTimes(1));
  });

  it("ignores the bot's own reactions", async () => {
    await messageReactionAddListener(reaction, { id: "bot" } as any);
    actions.forEach((a) => expect(a).not.toHaveBeenCalled());
  });
});
