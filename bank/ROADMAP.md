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
| 3 | Forbidden spells | A price of "Auction" instead of pp or DKP, and a tab total that allows for auction lines | Done |
| 4 | Plane of Sky | A second inventory, fixed prices, auctions, and "must have won X first" | Done |
| 5 | Jewelry | Made-to-order items, a discount for materials you bring, posted to #jewelry-requests | In progress |
| 6 | Research spells | Research spells and components, free, picked up at North Freeport Bank | Done |
| — | Recharges, bounties, PP4DKP | Rarer, one-off services | Parked |

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
- Built on: the sheet's public CSV export, cached on the server and refreshed about hourly; sheet problems, such as names that match no item, are logged and posted to the bank office, which also hears when a sheet can't be read or reads again. The page gets one price type with a case per kind (pp, pp or DKP, auction, free, ask a banker), so every screen must handle auctions.

**Requests**
- **Decided:** a request holds up to 9 different items, with any quantity of each. Discord posts at most 10 embeds a message: one for the summary and one per item. 9 item cards from the real bank use under half of Discord's 6,000-character limit. A tab saved before the limit keeps its first 9 items.
- **Decided:** each item card lists its spots by character, then by spot (pack 2 before pack 10), so a banker logs in to each character once per card.
- **Decided:** the post plans the fewest bank characters that fill every line, including a line that needs two characters for its quantity, and names them under the total ("2 logins: Mulea, Muleb"). The cards follow that plan: the planned characters' spots come first, and the cards are ordered by them, so a banker logs in to each character once for the whole request. Multiquest holders aren't logins and their cards come last. DKP auction lines aren't logins either, though they keep a card. The search stops after a fixed number of tries, so the route is the fewest only when the search finishes within that budget; in practice requests are small enough that it always does. Known gap: no test covers the cutoff path.
- **Decided:** a card still lists every spot, the planned characters' first, so a banker has somewhere else to look when an upload is out of date.
- **Decided:** the bot removes the requests it posted (from the page or /bank request) once they're 30 days old, checking hourly, and DMs the member each one it removed. Players' own posts in #bank-requests are left to the bankers.
- **Decided:** the #bank-requests message is four cards. Castle Bounties comes first, with its typed request. Castle Bank Inventory links to the site, with a field per category it sells (Miscellaneous, Dropped Spells, Plane of Sky, Research Spell Components) and no typed formats. A last "Spreadsheets Reference" field links each category's spreadsheet for rare cases, since Discord can't link field names. Castle Raiding Services has a field each for Reagents, Recharge, PP4DKP and OT Hammer Event Scheduling, each ending with the sentence to post. Bank Requests Instructions comes last: inventory from the site, the rest by the posted sentence, `/bank request` as a fallback. Prices are written in "p". Ringolo's pinned Sky message folds into the Plane of Sky field. The `/bankhour` command and its banking-hours paragraph are gone.
- **Decided:** `/bank request` answers the requester with an ephemeral reply linking their posted request and the bank site, so people who use the command learn about the site. It asks them to try the "Castle Bank webapp" next time, and suppresses link previews. Discord copy links the site by its short link, tinyurl.com/castle-guild-bank; `bankWebUrl` stays the sign-in base.

**Phase 4: Plane of Sky**
- What we know: the Sky mules (cgskya … cgskyhh, gmskyone … gmskyseven) are bank characters like the others; their names are the only mark. The Sky bankers' "Plane of Sky" sheet lists each island's quest items on its "Item Counts and announcements" tab, with notes such as "fd ring" or "dkp bid", and keeps a waitlist.
- **Decided:** read the sheet as it is. An item is a Sky item if the sheet lists it, or if only Sky mules hold it.
- **Decided:** the waitlist stays in the sheet. The site doesn't read or change it.
- **Decided:** requests go to #bank-requests like everything else, as "Sky: Item (Mule, count)".
- **Decided:** Sky items are 250pp, picked up at the East Freeport docks, once the member has won the DKP items the quest needs. A banker checks that; the site doesn't track who won what.
- **Decided:** items the sheet marks "dkp bid", and Efreeti weapons it doesn't list, go to DKP auction, explained as for forbidden spells: "A banker starts an auction at 1 DKP." A banker's price still wins.
- Found under a "Sky" button beside Spells and Other.
- **Decided:** the bankers' own bags hold the stock and aren't for sale, so the page doesn't list them, and there is no Bags filter. A Plane of Sky bag, such as a Backpack, is stock and is listed.
- **Decided:** the page doesn't repeat quest recipes. The wiki has them, so every item links to its wiki page (built from its name, so the link is there before the wiki cache has the page). The details don't link to the islands' quests; the item's wiki page is enough. The page shows only what the guild knows: stock, price, how the guild hands it out (bank, DKP bid or roll), and who holds an item for multiquesting.
- **Decided:** the page doesn't show what the bank is short of. That list stays in the sheet.
- **Decided:** the page shows the Multiquest holders, and an MQ is requested like any item. It posts to #bank-requests as "Sky MQ: Item (held by Holder)", and a banker tells the member how to set it up, since some holders are bots and some are players. The page doesn't say which; the sheet stays the only record.
- **Decided:** an item can be on more than one island (Ethereal Amethyst is on 6 and 7), so its islands are a list.
- **Decided:** a Sky sheet problem goes to the bank office, which also hears when the sheet can't be read and when it reads again.
- What we know: the sheet's "Multiquest" tab lists which character holds each item kept for multiquesting (character, item, class).

