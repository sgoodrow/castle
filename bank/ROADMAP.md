# Bank roadmap

The guild bank offers many services. To a member they're all the same thing: an item you can get for platinum or DKP. The bank page is one catalog of those items. It isn't a page per service. The rules behind each service only show up where a member needs them.

## What a member needs from every item

1. **Can I use it?** The same class and race filters apply to every item.
2. **What does it cost?** Platinum, DKP, or "goes to auction".
3. **Is it available?** In stock, or made to order.
4. **How do I get it?** Add it to the tab and send it. The site decides which channel each line goes to. The member never has to.
5. **Is there a catch?** The few rules that matter, such as auction terms or prerequisites, are kept short in the details pane or on the tab.

## Phases

| # | Service | What it adds | Status |
|---|---|---|---|
| 1 | Misc items | Stock on the mules, 80% of market, posted to #bank-requests | Done |
| 2 | Dropped spells | Spells in stock, priced by level (51–54, 55–60) | Done |
| 3 | Forbidden spells | A price of "Auction" instead of pp or DKP, and a tab total that allows for auction lines | Released |
| 4 | Plane of Sky | A second inventory, fixed prices, auctions, and "must have won X first" | Not started |
| 5 | Jewelry | Made-to-order items, a discount for materials you bring, posted to #jewelry-requests | Not started |
| — | Recharges, research spells, bounties, PP4DKP | Rarer, one-off services | Parked |

## Open questions

Each phase starts by answering its questions with the user and recording the answers here.

**Phase 3: Forbidden spells**
- What we know: the scrolls themselves are in the database as stock, from the mules' inventory uploads. Nothing in the database marks them as forbidden. The "Kunark/Velious Spells" Google Sheet has a Forbidden Spells tab listing them by class, and a Cost column on each class tab ("50p", "200p OR 1DKP", "DKP Auction only", with some prices reduced).
- **Decided:** the sheet's Forbidden Spells tab is the source of truth for which spells are forbidden. The database stays the source of truth for stock (the sheet's "All Items" tab is a copy of the same mule uploads).
- **Decided:** the sheet's Cost column overrides the page's level rules for spells. This fixes prices the page gets wrong today, e.g. Aegis (57) is 50p on the sheet, and Burnout IV (55) is auction-only. A banker's price in the database still wins over both.
- **Decided:** requests for forbidden spells go to #bank-requests like everything else. A banker starts the auction.
- **Decided:** a member doesn't buy a forbidden spell, they ask the bank to start a DKP auction for it. The page and the post say that, with no price, minimum bid or bidding rules.

UX (agreed):
- Catalog row: a gold "DKP auction" badge where the price goes. Sorted after priced items.
- Details pane, and lightly on the tab: one short line about the process, e.g. "A banker starts a DKP auction for it." Fuller instructions live elsewhere (Discord), not on the page.
- Tab: the line shows "DKP auction" instead of a price; the total counts auctions separately, e.g. "450pp + 1 DKP auction".
- Post: just the request. "• Spell: Bedlam (DKP auction)" and the same total. No process or instructions.
- Other spells use the sheet's cost as written, e.g. Aegis 50pp, and "200p OR 1DKP" is no longer lowered to the market price.
- Sorting by price puts DKP auctions above any platinum price.
- Built on: the sheet's public CSV export, cached on the server and refreshed about hourly; sheet names that match no item are logged. The page gets one price type with a case per kind (pp, pp or DKP, auction, free, ask a banker), so every screen must handle auctions.

**Later phases**
- Sky and jewelry data are in Google Sheets today. Read them as they are, or move them to something bankers manage from Discord?

## How work runs

- This file is the plan. Read it before planning bank work, and update it in the same PR that changes a phase's status or answers a question.
- One phase at a time: settle the open questions, agree the UX with the user, build, then test it live.
- Ship in small increments. Each PR targets `main` and leaves the page working, so it can be released on its own. Don't stack PRs on unreleased branches. A phase that isn't finished can still ship, as long as members only see what's ready.
- Merging to `main` deploys to production. Every merge needs the user's go-ahead.