**Phase 6: Research spells**
- What we know: the research bankers' "Research Spells & Components" Google Sheet has a tab per class (Enchanter, Magician, Necromancer, Wizard). Each lists that class's research spells (levels 16–49) and the components they take: Runes for Wizards, Words for Necromancers, grimoire pages for Enchanters, and Words plus other items for Magicians. Its "All Items" tab is the inventory of the four research mules, Cgenc, Cgmage, Cgnecro and Cgwiz, the same uploads the database has. Cgstorageb and a few other mules hold more of the same Words and Runes.
- What we know: before this phase, 112 of the 116 Rune and Words items showed "ask a banker" and 4 showed 80% of their Green price. Research scrolls are below level 51, so the dropped-spell rules sent them to "ask a banker" too.
- **Decided:** an item is a research item if a class tab lists it, as a spell or a component, and one of the four research mules holds it. Having to be on a research mule keeps the Magician tab's everyday items, such as Dagger or Loaf of Bread, at their usual price. The sheet's names are matched loosely: "(Left)" and "(Right)" are dropped, "Pg. 64 (Faded)" is "A Faded … Page", and only letters and digits count, so "Ap'Sagor" matches "Ap`Sagor" and "Pg. 68" matches "Pg.68". Sheet names that match no item are logged and posted to the bank office, which also hears when a sheet can't be read or reads again.
- **Decided:** research items are 0pp. They stay under Other (or Spells, for the scrolls) and get no section of their own. A banker's price still wins.
- **Decided:** a research item is picked up at North Freeport Bank. The details pane says where, and so does it for Sky items (the East Freeport docks). The Discord request doesn't: the #bank-requests instructions already say where each kind of item is picked up. Request lines use the bot's existing formats: "Research spell: Necromancer, 49, Lich" (the member's class if it can scribe it) and "Research component: Words of Odus".
- **Decided:** no class or race filtering for components. Their item data says every class can use them, and the wiki pages the server caches don't say otherwise. The sheet's class tabs do say which class uses each one, if that's ever wanted.

**Phase 5: Jewelry**
- What we know: the jewelers' "Castle Jewelcrafting Table" Google Sheet (linked from the jewelry request card) has a price table of about 100 recipes: name, slot, stats, bar cost, gem cost, trivial, success rate, average cost, a 20% commission and the guild price. Jewelers set gem prices at its top, and the guild prices follow. A member who brings some or all of the materials pays only for the materials the guild provides, and owns the risk of a failed combine. Its "All Items" tab is the Cgjewelry mule's inventory, the same uploads the database has.
- **Decided:** read the sheet as it is. The database stays the source of truth for stock.
- **Decided:** jewelry is part of the one catalog, at the same URL with no new navigation. Jewelry items are searchable and requested like any other item, made to order, at the guild price, with the same details as any other item.
- **Decided:** jewelry lines post to #jewelry-requests, not #bank-requests, so jewelers watch a quieter channel. The site routes each line, so the member never picks a channel. Until that routing and the ✅/❌ handling for jewelers exist, jewelry must not reach main.
- What we know: most recipe names match two items, the jewelry and a copy made with unenchanted metal that gives nothing. The site matches a sheet name exactly to the one item of that name that gives something. On Oct 22, 2026, 93 of the 100 names matched. The game spells the "Wolf's Eye" names with the apostrophe, as the sheet does; the item database used to drop it, and the build now restores it. "Velium Rose Engagement Ring" is "Rose Velium Engagement Ring", and "Fire Emerald Velium Ring" matches two jewelry items. The site logs the names it can't match.
- In progress: the UX, iterated live. Jewelry needs its post routed to #jewelry-requests, and the ✅/❌ reactions accepted there, before members see it.

## How work runs

- This file is the plan. Read it before planning bank work, and update it in the same PR that changes a phase's status or answers a question.
- One phase at a time: settle the open questions, agree the UX with the user, build, then test it live.
- Ship in small increments. Each PR targets `main` and leaves the page working, so it can be released on its own. Don't stack PRs on unreleased branches. A phase that isn't finished can still ship, as long as members only see what's ready.
- Merging to `main` deploys to production. Every merge needs the user's go-ahead.
